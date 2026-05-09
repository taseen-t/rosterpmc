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

export async function loginStudent(formData: FormData): Promise<{ error?: string }> {
  const roll = String(formData.get("roll") || "").trim();
  if (!/^\d{4,8}$/.test(roll))
    return { error: "Enter a valid roll number." };
  const students = await getStudentsWithOverrides();
  const me = students.find((s) => s.roll_no === roll);
  if (!me) {
    await logAccess({ roll_no: roll, action: "login_fail_unknown" });
    return { error: "Roll number not found in this year's batch." };
  }
  if (me.overall !== "Pass") {
    await logAccess({ roll_no: roll, actor: roll, action: "login_fail_not_pass" });
    return {
      error:
        "Sorry - only candidates marked as Passed in the Final Professional MBBS result can log in.",
    };
  }
  await logAccess({ roll_no: roll, actor: roll, action: "login_success" });
  await setStudentSession(roll);
  redirect("/select");
}

export async function logout(): Promise<void> {
  await clearStudentSession();
  redirect("/");
}

export async function linkRoll(roll: string): Promise<{ error?: string }> {
  const google = await getGoogleSession();
  if (!google) return { error: "Sign in with Google first." };
  const cleaned = roll.trim();
  if (!/^\d{4,8}$/.test(cleaned)) return { error: "Enter a valid roll number." };

  const students = await getStudentsWithOverrides();
  const me = students.find((s) => s.roll_no === cleaned);
  if (!me) {
    await logAccess({
      roll_no: cleaned,
      actor: google.email,
      action: "login_fail_unknown",
    });
    return { error: "Roll number not found in this year's batch." };
  }
  if (me.overall !== "Pass") {
    await logAccess({
      roll_no: cleaned,
      actor: google.email,
      action: "login_fail_not_pass",
    });
    return {
      error:
        "Sorry - only candidates marked as Passed in the Final Professional MBBS result can sign in.",
    };
  }

  const result = await linkRollToGoogle(google.email, cleaned);
  if (!result.ok) return { error: result.error ?? "Could not link." };

  await setStudentSession(cleaned);
  await logAccess({
    roll_no: cleaned,
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
