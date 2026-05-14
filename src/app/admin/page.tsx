import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import {
  getStudentsWithOverrides,
  getDepartmentsWithOverrides,
  getStaticStudents,
  getStaticDepartments,
} from "@/lib/data";
import {
  getAllSelections,
  getSubmittedSet,
  getDepartmentLoad,
} from "@/lib/selections";
import { ensureSchema } from "@/lib/db";
import { CapacityEditor } from "./CapacityEditor";
import { StudentEditor } from "./StudentEditor";
import { AdminLogoutButton } from "./AdminLogoutButton";
import { AddStudentForm } from "./AddStudentForm";
import type { DepartmentLoad } from "./RotationEditor";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  await ensureSchema();
  const [students, departments, selections, submittedSet, load] = await Promise.all([
    getStudentsWithOverrides(),
    getDepartmentsWithOverrides(),
    getAllSelections(),
    getSubmittedSet(),
    getDepartmentLoad(),
  ]);

  const picksByRoll: Record<string, { rotation: number; department: string }[]> = {};
  for (const s of selections) {
    if (!picksByRoll[s.roll_no]) picksByRoll[s.roll_no] = [];
    picksByRoll[s.roll_no].push({ rotation: s.rotation, department: s.department });
  }

  const departmentLoad: DepartmentLoad[] = departments.map((d) => {
    const counts = load.get(d.name) ?? new Map<number, number>();
    return {
      name: d.name,
      capacity: d.capacity,
      filled: [1, 2, 3, 4].map((r) => counts.get(r) ?? 0),
    };
  });

  const passes = students.filter((s) => s.overall === "Pass").length;
  const fails = students.length - passes;
  const finalized = submittedSet.size;

  const staticStudents = getStaticStudents();
  const staticDepts = getStaticDepartments();
  const staticDeptMap = new Map(staticDepts.map((d) => [d.name, d.capacity]));
  const staticStudentMap = new Map(staticStudents.map((s) => [s.roll_no, s]));

  return (
    <div className="mx-auto max-w-[95vw] px-4 md:px-6 py-12 md:py-20 space-y-20">
      <header className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <p className="eyebrow-accent">Admin · Roster control</p>
          <h1 className="mt-4 font-display text-6xl md:text-8xl lg:text-9xl font-bold uppercase tracking-tighter leading-[0.85] text-[var(--foreground)]">
            Control
            <br />
            <span className="text-[var(--accent)]">Panel.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg md:text-xl text-[var(--muted-foreground)] leading-tight">
            Manage department capacities, edit student records, assign rotation
            picks, and finalize a student&apos;s schedule when their four
            placements are confirmed.
          </p>
        </div>
        <AdminLogoutButton />
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--border)] border-2 border-[var(--border)]">
        <Stat label="Students" value={students.length.toString()} />
        <Stat label="Pass" value={passes.toString()} />
        <Stat label="Fail" value={fails.toString()} />
        <Stat label="Finalized" value={finalized.toString()} />
      </section>

      <section className="border-2 border-[var(--border)] p-8 md:p-10 flex flex-wrap items-center gap-8">
        <div className="flex-1 min-w-0">
          <p className="eyebrow-accent">Export</p>
          <h3 className="mt-2 font-display text-3xl md:text-4xl font-bold uppercase tracking-tighter text-[var(--foreground)]">
            Download spreadsheet
          </h3>
          <p className="text-sm md:text-base text-[var(--muted-foreground)] mt-2 leading-tight">
            Every passed candidate with merit rank and four assigned rotations.
            Generated fresh on click.
          </p>
        </div>
        <a
          href="/api/export.xlsx"
          download
          className="inline-flex items-center gap-2 px-8 py-4 bg-[var(--accent)] text-[var(--accent-foreground)] uppercase tracking-tighter font-bold text-base md:text-lg hover:scale-105 active:scale-95 transition-transform"
        >
          Export .xlsx
        </a>
      </section>

      <section>
        <SectionHeader
          eyebrow="Departments"
          title="Capacity"
          subtitle="Each department holds this many House Officers per 3-month rotation. Click a number to edit."
        />
        <div className="mt-10 border-2 border-[var(--border)] overflow-hidden">
          <div className="scrollx">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--muted)] eyebrow">
                <tr>
                  <th className="text-left px-5 py-4 font-bold uppercase tracking-widest">Department</th>
                  <th className="text-center px-5 py-4 font-bold uppercase tracking-widest">Capacity</th>
                  <th className="text-center px-5 py-4 font-bold uppercase tracking-widest">Original</th>
                  <th className="px-5 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-[var(--border)]">
                {departments.map((d) => (
                  <CapacityEditor
                    key={d.name}
                    name={d.name}
                    capacity={d.capacity}
                    original={staticDeptMap.get(d.name) ?? d.capacity}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
          <SectionHeader
            eyebrow="Students & rotations"
            title="Roster"
            subtitle='Click "Set rotations" on a passing student to assign their four placements. Save a draft, then Finalize when confirmed.'
          />
          <AddStudentForm />
        </div>
        <StudentEditor
          students={students}
          submittedRolls={Array.from(submittedSet)}
          picksByRoll={picksByRoll}
          departments={departmentLoad}
          staticStudentMap={Object.fromEntries(
            Array.from(staticStudentMap.entries()).map(([k, v]) => [
              k,
              { name: v.name, total: v.total, overall: v.overall, rank: v.rank },
            ]),
          )}
        />
      </section>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <p className="eyebrow-accent">{eyebrow}</p>
      <h2 className="mt-3 font-display text-4xl md:text-6xl font-bold uppercase tracking-tighter leading-[0.9] text-[var(--foreground)]">
        {title}.
      </h2>
      <p className="text-sm md:text-base text-[var(--muted-foreground)] mt-3 max-w-2xl leading-tight">
        {subtitle}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--background)] px-6 py-8 md:py-10">
      <p className="eyebrow">{label}</p>
      <p className="mt-3 font-display text-4xl md:text-6xl font-bold uppercase tracking-tighter tabular-nums leading-[0.85] text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}
