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
    <div className="mx-auto max-w-6xl px-6 md:px-8 py-12 md:py-16 space-y-16">
      <header className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <p className="eyebrow-accent">Admin · Roster control</p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl font-semibold text-[var(--foreground)] tracking-tight">
            Control panel
          </h1>
          <p className="mt-3 max-w-2xl text-[var(--muted-foreground)] leading-relaxed">
            Manage department capacities, edit student records, assign rotation
            picks, and finalize a student&apos;s schedule when their four placements
            are confirmed.
          </p>
        </div>
        <AdminLogoutButton />
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[var(--border)] border border-[var(--border)] rounded-lg overflow-hidden">
        <Stat label="Students" value={students.length.toString()} />
        <Stat label="Pass" value={passes.toString()} />
        <Stat label="Fail" value={fails.toString()} />
        <Stat label="Finalized" value={`${finalized}`} />
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 flex flex-wrap items-center gap-6">
        <div className="flex-1 min-w-0">
          <p className="eyebrow-accent">Export</p>
          <h3 className="mt-2 font-display text-xl font-semibold text-[var(--foreground)]">
            Download spreadsheet
          </h3>
          <p className="text-sm text-[var(--muted-foreground)] mt-1.5 leading-relaxed">
            Every passed candidate with their merit rank and four assigned
            rotations (blank where not yet assigned). Generated fresh on click.
          </p>
        </div>
        <a
          href="/api/export.xlsx"
          download
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[var(--foreground)] hover:bg-[var(--accent)] text-[var(--background)] font-medium text-sm transition-colors"
        >
          Export .xlsx
        </a>
      </section>

      <section>
        <SectionHeader
          eyebrow="Departments"
          title="Capacity per rotation"
          subtitle="Each department holds this many House Officers per 3-month rotation. Click a number to edit."
        />
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="scrollx">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--muted)] text-[var(--muted-foreground)] eyebrow">
                <tr>
                  <th className="text-left px-5 py-3 font-normal">Department</th>
                  <th className="text-center px-5 py-3 font-normal">Capacity</th>
                  <th className="text-center px-5 py-3 font-normal">Original</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
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
        <div className="flex flex-wrap items-end justify-between gap-6 mb-6">
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
    <div className="mb-6">
      <p className="eyebrow-accent">{eyebrow}</p>
      <h2 className="mt-2 font-display text-2xl md:text-[28px] font-semibold text-[var(--foreground)] tracking-tight">
        {title}
      </h2>
      <p className="text-sm text-[var(--muted-foreground)] mt-1.5 max-w-2xl leading-relaxed">
        {subtitle}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--card)] px-6 py-6">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-[var(--foreground)] tabular-nums tracking-tight">
        {value}
      </p>
    </div>
  );
}
