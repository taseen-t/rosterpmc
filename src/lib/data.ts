import studentsRaw from "../../data/students.json";
import departmentsRaw from "../../data/departments.json";
import { sql, ensureSchema } from "./db";

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
};

export type Department = {
  name: string;
  capacity: number;
};

const students = studentsRaw as Student[];
const departments = departmentsRaw as Department[];

const studentByRoll = new Map(students.map((s) => [s.roll_no, s]));
const deptByName = new Map(departments.map((d) => [d.name, d]));

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
  return deptByName.get(name);
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

export async function getStudentsWithOverrides(): Promise<Student[]> {
  await ensureSchema();
  const overrides = await sql<
    { roll_no: string; name: string | null; total: number | null; overall: "Pass" | "Fail" | null; rank: number | null; hidden: boolean }[]
  >`
    SELECT roll_no, name, total, overall, rank, hidden FROM student_overrides
  `;
  const ovMap = new Map(overrides.map((o) => [o.roll_no, o]));
  return students
    .map((s) => {
      const ov = ovMap.get(s.roll_no);
      if (!ov) return s;
      if (ov.hidden) return null;
      return {
        ...s,
        name: ov.name ?? s.name,
        total: ov.total ?? s.total,
        overall: (ov.overall ?? s.overall) as "Pass" | "Fail",
        rank: ov.rank ?? s.rank,
      };
    })
    .filter((s): s is Student => s !== null);
}
