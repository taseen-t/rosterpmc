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
    <div className="mx-auto max-w-7xl px-4 md:px-6 py-10 md:py-14 space-y-14">
      <header className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <p className="eyebrow-primary">Admin · Roster control</p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--foreground)] leading-tight">
            Control panel
          </h1>
          <p className="mt-3 max-w-2xl text-base md:text-lg text-[var(--muted-foreground)] leading-relaxed">
            Manage department capacities, edit student records, assign rotation
            picks, and finalize a student&apos;s schedule when their four
            placements are confirmed.
          </p>
        </div>
        <AdminLogoutButton />
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <StatTile tone="primary" label="Students" value={students.length.toString()} />
        <StatTile tone="secondary" label="Pass" value={passes.toString()} />
        <StatTile tone="dark" label="Fail" value={fails.toString()} />
        <StatTile tone="accent" label="Finalized" value={finalized.toString()} />
      </section>

      <section className="rounded-lg bg-[var(--muted)] p-6 md:p-8 flex flex-wrap items-center gap-6">
        <div className="flex-1 min-w-0">
          <p className="eyebrow-primary">Export</p>
          <h3 className="mt-2 font-display text-2xl md:text-3xl font-bold text-[var(--foreground)] tracking-tight">
            Download spreadsheet
          </h3>
          <p className="text-sm md:text-base text-[var(--muted-foreground)] mt-2 leading-relaxed">
            Every passed candidate with merit rank and four assigned rotations.
            Generated fresh on click.
          </p>
        </div>
        <a
          href="/api/export.xlsx"
          download
          className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-strong)] hover:scale-105 transition-all duration-200 font-semibold"
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
        <div className="mt-8 rounded-lg bg-[var(--background)] overflow-hidden border border-[var(--border)]">
          <div className="scrollx">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--muted)]">
                <tr>
                  <th className="text-left px-5 py-4 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Department</th>
                  <th className="text-center px-5 py-4 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Capacity</th>
                  <th className="text-center px-5 py-4 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Original</th>
                  <th className="px-5 py-4" />
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
        <div className="flex flex-wrap items-end justify-between gap-6 mb-8">
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
      <p className="eyebrow-primary">{eyebrow}</p>
      <h2 className="mt-2 font-display text-3xl md:text-4xl font-extrabold tracking-tight text-[var(--foreground)]">
        {title}
      </h2>
      <p className="text-sm md:text-base text-[var(--muted-foreground)] mt-2 max-w-2xl leading-relaxed">
        {subtitle}
      </p>
    </div>
  );
}

function StatTile({
  tone,
  label,
  value,
}: {
  tone: "primary" | "secondary" | "accent" | "dark";
  label: string;
  value: string;
}) {
  const cls = {
    primary: "bg-[var(--primary)] text-[var(--primary-foreground)]",
    secondary: "bg-[var(--secondary)] text-[var(--secondary-foreground)]",
    accent: "bg-[var(--accent)] text-[var(--accent-foreground)]",
    dark: "bg-[var(--dark)] text-[var(--dark-foreground)]",
  }[tone];
  return (
    <div
      className={`rounded-lg ${cls} p-6 md:p-7 transition-all duration-200 hover:scale-[1.02]`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">
        {label}
      </p>
      <p className="mt-3 font-display text-4xl md:text-5xl font-extrabold tabular-nums tracking-tight leading-none">
        {value}
      </p>
    </div>
  );
}
