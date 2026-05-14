import studentsRaw from "../../data/students.json";
import departmentsRaw from "../../data/departments.json";
import { sql, ensureSchema } from "./db";

/**
 * Prefix "Dr. " to a name when displayed publicly. They're MBBS graduates,
 * so the title applies. Dedup-safe (won't double up if a record already
 * starts with "Dr" or "Dr.").
 */
export function withDr(name: string | null | undefined): string {
  if (!name) return "";
  const trimmed = name.trim();
  if (/^dr\.?\s/i.test(trimmed)) {
    // Already has "Dr" or "Dr." prefix — normalize to "Dr." form.
    return trimmed.replace(/^dr\.?\s+/i, "Dr. ");
  }
  return `Dr. ${trimmed}`;
}

export type Subject = {
  subject: string;
  marks: number;
  max: number;
  status: "Pass" | "Fail" | "Absent";
};

export type Student = {
  sr_no: number | null;
  roll_no: string;
  reg_no: string | null;
  name: string;
  subjects: Subject[];
  total: number | null;
  overall: "Pass" | "Fail";
  rank: number | null;
  /** True if admin manually added this student (not from OCR). */
  manual?: boolean;
  /** True if admin marked this student as skipped (won't block lower ranks). */
  skipped?: boolean;
};

export type Department = {
  name: string;
  capacity: number;
};

const students = studentsRaw as Student[];
const departments = departmentsRaw as Department[];

const studentByRoll = new Map(students.map((s) => [s.roll_no, s]));
const deptByName = new Map(departments.map((d) => [d.name, d.capacity]));

export function getStaticStudents(): Student[] {
  return students;
}

export function getStaticStudentByRoll(roll: string): Student | undefined {
  return studentByRoll.get(roll);
}

export function getStaticDepartments(): Department[] {
  return departments;
}

export function getStaticDepartmentByName(name: string): Department | undefined {
  const cap = deptByName.get(name);
  return cap == null ? undefined : { name, capacity: cap };
}

export async function getDepartmentsWithOverrides(): Promise<Department[]> {
  await ensureSchema();
  const overrides = await sql<{ name: string; capacity: number }[]>`
    SELECT name, capacity FROM dept_overrides
  `;
  const ovMap = new Map(overrides.map((o) => [o.name, o.capacity]));
  return departments.map((d) => ({
    name: d.name,
    capacity: ovMap.get(d.name) ?? d.capacity,
  }));
}

/**
 * Merge OCR'd students + admin additions, apply overrides, hide flagged
 * rows, and globally re-rank. Returns ALL eligible students with `rank`
 * set on those who passed overall.
 */
export async function getStudentsWithOverrides(): Promise<Student[]> {
  await ensureSchema();
  const [overrides, additions, skipped] = await Promise.all([
    sql<{
      roll_no: string;
      name: string | null;
      total: number | null;
      overall: "Pass" | "Fail" | null;
      rank: number | null;
      hidden: boolean;
    }[]>`SELECT roll_no, name, total, overall, rank, hidden FROM student_overrides`,
    sql<{
      roll_no: string;
      name: string;
      total: number | null;
      medicine_marks: number | null;
    }[]>`SELECT roll_no, name, total, medicine_marks FROM student_additions`,
    sql<{ roll_no: string }[]>`SELECT roll_no FROM skipped_students`,
  ]);

  const ovMap = new Map(overrides.map((o) => [o.roll_no, o]));
  const skipSet = new Set(skipped.map((s) => s.roll_no));

  // Apply overrides + filter hidden on OCR base
  const ocrApplied: Student[] = [];
  for (const s of students) {
    const ov = ovMap.get(s.roll_no);
    if (ov?.hidden) continue;
    if (!ov) {
      ocrApplied.push({ ...s });
    } else {
      ocrApplied.push({
        ...s,
        name: ov.name ?? s.name,
        total: ov.total ?? s.total,
        overall: (ov.overall ?? s.overall) as "Pass" | "Fail",
      });
    }
  }

  // Convert manual additions into Student records (treated as Pass)
  const manualAsStudents: Student[] = additions.map((a) => ({
    sr_no: null,
    roll_no: a.roll_no,
    reg_no: null,
    name: a.name,
    subjects: a.medicine_marks != null
      ? [
          {
            subject: "Medicine & Allied",
            marks: a.medicine_marks,
            max: 500,
            status: "Pass" as const,
          },
        ]
      : [],
    total: a.total,
    overall: "Pass" as const,
    rank: null,
    manual: true,
  }));

  const all = [...ocrApplied, ...manualAsStudents];

  // Re-rank passes: total desc, then medicine -> surgery -> obs -> paeds, then roll asc
  const rankKey = (s: Student) => {
    const subj = (n: string) =>
      s.subjects.find((x) => x.subject === n)?.marks ?? 0;
    return [
      -(s.total ?? 0),
      -subj("Medicine & Allied"),
      -subj("Surgery & Allied"),
      -subj("Obstetrics & Gynaecology"),
      -subj("Paediatric Medicine"),
      Number(s.roll_no) || 0,
    ];
  };

  const passes = all.filter((s) => s.overall === "Pass");
  passes.sort((a, b) => {
    const ka = rankKey(a);
    const kb = rankKey(b);
    for (let i = 0; i < ka.length; i++) {
      if (ka[i] !== kb[i]) return ka[i] - kb[i];
    }
    return 0;
  });
  const rankByRoll = new Map<string, number>();
  passes.forEach((s, i) => rankByRoll.set(s.roll_no, i + 1));

  // If there's an explicit rank override, use that and renumber the rest around it.
  // Simplest: only apply override rank if explicitly set; otherwise use computed.
  for (const s of all) {
    s.rank = rankByRoll.get(s.roll_no) ?? null;
    s.skipped = skipSet.has(s.roll_no);
    const ov = ovMap.get(s.roll_no);
    if (ov?.rank != null) {
      s.rank = ov.rank;
    }
    // Displayed name: admin override if set, otherwise the canonical
    // name from the xlsx / OCR data. Prefix "Dr." for Pass students.
    if (s.overall === "Pass") {
      s.name = withDr(s.name);
    }
  }

  return all;
}

export type SkippedRow = { roll_no: string; reason: string | null; skipped_at: string };

export async function getSkippedStudents(): Promise<SkippedRow[]> {
  await ensureSchema();
  return await sql<SkippedRow[]>`
    SELECT roll_no, reason, skipped_at::text AS skipped_at
    FROM skipped_students
    ORDER BY skipped_at DESC
  `;
}
