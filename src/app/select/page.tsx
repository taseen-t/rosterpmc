import { redirect } from "next/navigation";
import Link from "next/link";
import { getStudentSession } from "@/lib/auth";
import { getStudentsWithOverrides } from "@/lib/data";
import {
  getRankBlocker,
  getSeatMatrix,
  getSelectionsByRoll,
  isSubmitted,
} from "@/lib/selections";
import { SelectForm } from "./SelectForm";
import { RefreshOnInterval } from "@/components/RefreshOnInterval";
import { logAccess } from "@/lib/access";

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

  const [students, matrix, mySelections, submitted, blocker] = await Promise.all([
    getStudentsWithOverrides(),
    getSeatMatrix(),
    getSelectionsByRoll(session.roll),
    isSubmitted(session.roll),
    getRankBlocker(session.roll),
  ]);

  const me = students.find((s) => s.roll_no === session.roll);
  if (!me) redirect("/login");

  await logAccess({
    roll_no: session.roll,
    actor: session.roll,
    action: blocker ? "view_select_blocked" : "view_select",
  });

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-6 py-8 md:py-10 space-y-8">
      <header className="relative overflow-hidden rounded-2xl border border-teal-900/10 shadow-[0_20px_40px_-25px_rgba(11,62,79,0.4)]">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-700 via-teal-800 to-navy-900" />
        <div className="absolute inset-0 bg-rx opacity-90" />
        <div className="relative flex flex-wrap items-start justify-between gap-4 p-6 md:p-8 text-white">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-100/80">
              Welcome, House Officer
            </p>
            <h1 className="mt-2 font-display text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
              {me.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-teal-50/85">
              <span className="font-mono">Roll {me.roll_no}</span>
              {me.rank != null && (
                <>
                  <span className="opacity-50">·</span>
                  <span>Merit rank <span className="font-semibold text-white">#{me.rank}</span></span>
                </>
              )}
              {me.total != null && (
                <>
                  <span className="opacity-50">·</span>
                  <span><span className="font-semibold text-white">{me.total}</span>/1500 marks</span>
                </>
              )}
            </div>
          </div>
          <Link
            href="/"
            className="text-sm text-teal-100/80 hover:text-white transition-colors"
          >
            ← Back to roster
          </Link>
        </div>
      </header>

      {submitted ? (
        <SubmittedView selections={mySelections} />
      ) : blocker ? (
        <BlockerView blocker={blocker} />
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

function BlockerView({
  blocker,
}: {
  blocker: { rank: number | null; name: string; roll_no: string };
}) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/80 to-white shadow-sm p-6 md:p-8">
      <div className="flex items-start gap-4">
        <span aria-hidden className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 ring-1 ring-amber-200">
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-amber-700" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </span>
        <div className="flex-1">
          <h2 className="font-display text-2xl font-semibold text-amber-900 tracking-tight">
            Please wait - higher rank picks first
          </h2>
          <p className="mt-2 text-sm text-amber-900/80 leading-relaxed">
            Selection is locked until candidates ranked above you submit. Rank{" "}
            <span className="font-semibold">#{blocker.rank}</span>{" "}
            <span className="font-semibold">{blocker.name}</span>{" "}
            <span className="text-amber-900/60">(Roll {blocker.roll_no})</span>{" "}
            hasn&apos;t selected their rotations yet.
          </p>
          <p className="mt-3 text-sm text-amber-900/80 leading-relaxed">
            This page will refresh automatically - keep it open. Once they submit, this
            block lifts and you can pick your rotations.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 text-sm font-medium"
            >
              View public roster
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-white hover:bg-amber-50 text-amber-900 px-4 py-2 text-sm"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </div>

      <RefreshOnInterval />
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
            Selection has been submitted and cannot be changed. Reach out via Contact
            Support if anything looks wrong.
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
                {sel?.department ?? "-"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
