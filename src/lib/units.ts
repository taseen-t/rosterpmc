import type { Student, Department } from "./data";
import type { SelectionRow } from "./selections";
import { classify, type Category } from "./categories";

/** A single student in the unit breakdown — kept slim, only what we render. */
export type UnitStudent = {
  roll_no: string;
  name: string;
  rank: number | null;
  /** Full four-rotation lineup, indexed by rotation number 1..4. */
  rotations: Record<number, string>;
};

/** One unit (department) with its per-rotation roster of FINALIZED students. */
export type UnitBreakdownRow = {
  name: string;
  category: Category;
  capacity: number;
  /** Sum of finalized seats taken across all four rotations. */
  totalFinalized: number;
  /** R1..R4, in order, each carrying the finalized students placed in this
   *  unit for that rotation, sorted by merit rank. */
  byRotation: { rotation: number; students: UnitStudent[] }[];
};

/**
 * Pure derive: given the data the page already fetches, produce a per-unit
 * breakdown of which finalized students are placed where. "Finalized"
 * means the student appears in the submitted set — admin work-in-progress
 * is intentionally not surfaced here.
 *
 * Skipped students are excluded entirely (they're not on the roster
 * publicly). Students whose roll isn't in the active `students` array
 * are also dropped — that handles deletions cleanly without a join.
 */
export function buildUnitBreakdown(
  departments: Department[],
  students: Student[],
  selections: SelectionRow[],
  submittedSet: Set<string>,
): UnitBreakdownRow[] {
  // Index students by roll once.
  const studentByRoll = new Map<string, Student>();
  for (const s of students) studentByRoll.set(s.roll_no, s);

  // Build the per-roll full rotation lineup from the raw selection rows.
  // We need this for the inline "their other rotations" strip on each
  // student card.
  const rotationsByRoll = new Map<string, Record<number, string>>();
  for (const sel of selections) {
    if (!submittedSet.has(sel.roll_no)) continue;
    if (!studentByRoll.has(sel.roll_no)) continue;
    let row = rotationsByRoll.get(sel.roll_no);
    if (!row) {
      row = {};
      rotationsByRoll.set(sel.roll_no, row);
    }
    row[sel.rotation] = sel.department;
  }

  // Convenience: rank lookup for the merit-sort inside each unit cell.
  function rankOf(roll: string): number {
    const s = studentByRoll.get(roll);
    return s?.rank ?? Number.MAX_SAFE_INTEGER;
  }

  // Build the result one unit at a time.
  return departments.map((dept) => {
    const byRotation = [1, 2, 3, 4].map((rotation) => {
      // All finalized selections for this unit + rotation.
      const matching = selections.filter(
        (sel) =>
          sel.department === dept.name &&
          sel.rotation === rotation &&
          submittedSet.has(sel.roll_no) &&
          studentByRoll.has(sel.roll_no),
      );
      const studentRows: UnitStudent[] = matching.map((sel) => {
        const s = studentByRoll.get(sel.roll_no)!;
        return {
          roll_no: sel.roll_no,
          name: s.name,
          rank: s.rank,
          rotations: rotationsByRoll.get(sel.roll_no) ?? {},
        };
      });
      // Sort by merit rank ascending, ties by roll.
      studentRows.sort((a, b) => {
        const ra = rankOf(a.roll_no);
        const rb = rankOf(b.roll_no);
        if (ra !== rb) return ra - rb;
        return Number(a.roll_no) - Number(b.roll_no);
      });
      return { rotation, students: studentRows };
    });
    const totalFinalized = byRotation.reduce(
      (acc, r) => acc + r.students.length,
      0,
    );
    return {
      name: dept.name,
      category: classify(dept.name),
      capacity: dept.capacity,
      totalFinalized,
      byRotation,
    };
  });
}
