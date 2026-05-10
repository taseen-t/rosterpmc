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
  deleteCredentials,
  findByCnic,
  findByRoll,
  normalizeCnic,
  registerStudent,
  touchLastSeen,
  updateCredentials,
} from "@/lib/credentials";
import {
  ADMIN_RECIPIENT,
  markNotificationsRead,
  pushNotification,
} from "@/lib/notifications";

export async function logout(): Promise<void> {
  await clearStudentSession();
  redirect("/");
}

/**
 * First-time registration. Student types name + CNIC + roll. We bind the
 * CNIC to that roll permanently (CNIC will be the only thing they need to
 * type on subsequent logins).
 */
export async function studentSignUp(input: {
  name: string;
  cnic: string;
  roll: string;
}): Promise<{ error?: string }> {
  const name = input.name.trim();
  const roll = input.roll.trim();
  const cnic = normalizeCnic(input.cnic);

  if (name.length < 2) return { error: "Please enter your name." };
  if (name.length > 80) return { error: "Name is too long (max 80 chars)." };
  if (!cnic) return { error: "Enter a valid 13-digit CNIC." };
  if (!/^\d{4,8}$/.test(roll)) return { error: "Enter a valid roll number." };

  const students = await getStudentsWithOverrides();
  const me = students.find((s) => s.roll_no === roll);
  if (!me) {
    await logAccess({ roll_no: roll, action: "login_fail_unknown" });
    return { error: "Roll number not found in this year's batch." };
  }
  if (me.overall !== "Pass") {
    await logAccess({ roll_no: roll, action: "login_fail_not_pass" });
    return {
      error:
        "Sorry - only candidates marked as Passed in the Final Professional MBBS result can sign in.",
    };
  }

  const result = await registerStudent({ roll, cnic, name });
  if (!result.ok) return { error: result.error ?? "Could not register." };

  await setStudentSession(roll);
  await logAccess({ roll_no: roll, actor: roll, action: "login_success" });
  redirect("/select");
}

/**
 * Subsequent login: just CNIC. Looks up the registered roll and signs them in.
 */
export async function studentSignIn(input: {
  cnic: string;
}): Promise<{ error?: string }> {
  const cnic = normalizeCnic(input.cnic);
  if (!cnic) return { error: "Enter a valid 13-digit CNIC." };

  const creds = await findByCnic(cnic);
  if (!creds) {
    return {
      error:
        "We don't have a record for that CNIC. If this is your first time, register below.",
    };
  }

  // Sanity-check that the roll is still in the roster and Pass.
  const students = await getStudentsWithOverrides();
  const me = students.find((s) => s.roll_no === creds.roll_no);
  if (!me || me.overall !== "Pass") {
    await logAccess({
      roll_no: creds.roll_no,
      actor: creds.cnic,
      action: "login_fail_not_pass",
    });
    return {
      error:
        "Your account is no longer eligible. Contact Support if this is unexpected.",
    };
  }

  await touchLastSeen(creds.roll_no);
  await setStudentSession(creds.roll_no);
  await logAccess({
    roll_no: creds.roll_no,
    actor: creds.cnic,
    action: "login_success",
  });
  redirect("/select");
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
  patch: {
    name?: string;
    total?: number;
    overall?: "Pass" | "Fail";
    /**
     * `number` = set rank override to this value.
     * `null`   = explicitly clear the override (auto-rank by marks).
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

  // Rank override semantics:
  // - patch.rank === null     → user explicitly cleared rank field;
  //                              clear the override so auto-rank kicks in.
  // - patch.total / overall changed without an explicit rank → also clear
  //   the override (changing marks should always re-shuffle merit).
  // - patch.rank is a number  → set override to that number.
  // - patch.rank === undefined and total/overall unchanged → leave alone.
  const clearsRank =
    patch.rank === null ||
    ((patch.total !== undefined || patch.overall !== undefined) &&
      patch.rank === undefined);
  const rankToSet = typeof patch.rank === "number" ? patch.rank : null;

  if (isManual) {
    // Manual entries live in student_additions. Apply edits there directly,
    // because the data layer reads manual rows straight from that table.
    if (patch.name !== undefined) {
      await sql`UPDATE student_additions SET name = ${patch.name} WHERE roll_no = ${roll}`;
    }
    if (patch.total !== undefined) {
      await sql`UPDATE student_additions SET total = ${patch.total} WHERE roll_no = ${roll}`;
    }
    // Manual entries are always Pass — there's no Fail concept for them.
    // overall edits are ignored.
    // Rank override + hidden flag still live in student_overrides because
    // those don't fit into student_additions.
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

  // If this roll exists in the OCR data, only reject if it's not currently
  // hidden. A hidden OCR entry is the equivalent of "deleted" — admin
  // should be able to re-claim that roll number for someone new. We
  // *keep* the hidden=true override (so the original OCR record stays
  // suppressed) and insert the new entry into student_additions
  // alongside it. The data layer skips hidden OCR rows, so only the
  // manual addition will show up.
  if (getStaticStudentByRoll(roll)) {
    const existing = await sql<{ hidden: boolean }[]>`
      SELECT hidden FROM student_overrides WHERE roll_no = ${roll}
    `;
    const isHidden = existing[0]?.hidden === true;
    if (!isHidden) {
      return {
        error:
          "That roll number is already in the OCR-imported list. Edit it via the table instead, or Delete it first if you want to release the number.",
      };
    }
    // Clear stale links / picks left over from the previous owner so the
    // new entry gets a clean slate.
    await sql`DELETE FROM student_credentials WHERE roll_no = ${roll}`;
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

/**
 * Change the roll number of an existing entry. Migrates every related row
 * (selections, submissions, student_credentials, support_requests, access_log,
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
    await tx`UPDATE student_credentials SET roll_no = ${newR} WHERE roll_no = ${oldR}`;
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
    await tx`DELETE FROM student_credentials WHERE roll_no = ${roll}`;
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
  // Notify admin that a new ticket exists.
  await pushNotification({
    recipient: ADMIN_RECIPIENT,
    kind: "new_support_request",
    title: input.roll_no
      ? `New support ticket from Roll ${input.roll_no.trim()}`
      : "New support ticket",
    body:
      message.length > 140 ? message.slice(0, 140).trim() + "…" : message,
    link: "/admin#support-requests",
  });
  revalidatePath("/admin");
  return {};
}

export async function adminResolveSupport(id: number, resolved: boolean): Promise<{ error?: string }> {
  await requireAdmin();
  await ensureSchema();
  // Read the request first so we can notify the original sender by roll #.
  const rows = await sql<{ roll_no: string | null; message: string }[]>`
    SELECT roll_no, message FROM support_requests WHERE id = ${id}
  `;
  await sql`UPDATE support_requests SET resolved = ${resolved} WHERE id = ${id}`;
  const req = rows[0];
  if (req?.roll_no) {
    await pushNotification({
      recipient: req.roll_no,
      kind: resolved ? "support_resolved" : "support_reopened",
      title: resolved
        ? "Your support request was resolved"
        : "Your support request is open again",
      body:
        req.message.length > 120
          ? req.message.slice(0, 120).trim() + "…"
          : req.message,
      link: "/contact",
    });
  }
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

// ---------- Credentials (admin) ----------

export async function adminUpdateCredential(input: {
  roll_no: string;
  cnic?: string;
  display_name?: string;
}): Promise<{ error?: string }> {
  await requireAdmin();
  const roll = input.roll_no.trim();
  const patch: { cnic?: string; display_name?: string } = {};
  if (input.cnic !== undefined) {
    const cnic = normalizeCnic(input.cnic);
    if (!cnic) return { error: "Enter a valid 13-digit CNIC." };
    patch.cnic = cnic;
  }
  if (input.display_name !== undefined) {
    const name = input.display_name.trim();
    if (name.length < 1) return { error: "Display name can't be empty." };
    if (name.length > 80) return { error: "Display name too long (max 80)." };
    patch.display_name = name;
  }
  if (Object.keys(patch).length === 0) return {};
  const result = await updateCredentials(roll, patch);
  if (!result.ok) return { error: result.error ?? "Could not update." };
  await sql`INSERT INTO audit_log (actor, action, detail) VALUES (${"admin"}, ${"credential-update"}, ${sql.json({ roll, patch })})`;
  revalidatePath("/admin");
  revalidatePath("/");
  return {};
}

export async function adminDeleteCredential(roll: string): Promise<{ error?: string }> {
  await requireAdmin();
  await deleteCredentials(roll.trim());
  await sql`INSERT INTO audit_log (actor, action, detail) VALUES (${"admin"}, ${"credential-delete"}, ${sql.json({ roll })})`;
  revalidatePath("/admin");
  return {};
}

// ---------- Notifications ----------

export async function markMyNotificationsRead(ids?: number[]): Promise<{ error?: string }> {
  // Caller can be either a student OR an admin; route to the right
  // recipient bucket so admins don't accidentally mark a student's
  // notifications and vice versa.
  if (await isAdmin()) {
    await markNotificationsRead(ADMIN_RECIPIENT, ids);
    revalidatePath("/admin");
    return {};
  }
  const session = await getStudentSession();
  if (!session) return { error: "Not signed in." };
  await markNotificationsRead(session.roll, ids);
  revalidatePath("/select");
  revalidatePath("/contact");
  return {};
}
