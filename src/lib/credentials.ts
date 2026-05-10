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

export type CredentialRow = {
  roll_no: string;
  cnic: string;
  display_name: string | null;
  registered_at: string;
  last_seen_at: string;
};

/** All registered credentials, newest registration first. */
export async function listAllCredentials(limit = 500): Promise<CredentialRow[]> {
  await ensureSchema();
  return await sql<CredentialRow[]>`
    SELECT roll_no, cnic, display_name,
           registered_at::text AS registered_at,
           last_seen_at::text AS last_seen_at
    FROM student_credentials
    ORDER BY registered_at DESC
    LIMIT ${limit}
  `;
}

/** Update CNIC and/or display name for a registered student. */
export async function updateCredentials(
  roll: string,
  patch: { cnic?: string; display_name?: string },
): Promise<{ ok: boolean; error?: string }> {
  await ensureSchema();
  if (patch.cnic !== undefined) {
    // Make sure the new CNIC isn't already used by someone else.
    const conflict = await sql<{ roll_no: string }[]>`
      SELECT roll_no FROM student_credentials WHERE cnic = ${patch.cnic}
    `;
    if (conflict.length && conflict[0].roll_no !== roll) {
      return {
        ok: false,
        error: `CNIC ${patch.cnic} is already used by Roll ${conflict[0].roll_no}.`,
      };
    }
    await sql`UPDATE student_credentials SET cnic = ${patch.cnic} WHERE roll_no = ${roll}`;
  }
  if (patch.display_name !== undefined) {
    await sql`UPDATE student_credentials SET display_name = ${patch.display_name} WHERE roll_no = ${roll}`;
  }
  return { ok: true };
}

/** Delete a credential row, releasing the CNIC and roll for re-registration. */
export async function deleteCredentials(roll: string): Promise<void> {
  await ensureSchema();
  await sql`DELETE FROM student_credentials WHERE roll_no = ${roll}`;
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
