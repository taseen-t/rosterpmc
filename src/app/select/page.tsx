import { redirect } from "next/navigation";
import Link from "next/link";
import { getStudentSession } from "@/lib/auth";
import { getStudentsWithOverrides } from "@/lib/data";
import { getSeatMatrix, getSelectionsByRoll, isSubmitted } from "@/lib/selections";
import { SelectForm } from "./SelectForm";

export const dynamic = "force-dynamic";

const ROTATIONS = [
  { n: 1, label: "1st Rotation", dates: "01.06.2025 – 31.08.2025" },
  { n: 2, label: "2nd Rotation", dates: "01.09.2025 – 30.11.2025" },
  { n: 3, label: "3rd Rotation", dates: "01.12.2025 – 28.02.2026" },
  { n: 4, label: "4th Rotation", dates: "01.03.2026 – 31.05.2026" },
];

export default async function SelectPage() {
  const session = await getStudentSession();
  if (!session) redirect("/login");

  const [students, matrix, mySelections, submitted] = await Promise.all([
    getStudentsWithOverrides(),
    getSeatMatrix(),
    getSelectionsByRoll(session.roll),
    isSubmitted(session.roll),
  ]);

  const me = students.find((s) => s.roll_no === session.roll);
  if (!me) redirect("/login");

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-6 py-8 md:py-10 space-y-8">
      <header className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
              Welcome, House Officer
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">
              {me.name}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Roll <span className="font-mono">{me.roll_no}</span>
              {me.rank ? ` · Merit rank #${me.rank}` : ""}
              {me.total ? ` · ${me.total}/1500 marks` : ""}
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← Back to roster
          </Link>
        </div>
      </header>

      {submitted ? (
        <SubmittedView selections={mySelections} />
      ) : (
        <SelectForm
          rotations={ROTATIONS}
          matrix={matrix}
          existing={mySelections}
        />
      )}
    </div>
  );
}

function SubmittedView({
  selections,
}: {
  selections: { rotation: number; department: string; created_at: string }[];
}) {
  const byRot = new Map(selections.map((s) => [s.rotation, s]));
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 md:p-8">
      <div className="flex items-start gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-emerald-50 grid place-items-center ring-1 ring-emerald-100 shrink-0">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 text-emerald-700"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Your selection is locked.
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Selection has been submitted and cannot be changed. The Office of the Medical
            Superintendent has been notified.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {ROTATIONS.map((r) => {
          const sel = byRot.get(r.n);
          return (
            <div
              key={r.n}
              className="rounded-lg border border-slate-200 px-4 py-3 bg-slate-50/50"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{r.label}</span>
                <span className="font-mono">{r.dates}</span>
              </div>
              <div className="mt-1 text-base font-medium text-slate-900">
                {sel?.department ?? "—"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
