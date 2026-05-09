import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import {
  getStudentsWithOverrides,
  getDepartmentsWithOverrides,
  getStaticStudents,
  getStaticDepartments,
} from "@/lib/data";
import { getAllSelections } from "@/lib/selections";
import { sql, ensureSchema } from "@/lib/db";
import { CapacityEditor } from "./CapacityEditor";
import { StudentEditor } from "./StudentEditor";
import { AdminLogoutButton } from "./AdminLogoutButton";
import { AddStudentForm } from "./AddStudentForm";
import { SupportRequests } from "./SupportRequests";

type SupportRow = {
  id: number;
  roll_no: string | null;
  contact: string | null;
  category: string | null;
  message: string;
  resolved: boolean;
  created_at: string;
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  await ensureSchema();
  const [students, departments, selections, supportRows] = await Promise.all([
    getStudentsWithOverrides(),
    getDepartmentsWithOverrides(),
    getAllSelections(),
    sql<SupportRow[]>`
      SELECT id, roll_no, contact, category, message, resolved, created_at::text AS created_at
      FROM support_requests
      ORDER BY resolved ASC, created_at DESC
      LIMIT 200
    `,
  ]);

  const submittedRolls = new Set(selections.map((s) => s.roll_no));
  const passes = students.filter((s) => s.overall === "Pass").length;
  const fails = students.length - passes;

  const staticStudents = getStaticStudents();
  const staticDepts = getStaticDepartments();
  const staticDeptMap = new Map(staticDepts.map((d) => [d.name, d.capacity]));
  const staticStudentMap = new Map(staticStudents.map((s) => [s.roll_no, s]));

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 py-8 md:py-10 space-y-8">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span aria-hidden className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-navy-800/10 text-navy-800 text-[10px] uppercase tracking-[0.16em] font-semibold ring-1 ring-navy-800/15">
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z" />
              </svg>
              Admin
            </span>
            <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
              Office of the Medical Superintendent
            </span>
          </div>
          <h1 className="mt-2 font-display text-3xl md:text-[34px] font-semibold text-slate-900 tracking-tight">
            Control panel
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Correct student data, adjust seat capacities, or reset a user&apos;s submission.
          </p>
        </div>
        <AdminLogoutButton />
      </header>

      <div className="grid sm:grid-cols-5 gap-3">
        <Stat label="Students" value={students.length.toString()} tone="slate" />
        <Stat label="Pass" value={passes.toString()} tone="emerald" />
        <Stat label="Fail" value={fails.toString()} tone="rose" />
        <Stat label="Submitted" value={`${submittedRolls.size}`} tone="teal" />
        <Stat
          label="Open tickets"
          value={`${supportRows.filter((r) => !r.resolved).length}`}
          tone="amber"
        />
      </div>

      {/* Excel export */}
      <section className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-slate-200 bg-gradient-to-r from-white to-teal-50/40">
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base font-semibold text-slate-900">
            Download general spreadsheet
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Excel sheet with every passed candidate, their merit rank, and their four
            rotation picks (or blank if not yet submitted). Generates fresh on click.
          </p>
        </div>
        <a
          href="/api/export.xlsx"
          download
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-sm font-medium shadow-sm"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
          </svg>
          Export .xlsx
        </a>
      </section>

      <section>
        <SectionHeader
          title="Departments & capacity"
          subtitle="Capacity is per rotation — each department holds this many House Officers each 3-month rotation. Click a number to edit."
        />
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="scrollx">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Department</th>
                  <th className="text-center px-4 py-3 font-medium">Capacity</th>
                  <th className="text-center px-4 py-3 font-medium">Original (PDF)</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
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
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <SectionHeader
            title="Students"
            subtitle="OCR-extracted from the result PDF + manually added. Edit any field, skip a no-show student, or remove a manually-added row."
          />
          <AddStudentForm />
        </div>
        <StudentEditor
          students={students}
          submittedRolls={Array.from(submittedRolls)}
          staticStudentMap={Object.fromEntries(
            Array.from(staticStudentMap.entries()).map(([k, v]) => [
              k,
              { name: v.name, total: v.total, overall: v.overall, rank: v.rank },
            ]),
          )}
        />
      </section>

      <section>
        <SectionHeader
          title="Support requests"
          subtitle="Messages submitted by students through the Contact Support form."
        />
        <SupportRequests rows={supportRows} />
      </section>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-lg md:text-xl font-semibold text-slate-900">{title}</h2>
      <p className="text-sm text-slate-500 mt-0.5 max-w-2xl">{subtitle}</p>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "slate" | "emerald" | "rose" | "teal" | "amber";
}) {
  const cls = {
    slate: "bg-white ring-slate-200 text-slate-900",
    emerald: "bg-emerald-50 ring-emerald-100 text-emerald-900",
    rose: "bg-rose-50 ring-rose-100 text-rose-900",
    teal: "bg-teal-50 ring-teal-100 text-teal-900",
    amber: "bg-amber-50 ring-amber-100 text-amber-900",
  }[tone];
  return (
    <div className={`rounded-xl ring-1 px-4 py-3 ${cls}`}>
      <div className="text-[11px] uppercase tracking-wider opacity-70">{label}</div>
      <div className="mt-0.5 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

