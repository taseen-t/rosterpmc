"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  setStudentSession,
  clearStudentSession,
  setAdminSession,
  clearAdminSession,
  isAdmin,
  checkAdminPassword,
  getStudentSession,
} from "@/lib/auth";
import { getStaticStudentByRoll, getStudentsWithOverrides } from "@/lib/data";
import { submitSelections } from "@/lib/selections";
import { sql, ensureSchema } from "@/lib/db";
import { logAccess } from "@/lib/access";
import {
  clearGoogleSession,
  getGoogleSession,
  linkRollToGoogle,
} from "@/lib/google";

export async function logout(): Promise<void> {
  await clearStudentSession();
  redirect("/");
}

export async function linkRoll(input: {
  roll: string;
  displayName: string;
  cnic: string;
}): Promise<{ error?: string }> {
  const google = await getGoogleSession();
  if (!google) {
    // Session evaporated between page render and form submit — bfcache,
    // session-secret change, cookie expired, etc. Send the user back to
    // /login to start fresh rather than showing a dead-end error.
    redirect("/login?err=session_expired");
  }

  const roll = input.roll.trim();
  const displayName = input.displayName.trim();
  const cnic = input.cnic.trim();

  if (!/^\d{4,8}$/.test(roll)) return { error: "Enter a valid roll number." };
  if (displayName.length < 2) return { error: "Please enter your name." };
  if (displayName.length > 80) return { error: "Name is too long (max 80 chars)." };
  // CNIC must be 13 digits, optionally with two dashes (5-7-1 layout).
  const cnicDigits = cnic.replace(/\D/g, "");
  if (!/^\d{13}$/.test(cnicDigits)) {
    return { error: "Enter a valid 13-digit CNIC." };
  }
  const cnicFormatted = `${cnicDigits.slice(0, 5)}-${cnicDigits.slice(5, 12)}-${cnicDigits.slice(12)}`;

  const students = await getStudentsWithOverrides();
  const me = students.find((s) => s.roll_no === roll);
  if (!me) {
    await logAccess({
      roll_no: roll,
      actor: google.email,
      action: "login_fail_unknown",
    });
    return { error: "Roll number not found in this year's batch." };
  }
  if (me.overall !== "Pass") {
    await logAccess({
      roll_no: roll,
      actor: google.email,
      action: "login_fail_not_pass",
    });
    return {
      error:
        "Sorry - only candidates marked as Passed in the Final Professional MBBS result can sign in.",
    };
  }

  const result = await linkRollToGoogle(google.email, roll, {
    displayName,
    cnic: cnicFormatted,
  });
  if (!result.ok) return { error: result.error ?? "Could not link." };

  await setStudentSession(roll);
  await logAccess({
    roll_no: roll,
    actor: google.email,
    action: "login_success",
  });
  redirect("/select");
}

export async function googleLogout(): Promise<void> {
  await clearGoogleSession();
  await clearStudentSession();
  redirect("/login");
}

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

export async function submit(picks: { rotation: number; department: string }[]): Promise<{ error?: string }> {
  const session = await getStudentSession();
  if (!session) return { error: "Please log in." };
  const result = await submitSelections({ roll: session.roll, picks });
  if (!result.ok) return { error: result.error };
  await logAccess({ roll_no: session.roll, actor: session.roll, action: "submit" });
  revalidatePath("/");
  revalidatePath("/select");
  return {};
}

// ---------- Admin actions ----------

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Forbidden");
}

export async function adminResetStudent(roll: string): Promise<{ error?: string }> {
  await requireAdmin();
  await ensureSchema();
  if (!getStaticStudentByRoll(roll)) return { error: "Unknown roll number." };
  await sql.begin(async (tx) => {
    await tx`DELETE FROM selections WHERE roll_no = ${roll}`;
    await tx`DELETE FROM submissions WHERE roll_no = ${roll}`;
    await tx`INSERT INTO audit_log (actor, action, detail) VALUES (${"admin"}, ${"reset"}, ${tx.json({ roll })})`;
  });
  revalidatePath("/");
  revalidatePath("/admin");
  return {};
}

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

export async function adminUpdateStudent(
  roll: string,
  patch: { name?: string; total?: number; overall?: "Pass" | "Fail"; rank?: number; hidden?: boolean },
): Promise<{ error?: string }> {
  await requireAdmin();
  await ensureSchema();
  if (!getStaticStudentByRoll(roll)) return { error: "Unknown roll number." };
  await sql`
    INSERT INTO student_overrides (roll_no, name, total, overall, rank, hidden)
    VALUES (
      ${roll},
      ${patch.name ?? null},
      ${patch.total ?? null},
      ${patch.overall ?? null},
      ${patch.rank ?? null},
      ${patch.hidden ?? false}
    )
    ON CONFLICT (roll_no) DO UPDATE SET
      name = COALESCE(EXCLUDED.name, student_overrides.name),
      total = COALESCE(EXCLUDED.total, student_overrides.total),
      overall = COALESCE(EXCLUDED.overall, student_overrides.overall),
      rank = COALESCE(EXCLUDED.rank, student_overrides.rank),
      hidden = EXCLUDED.hidden
  `;
  await sql`INSERT INTO audit_log (actor, action, detail) VALUES (${"admin"}, ${"student-edit"}, ${sql.json({ roll, patch })})`;
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

export async function adminClearCapacityOverride(name: string): Promise<{ error?: string }> {
  await requireAdmin();
  await ensureSchema();
  await sql`DELETE FROM dept_overrides WHERE name = ${name}`;
  revalidatePath("/");
  revalidatePath("/admin");
  return {};
}

// ---------- Manual student additions ----------

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

  // Reject if this roll already exists (in OCR data)
  if (getStaticStudentByRoll(roll)) {
    return { error: "That roll number is already in the OCR-imported list. Edit it via the table instead." };
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

/**
 * Change the roll number of an existing entry. Migrates every related row
 * (selections, submissions, google_links, support_requests, access_log,
 * skipped_students, student_overrides, student_additions) from the old
 * roll to the new one.
 *
 * For an OCR-imported student whose canonical roll lives in the static
 * JSON file, the old roll is hidden via student_overrides (it can't be
 * removed from the file at runtime) and a new manual entry is created
 * with the new roll, copying over the visible name / total / rank.
 */
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

  // Conflict check: new roll must not be already in use anywhere.
  const conflictManual = await sql<{ roll_no: string }[]>`
    SELECT roll_no FROM student_additions WHERE roll_no = ${newR}
  `;
  if (conflictManual.length || getStaticStudentByRoll(newR)) {
    return { error: `Roll ${newR} is already in use by another student.` };
  }

  if (!isManual && !ocrSrc) return { error: "Old roll number not found." };

  await sql.begin(async (tx) => {
    if (isManual) {
      // Just update the primary key in student_additions.
      await tx`
        UPDATE student_additions SET roll_no = ${newR} WHERE roll_no = ${oldR}
      `;
    } else if (ocrSrc) {
      // Fold the OCR record + any existing override into a manual entry at
      // the new roll, then hide the old.
      const ovRows = await tx<{
        name: string | null;
        total: number | null;
        rank: number | null;
      }[]>`SELECT name, total, rank FROM student_overrides WHERE roll_no = ${oldR}`;
      const ov = ovRows[0];
      const name = ov?.name ?? ocrSrc.name;
      const total = ov?.total ?? ocrSrc.total ?? null;
      // Drop the "Dr " prefix the data layer adds at read time so we don't
      // double-prefix when name is read back through getStudentsWithOverrides.
      const cleanName = name?.replace(/^dr\.?\s+/i, "") ?? "Unknown";
      await tx`
        INSERT INTO student_additions (roll_no, name, total, medicine_marks)
        VALUES (${newR}, ${cleanName}, ${total}, NULL)
      `;
      // Mark old roll as hidden so it disappears from the roster, and clear
      // its rank override so it doesn't accidentally still rank somewhere.
      await tx`
        INSERT INTO student_overrides (roll_no, hidden)
        VALUES (${oldR}, TRUE)
        ON CONFLICT (roll_no) DO UPDATE SET hidden = TRUE
      `;
    }

    // Migrate all foreign-key-ish references.
    await tx`UPDATE selections SET roll_no = ${newR} WHERE roll_no = ${oldR}`;
    await tx`UPDATE submissions SET roll_no = ${newR} WHERE roll_no = ${oldR}`;
    await tx`UPDATE google_links SET roll_no = ${newR} WHERE roll_no = ${oldR}`;
    await tx`UPDATE support_requests SET roll_no = ${newR} WHERE roll_no = ${oldR}`;
    await tx`UPDATE access_log SET roll_no = ${newR} WHERE roll_no = ${oldR}`;
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

/**
 * Hard-delete a student entry.
 *  - Manually-added students: removed from student_additions.
 *  - OCR-imported students: hidden flag set in student_overrides (the static
 *    JSON file can't be mutated at runtime, so hiding is the equivalent of
 *    deletion — they vanish from every list and metric).
 * Either way: their submission, selections, Google link, support requests
 * and access log entries are cleared so nothing about them remains.
 */
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
    await tx`DELETE FROM google_links WHERE roll_no = ${roll}`;
    await tx`DELETE FROM support_requests WHERE roll_no = ${roll}`;
    await tx`DELETE FROM access_log WHERE roll_no = ${roll}`;
    if (isManual) {
      await tx`DELETE FROM student_additions WHERE roll_no = ${roll}`;
      await tx`DELETE FROM student_overrides WHERE roll_no = ${roll}`;
    } else {
      // OCR student — flip hidden flag (or insert a hidden override).
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

// ---------- Skip / unskip ----------

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

// ---------- Support requests ----------

export async function submitSupportRequest(input: {
  roll_no?: string;
  contact?: string;
  category?: string;
  message: string;
}): Promise<{ error?: string }> {
  await ensureSchema();
  const message = input.message?.trim() ?? "";
  if (message.length < 5) return { error: "Please describe your issue (5 chars min)." };
  if (message.length > 2000) return { error: "Message too long (max 2000 chars)." };

  await sql`
    INSERT INTO support_requests (roll_no, contact, category, message)
    VALUES (
      ${input.roll_no?.trim() || null},
      ${input.contact?.trim() || null},
      ${input.category || null},
      ${message}
    )
  `;
  revalidatePath("/admin");
  return {};
}

export async function adminResolveSupport(id: number, resolved: boolean): Promise<{ error?: string }> {
  await requireAdmin();
  await ensureSchema();
  await sql`UPDATE support_requests SET resolved = ${resolved} WHERE id = ${id}`;
  revalidatePath("/admin");
  return {};
}

export async function adminDeleteSupport(id: number): Promise<{ error?: string }> {
  await requireAdmin();
  await ensureSchema();
  await sql`DELETE FROM support_requests WHERE id = ${id}`;
  revalidatePath("/admin");
  return {};
}
