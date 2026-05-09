import { sql, ensureSchema } from "./db";
import {
  getDepartmentsWithOverrides,
  getStudentsWithOverrides,
  type Student,
} from "./data";

/**
 * Returns the highest-priority student (lowest rank number) who hasn't
 * submitted yet AND isn't admin-skipped, IF that student outranks `roll`.
 * Returns null when `roll` may proceed.
 */
export async function getRankBlocker(roll: string): Promise<Student | null> {
  await ensureSchema();
  const students = await getStudentsWithOverrides();
  const me = students.find((s) => s.roll_no === roll);
  if (!me || me.rank == null) return null;

  const submitted = await sql<{ roll_no: string }[]>`SELECT roll_no FROM submissions`;
  const submittedSet = new Set(submitted.map((s) => s.roll_no));

  const passes = students
    .filter((s) => s.overall === "Pass" && s.rank != null)
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));

  for (const s of passes) {
    if ((s.rank ?? 0) >= (me.rank ?? 0)) return null;
    if (s.skipped) continue;
    if (submittedSet.has(s.roll_no)) continue;
    return s;
  }
  return null;
}

export type SelectionRow = {
  roll_no: string;
  rotation: number;
  department: string;
  created_at: string;
};

export async function getAllSelections(): Promise<SelectionRow[]> {
  await ensureSchema();
  const rows = await sql<SelectionRow[]>`
    SELECT roll_no, rotation, department, created_at::text AS created_at
    FROM selections
    ORDER BY created_at ASC
  `;
  return rows;
}

export async function getSelectionsByRoll(roll: string): Promise<SelectionRow[]> {
  await ensureSchema();
  const rows = await sql<SelectionRow[]>`
    SELECT roll_no, rotation, department, created_at::text AS created_at
    FROM selections
    WHERE roll_no = ${roll}
    ORDER BY rotation ASC
  `;
  return rows;
}

export async function isSubmitted(roll: string): Promise<boolean> {
  await ensureSchema();
  const rows = await sql<{ roll_no: string }[]>`
    SELECT roll_no FROM submissions WHERE roll_no = ${roll}
  `;
  return rows.length > 0;
}

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

export type SubmitArgs = {
  roll: string;
  picks: { rotation: number; department: string }[];
};

export async function submitSelections(args: SubmitArgs): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureSchema();
  const { roll, picks } = args;

  if (picks.length !== 4) return { ok: false, error: "All 4 rotations must be picked." };
  const rotations = new Set(picks.map((p) => p.rotation));
  if (rotations.size !== 4 || ![1, 2, 3, 4].every((r) => rotations.has(r)))
    return { ok: false, error: "Picks must cover rotations 1, 2, 3, and 4." };
  const depts = new Set(picks.map((p) => p.department));
  if (depts.size !== 4) return { ok: false, error: "All 4 departments must be different." };

  const students = await getStudentsWithOverrides();
  const me = students.find((s) => s.roll_no === roll);
  if (!me) return { ok: false, error: "Roll number not recognized." };
  if (me.overall !== "Pass") return { ok: false, error: "Only candidates who passed are eligible." };
  if (me.rank == null) return { ok: false, error: "Your rank is not set. Contact Support." };

  // Rank-based locking: a lower-ranked student cannot submit until every
  // higher-ranked student has either submitted or been skipped by admin.
  const blocker = await getRankBlocker(roll);
  if (blocker) {
    return {
      ok: false,
      error: `Please wait - Rank #${blocker.rank} (${blocker.name}) hasn't selected their rotations yet. Higher merit picks first.`,
    };
  }

  const validDepts = new Set((await getDepartmentsWithOverrides()).map((d) => d.name));
  for (const p of picks) {
    if (!validDepts.has(p.department))
      return { ok: false, error: `Unknown department: ${p.department}` };
  }

  try {
    await sql.begin(async (tx) => {
      const subRows = await tx<{ roll_no: string }[]>`
        SELECT roll_no FROM submissions WHERE roll_no = ${roll}
      `;
      if (subRows.length > 0) throw new Error("LOCKED");

      for (const p of picks) {
        const dRows = await tx<{ capacity: number }[]>`
          SELECT capacity FROM dept_overrides WHERE name = ${p.department}
        `;
        const cRows = await tx<{ count: number }[]>`
          SELECT COUNT(*)::int AS count FROM selections
          WHERE department = ${p.department} AND rotation = ${p.rotation}
        `;
        const baseCapacity =
          dRows.length > 0
            ? dRows[0].capacity
            : (await getDepartmentsWithOverrides()).find((d) => d.name === p.department)!.capacity;
        const filled = cRows[0].count;
        if (filled >= baseCapacity) {
          throw new Error(`FULL:${p.department}:${p.rotation}`);
        }
      }

      for (const p of picks) {
        await tx`
          INSERT INTO selections (roll_no, rotation, department)
          VALUES (${roll}, ${p.rotation}, ${p.department})
        `;
      }
      await tx`
        INSERT INTO submissions (roll_no) VALUES (${roll})
      `;
      await tx`
        INSERT INTO audit_log (actor, action, detail)
        VALUES (${"student:" + roll}, ${"submit"}, ${tx.json({ picks })})
      `;
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "LOCKED") return { ok: false, error: "You have already submitted; selections are final." };
    if (msg.startsWith("FULL:")) {
      const [, dept, rot] = msg.split(":");
      return { ok: false, error: `${dept} (Rotation ${rot}) just got full. Please choose another.` };
    }
    return { ok: false, error: "Could not save selections. Try again." };
  }
}
