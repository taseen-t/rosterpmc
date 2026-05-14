import { sql, ensureSchema } from "./db";
import { getDepartmentsWithOverrides } from "./data";

/** One row per (student, rotation, department). */
export type SelectionRow = {
  roll_no: string;
  rotation: number;
  department: string;
  created_at: string;
};

export async function getAllSelections(): Promise<SelectionRow[]> {
  await ensureSchema();
  return await sql<SelectionRow[]>`
    SELECT roll_no, rotation, department, created_at::text AS created_at
    FROM selections
    ORDER BY created_at ASC
  `;
}

export async function getSelectionsByRoll(roll: string): Promise<SelectionRow[]> {
  await ensureSchema();
  return await sql<SelectionRow[]>`
    SELECT roll_no, rotation, department, created_at::text AS created_at
    FROM selections
    WHERE roll_no = ${roll}
    ORDER BY rotation ASC
  `;
}

export async function getSubmittedSet(): Promise<Set<string>> {
  await ensureSchema();
  const rows = await sql<{ roll_no: string }[]>`SELECT roll_no FROM submissions`;
  return new Set(rows.map((r) => r.roll_no));
}

export async function isSubmitted(roll: string): Promise<boolean> {
  await ensureSchema();
  const rows = await sql<{ roll_no: string }[]>`
    SELECT roll_no FROM submissions WHERE roll_no = ${roll}
  `;
  return rows.length > 0;
}

/** Group selections by department × rotation → headcount. */
export async function getDepartmentLoad(): Promise<Map<string, Map<number, number>>> {
  await ensureSchema();
  const rows = await sql<{ department: string; rotation: number; count: number }[]>`
    SELECT department, rotation, COUNT(*)::int AS count
    FROM selections
    GROUP BY department, rotation
  `;
  const m = new Map<string, Map<number, number>>();
  for (const r of rows) {
    if (!m.has(r.department)) m.set(r.department, new Map());
    m.get(r.department)!.set(r.rotation, r.count);
  }
  return m;
}

export type SeatMatrixRow = {
  name: string;
  capacity: number;
  byRotation: { rotation: number; filled: number; available: number }[];
};

export async function getSeatMatrix(): Promise<SeatMatrixRow[]> {
  const [depts, load] = await Promise.all([
    getDepartmentsWithOverrides(),
    getDepartmentLoad(),
  ]);
  return depts.map((d) => {
    const counts = load.get(d.name) ?? new Map<number, number>();
    return {
      name: d.name,
      capacity: d.capacity,
      byRotation: [1, 2, 3, 4].map((r) => {
        const filled = counts.get(r) ?? 0;
        return { rotation: r, filled, available: Math.max(0, d.capacity - filled) };
      }),
    };
  });
}

/**
 * Admin sets the four rotation picks for a single student. Atomic: either
 * all four are written (replacing any existing picks) or nothing changes.
 *
 * - `picks` must cover rotations 1–4 with four distinct departments.
 * - Each (department, rotation) is checked against the LIVE seat count
 *   AFTER excluding this student's own existing picks, so re-saving the
 *   same picks doesn't false-trigger a "full" error.
 * - If the student was previously finalized, the lock persists. To edit a
 *   locked student, admin must unlock first.
 */
export async function adminWriteStudentPicks(args: {
  roll: string;
  picks: { rotation: number; department: string }[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureSchema();
  const { roll, picks } = args;

  if (picks.length !== 4) {
    return { ok: false, error: "Pick four rotations before saving." };
  }
  const rotations = new Set(picks.map((p) => p.rotation));
  if (rotations.size !== 4 || ![1, 2, 3, 4].every((r) => rotations.has(r))) {
    return { ok: false, error: "Picks must cover rotations 1, 2, 3, and 4." };
  }
  const depts = new Set(picks.map((p) => p.department));
  if (depts.size !== 4) {
    return { ok: false, error: "All four departments must be different." };
  }

  const validDepts = new Set((await getDepartmentsWithOverrides()).map((d) => d.name));
  for (const p of picks) {
    if (!validDepts.has(p.department)) {
      return { ok: false, error: `Unknown department: ${p.department}` };
    }
  }

  try {
    await sql.begin(async (tx) => {
      // Check the lock — locked students can't be edited from this path.
      const subRows = await tx<{ roll_no: string }[]>`
        SELECT roll_no FROM submissions WHERE roll_no = ${roll}
      `;
      if (subRows.length > 0) throw new Error("LOCKED");

      // Capacity check that ignores the student's own existing picks.
      for (const p of picks) {
        const dRows = await tx<{ capacity: number }[]>`
          SELECT capacity FROM dept_overrides WHERE name = ${p.department}
        `;
        const capacity =
          dRows.length > 0
            ? dRows[0].capacity
            : (await getDepartmentsWithOverrides()).find((d) => d.name === p.department)!.capacity;
        const cRows = await tx<{ count: number }[]>`
          SELECT COUNT(*)::int AS count FROM selections
          WHERE department = ${p.department}
            AND rotation = ${p.rotation}
            AND roll_no <> ${roll}
        `;
        const filled = cRows[0].count;
        if (filled >= capacity) {
          throw new Error(`FULL:${p.department}:${p.rotation}`);
        }
      }

      // Replace the four rows for this student in one transaction.
      await tx`DELETE FROM selections WHERE roll_no = ${roll}`;
      for (const p of picks) {
        await tx`
          INSERT INTO selections (roll_no, rotation, department)
          VALUES (${roll}, ${p.rotation}, ${p.department})
        `;
      }
      await tx`
        INSERT INTO audit_log (actor, action, detail)
        VALUES (${"admin"}, ${"set-picks"}, ${tx.json({ roll, picks })})
      `;
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "LOCKED") {
      return {
        ok: false,
        error: "This student is finalized. Unlock first to edit picks.",
      };
    }
    if (msg.startsWith("FULL:")) {
      const [, dept, rot] = msg.split(":");
      return {
        ok: false,
        error: `${dept} (Rotation ${rot}) is full. Pick a different department.`,
      };
    }
    return { ok: false, error: "Could not save picks. Try again." };
  }
}

/** Mark this student as finalized (locked). Picks must already be saved. */
export async function adminFinalize(roll: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureSchema();
  const picks = await sql<{ rotation: number }[]>`
    SELECT rotation FROM selections WHERE roll_no = ${roll}
  `;
  if (picks.length < 4) {
    return {
      ok: false,
      error: `Only ${picks.length} of 4 rotations are set. Pick all four before finalizing.`,
    };
  }
  await sql`
    INSERT INTO submissions (roll_no) VALUES (${roll})
    ON CONFLICT (roll_no) DO NOTHING
  `;
  await sql`
    INSERT INTO audit_log (actor, action, detail)
    VALUES (${"admin"}, ${"finalize"}, ${sql.json({ roll })})
  `;
  return { ok: true };
}

/** Unlock a finalized student. Draft picks remain — admin can edit them. */
export async function adminUnfinalize(roll: string): Promise<void> {
  await ensureSchema();
  await sql`DELETE FROM submissions WHERE roll_no = ${roll}`;
  await sql`
    INSERT INTO audit_log (actor, action, detail)
    VALUES (${"admin"}, ${"unfinalize"}, ${sql.json({ roll })})
  `;
}

/** Clear all picks for a student (and unlock if locked). */
export async function adminClearPicks(roll: string): Promise<void> {
  await ensureSchema();
  await sql.begin(async (tx) => {
    await tx`DELETE FROM selections WHERE roll_no = ${roll}`;
    await tx`DELETE FROM submissions WHERE roll_no = ${roll}`;
    await tx`
      INSERT INTO audit_log (actor, action, detail)
      VALUES (${"admin"}, ${"clear-picks"}, ${tx.json({ roll })})
    `;
  });
}
