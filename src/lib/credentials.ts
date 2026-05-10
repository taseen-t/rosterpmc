import { sql, ensureSchema } from "./db";

export { formatCnic, normalizeCnic } from "./cnic";

export type StudentCreds = {
  roll_no: string;
  cnic: string;
  display_name: string | null;
};

export async function findByCnic(cnic: string): Promise<StudentCreds | null> {
  await ensureSchema();
  const rows = await sql<StudentCreds[]>`
    SELECT roll_no, cnic, display_name
    FROM student_credentials
    WHERE cnic = ${cnic}
  `;
  return rows[0] ?? null;
}

export async function findByRoll(roll: string): Promise<StudentCreds | null> {
  await ensureSchema();
  const rows = await sql<StudentCreds[]>`
    SELECT roll_no, cnic, display_name
    FROM student_credentials
    WHERE roll_no = ${roll}
  `;
  return rows[0] ?? null;
}

export async function registerStudent(input: {
  roll: string;
  cnic: string;
  name: string;
}): Promise<{ ok: boolean; error?: string }> {
  await ensureSchema();
  // Conflict checks first to give the caller a clean message.
  const [byRoll, byCnic] = await Promise.all([
    findByRoll(input.roll),
    findByCnic(input.cnic),
  ]);
  if (byRoll) {
    return {
      ok: false,
      error:
        "That roll number is already registered. Sign in with the CNIC tied to it, or contact Support.",
    };
  }
  if (byCnic) {
    return {
      ok: false,
      error:
        "That CNIC is already registered to another roll number. Contact Support if this is wrong.",
    };
  }
  await sql`
    INSERT INTO student_credentials (roll_no, cnic, display_name)
    VALUES (${input.roll}, ${input.cnic}, ${input.name})
  `;
  return { ok: true };
}

export async function touchLastSeen(roll: string): Promise<void> {
  try {
    await sql`UPDATE student_credentials SET last_seen_at = NOW() WHERE roll_no = ${roll}`;
  } catch {
    // ignore
  }
}

/** Roll → display_name map for the data layer. */
export async function getDisplayNamesByRoll(): Promise<Map<string, string>> {
  await ensureSchema();
  const rows = await sql<{ roll_no: string; display_name: string | null }[]>`
    SELECT roll_no, display_name FROM student_credentials
    WHERE display_name IS NOT NULL AND display_name <> ''
  `;
  const m = new Map<string, string>();
  for (const r of rows) {
    if (r.display_name) m.set(r.roll_no, r.display_name);
  }
  return m;
}
