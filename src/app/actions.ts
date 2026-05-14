"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  setAdminSession,
  clearAdminSession,
  isAdmin,
  checkAdminPassword,
} from "@/lib/auth";
import { getStaticStudentByRoll } from "@/lib/data";
import {
  adminWriteStudentPicks,
  adminFinalize,
  adminUnfinalize,
  adminClearPicks,
} from "@/lib/selections";
import { sql, ensureSchema } from "@/lib/db";

// ─── Admin auth ────────────────────────────────────────────────────────────

export async function loginAdmin(formData: FormData): Promise<{ error?: string }> {
  const password = String(formData.get("password") || "");
  if (!checkAdminPassword(password)) return { error: "Incorrect password." };
  await setAdminSession();
  redirect("/admin");
}

export async function logoutAdmin(): Promise<void> {
  await clearAdminSession();
  redirect("/");
}

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Forbidden");
}

// ─── Capacity ──────────────────────────────────────────────────────────────

export async function adminUpdateCapacity(name: string, capacity: number): Promise<{ error?: string }> {
  await requireAdmin();
  await ensureSchema();
  if (!Number.isFinite(capacity) || capacity < 0) return { error: "Capacity must be ≥ 0" };
  await sql`
    INSERT INTO dept_overrides (name, capacity) VALUES (${name}, ${capacity})
    ON CONFLICT (name) DO UPDATE SET capacity = ${capacity}
  `;
  await sql`INSERT INTO audit_log (actor, action, detail) VALUES (${"admin"}, ${"capacity"}, ${sql.json({ name, capacity })})`;
  revalidatePath("/");
  revalidatePath("/admin");
  return {};
}

export async function adminClearCapacityOverride(name: string): Promise<{ error?: string }> {
  await requireAdmin();
  await ensureSchema();
  await sql`DELETE FROM dept_overrides WHERE name = ${name}`;
  revalidatePath("/");
  revalidatePath("/admin");
  return {};
}

// ─── Student records ───────────────────────────────────────────────────────

export async function adminUpdateStudent(
  roll: string,
  patch: {
    name?: string;
    total?: number;
    overall?: "Pass" | "Fail";
    /**
     * `number` = set rank override.
     * `null`   = clear the override (auto-rank by marks).
     * `undefined` = don't change.
     */
    rank?: number | null;
    hidden?: boolean;
  },
): Promise<{ error?: string }> {
  await requireAdmin();
  await ensureSchema();

  const isManual =
    (
      await sql<{ roll_no: string }[]>`
        SELECT roll_no FROM student_additions WHERE roll_no = ${roll}
      `
    ).length > 0;
  const isOcr = Boolean(getStaticStudentByRoll(roll));
  if (!isManual && !isOcr) return { error: "Unknown roll number." };

  const clearsRank =
    patch.rank === null ||
    ((patch.total !== undefined || patch.overall !== undefined) &&
      patch.rank === undefined);
  const rankToSet = typeof patch.rank === "number" ? patch.rank : null;

  if (isManual) {
    if (patch.name !== undefined) {
      await sql`UPDATE student_additions SET name = ${patch.name} WHERE roll_no = ${roll}`;
    }
    if (patch.total !== undefined) {
      await sql`UPDATE student_additions SET total = ${patch.total} WHERE roll_no = ${roll}`;
    }
    if (patch.rank !== undefined || patch.hidden !== undefined || clearsRank) {
      await sql`
        INSERT INTO student_overrides (roll_no, rank, hidden)
        VALUES (${roll}, ${rankToSet}, ${patch.hidden ?? false})
        ON CONFLICT (roll_no) DO UPDATE SET
          rank = ${
            clearsRank
              ? sql`NULL`
              : sql`COALESCE(EXCLUDED.rank, student_overrides.rank)`
          },
          hidden = EXCLUDED.hidden
      `;
    }
  } else {
    await sql`
      INSERT INTO student_overrides (roll_no, name, total, overall, rank, hidden)
      VALUES (
        ${roll},
        ${patch.name ?? null},
        ${patch.total ?? null},
        ${patch.overall ?? null},
        ${rankToSet},
        ${patch.hidden ?? false}
      )
      ON CONFLICT (roll_no) DO UPDATE SET
        name = COALESCE(EXCLUDED.name, student_overrides.name),
        total = COALESCE(EXCLUDED.total, student_overrides.total),
        overall = COALESCE(EXCLUDED.overall, student_overrides.overall),
        rank = ${
          clearsRank
            ? sql`NULL`
            : sql`COALESCE(EXCLUDED.rank, student_overrides.rank)`
        },
        hidden = EXCLUDED.hidden
    `;
  }
  await sql`INSERT INTO audit_log (actor, action, detail) VALUES (${"admin"}, ${"student-edit"}, ${sql.json({ roll, patch, isManual })})`;
  revalidatePath("/");
  revalidatePath("/admin");
  return {};
}

export async function adminClearStudentOverride(roll: string): Promise<{ error?: string }> {
  await requireAdmin();
  await ensureSchema();
  await sql`DELETE FROM student_overrides WHERE roll_no = ${roll}`;
  revalidatePath("/");
  revalidatePath("/admin");
  return {};
}

export async function adminAddStudent(input: {
  roll_no: string;
  name: string;
  total: number | null;
  medicine_marks: number | null;
}): Promise<{ error?: string }> {
  await requireAdmin();
  await ensureSchema();

  const roll = input.roll_no.trim();
  const name = input.name.trim();
  if (!/^\d{4,8}$/.test(roll)) return { error: "Roll number must be 4-8 digits." };
  if (name.length < 2) return { error: "Name is required." };
  if (input.total != null && (input.total < 0 || input.total > 1500))
    return { error: "Total marks must be between 0 and 1500." };
  if (input.medicine_marks != null && (input.medicine_marks < 0 || input.medicine_marks > 500))
    return { error: "Medicine marks must be between 0 and 500." };

  if (getStaticStudentByRoll(roll)) {
    const existing = await sql<{ hidden: boolean }[]>`
      SELECT hidden FROM student_overrides WHERE roll_no = ${roll}
    `;
    const isHidden = existing[0]?.hidden === true;
    if (!isHidden) {
      return {
        error:
          "That roll number is already in the OCR-imported list. Edit it via the table instead, or Delete it first to release the number.",
      };
    }
    await sql`DELETE FROM selections WHERE roll_no = ${roll}`;
    await sql`DELETE FROM submissions WHERE roll_no = ${roll}`;
  }

  try {
    await sql`
      INSERT INTO student_additions (roll_no, name, total, medicine_marks)
      VALUES (${roll}, ${name}, ${input.total}, ${input.medicine_marks})
    `;
    await sql`INSERT INTO audit_log (actor, action, detail) VALUES (${"admin"}, ${"add-student"}, ${sql.json(input)})`;
    revalidatePath("/");
    revalidatePath("/admin");
    return {};
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("duplicate") || msg.includes("unique"))
      return { error: "That roll number is already added." };
    return { error: "Failed to add student." };
  }
}

export async function adminRemoveAddedStudent(roll: string): Promise<{ error?: string }> {
  await requireAdmin();
  await ensureSchema();
  await sql`DELETE FROM student_additions WHERE roll_no = ${roll}`;
  await sql`DELETE FROM selections WHERE roll_no = ${roll}`;
  await sql`DELETE FROM submissions WHERE roll_no = ${roll}`;
  await sql`INSERT INTO audit_log (actor, action, detail) VALUES (${"admin"}, ${"remove-added-student"}, ${sql.json({ roll })})`;
  revalidatePath("/");
  revalidatePath("/admin");
  return {};
}

export async function adminChangeRoll(
  oldRoll: string,
  newRoll: string,
): Promise<{ error?: string }> {
  await requireAdmin();
  await ensureSchema();

  const oldR = oldRoll.trim();
  const newR = newRoll.trim();
  if (!/^\d{4,8}$/.test(newR)) return { error: "New roll must be 4-8 digits." };
  if (oldR === newR) return { error: "Old and new rolls are the same." };

  const isManual =
    (
      await sql<{ roll_no: string }[]>`
        SELECT roll_no FROM student_additions WHERE roll_no = ${oldR}
      `
    ).length > 0;
  const ocrSrc = getStaticStudentByRoll(oldR);

  const conflictManual = await sql<{ roll_no: string }[]>`
    SELECT roll_no FROM student_additions WHERE roll_no = ${newR}
  `;
  if (conflictManual.length || getStaticStudentByRoll(newR)) {
    return { error: `Roll ${newR} is already in use by another student.` };
  }
  if (!isManual && !ocrSrc) return { error: "Old roll number not found." };

  await sql.begin(async (tx) => {
    if (isManual) {
      await tx`UPDATE student_additions SET roll_no = ${newR} WHERE roll_no = ${oldR}`;
    } else if (ocrSrc) {
      const ovRows = await tx<{
        name: string | null;
        total: number | null;
        rank: number | null;
      }[]>`SELECT name, total, rank FROM student_overrides WHERE roll_no = ${oldR}`;
      const ov = ovRows[0];
      const name = ov?.name ?? ocrSrc.name;
      const total = ov?.total ?? ocrSrc.total ?? null;
      const cleanName = name?.replace(/^dr\.?\s+/i, "") ?? "Unknown";
      await tx`
        INSERT INTO student_additions (roll_no, name, total, medicine_marks)
        VALUES (${newR}, ${cleanName}, ${total}, NULL)
      `;
      await tx`
        INSERT INTO student_overrides (roll_no, hidden)
        VALUES (${oldR}, TRUE)
        ON CONFLICT (roll_no) DO UPDATE SET hidden = TRUE
      `;
    }

    await tx`UPDATE selections SET roll_no = ${newR} WHERE roll_no = ${oldR}`;
    await tx`UPDATE submissions SET roll_no = ${newR} WHERE roll_no = ${oldR}`;
    await tx`UPDATE skipped_students SET roll_no = ${newR} WHERE roll_no = ${oldR}`;

    await tx`
      INSERT INTO audit_log (actor, action, detail)
      VALUES (${"admin"}, ${"change-roll"}, ${tx.json({ oldRoll: oldR, newRoll: newR, kind: isManual ? "manual" : "ocr" })})
    `;
  });

  revalidatePath("/");
  revalidatePath("/admin");
  return {};
}

export async function adminDeleteEntry(roll: string): Promise<{ error?: string }> {
  await requireAdmin();
  await ensureSchema();
  const isManual =
    (
      await sql<{ roll_no: string }[]>`
        SELECT roll_no FROM student_additions WHERE roll_no = ${roll}
      `
    ).length > 0;
  const isOcr = Boolean(getStaticStudentByRoll(roll));
  if (!isManual && !isOcr) return { error: "Unknown roll number." };

  await sql.begin(async (tx) => {
    await tx`DELETE FROM selections WHERE roll_no = ${roll}`;
    await tx`DELETE FROM submissions WHERE roll_no = ${roll}`;
    if (isManual) {
      await tx`DELETE FROM student_additions WHERE roll_no = ${roll}`;
      await tx`DELETE FROM student_overrides WHERE roll_no = ${roll}`;
    } else {
      await tx`
        INSERT INTO student_overrides (roll_no, hidden)
        VALUES (${roll}, TRUE)
        ON CONFLICT (roll_no) DO UPDATE SET hidden = TRUE
      `;
    }
    await tx`
      INSERT INTO audit_log (actor, action, detail)
      VALUES (${"admin"}, ${"delete-entry"}, ${tx.json({ roll, kind: isManual ? "manual" : "ocr" })})
    `;
  });
  revalidatePath("/");
  revalidatePath("/admin");
  return {};
}

// ─── Skip / unskip ─────────────────────────────────────────────────────────

export async function adminSkipStudent(roll: string, reason: string): Promise<{ error?: string }> {
  await requireAdmin();
  await ensureSchema();
  await sql`
    INSERT INTO skipped_students (roll_no, reason) VALUES (${roll}, ${reason || null})
    ON CONFLICT (roll_no) DO UPDATE SET reason = ${reason || null}
  `;
  await sql`INSERT INTO audit_log (actor, action, detail) VALUES (${"admin"}, ${"skip"}, ${sql.json({ roll, reason })})`;
  revalidatePath("/");
  revalidatePath("/admin");
  return {};
}

export async function adminUnskipStudent(roll: string): Promise<{ error?: string }> {
  await requireAdmin();
  await ensureSchema();
  await sql`DELETE FROM skipped_students WHERE roll_no = ${roll}`;
  revalidatePath("/");
  revalidatePath("/admin");
  return {};
}

// ─── Rotation picks (admin-controlled) ─────────────────────────────────────

export async function adminSetStudentRotations(input: {
  roll: string;
  picks: { rotation: number; department: string }[];
}): Promise<{ error?: string }> {
  await requireAdmin();
  const r = await adminWriteStudentPicks(input);
  if (!r.ok) return { error: r.error };
  revalidatePath("/");
  revalidatePath("/admin");
  return {};
}

export async function adminFinalizeStudent(roll: string): Promise<{ error?: string }> {
  await requireAdmin();
  const r = await adminFinalize(roll);
  if (!r.ok) return { error: r.error };
  revalidatePath("/");
  revalidatePath("/admin");
  return {};
}

export async function adminUnlockStudent(roll: string): Promise<{ error?: string }> {
  await requireAdmin();
  await adminUnfinalize(roll);
  revalidatePath("/");
  revalidatePath("/admin");
  return {};
}

export async function adminResetStudent(roll: string): Promise<{ error?: string }> {
  await requireAdmin();
  await adminClearPicks(roll);
  revalidatePath("/");
  revalidatePath("/admin");
  return {};
}
