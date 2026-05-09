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

export async function loginStudent(formData: FormData): Promise<{ error?: string }> {
  const roll = String(formData.get("roll") || "").trim();
  if (!/^\d{6}$/.test(roll))
    return { error: "Enter a valid 6-digit roll number." };
  const students = await getStudentsWithOverrides();
  const me = students.find((s) => s.roll_no === roll);
  if (!me) return { error: "Roll number not found in this year's batch." };
  if (me.overall !== "Pass")
    return {
      error:
        "Sorry — only candidates marked as Passed in the Final Professional MBBS result can log in.",
    };
  await setStudentSession(roll);
  redirect("/select");
}

export async function logout(): Promise<void> {
  await clearStudentSession();
  redirect("/");
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
