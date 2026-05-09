import Link from "next/link";
import { getStudentsWithOverrides } from "@/lib/data";
import { getAllSelections, getSeatMatrix } from "@/lib/selections";
import { classify, categoryStyle } from "@/lib/categories";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [students, selections, matrix] = await Promise.all([
    getStudentsWithOverrides(),
    getAllSelections(),
    getSeatMatrix(),
  ]);

  const selByRoll = new Map<string, Map<number, string>>();
  for (const s of selections) {
    if (!selByRoll.has(s.roll_no)) selByRoll.set(s.roll_no, new Map());
    selByRoll.get(s.roll_no)!.set(s.rotation, s.department);
  }

  const passes = students.filter((s) => s.overall === "Pass");
  const passesRanked = passes
    .filter((s) => s.rank != null)
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));

  const totalSeats = matrix.reduce((acc, m) => acc + m.capacity * 4, 0);
  const filledSeats = matrix.reduce(
    (acc, m) => acc + m.byRotation.reduce((a, r) => a + r.filled, 0),
    0,
  );
  const submittedRolls = new Set(selections.map((s) => s.roll_no));

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 py-8 md:py-10 space-y-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[28px] border border-teal-900/10 shadow-[0_30px_60px_-30px_rgba(11,62,79,0.4)]">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-700 via-teal-800 to-navy-900" />
        <div className="absolute inset-0 bg-rx opacity-90" />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-teal-300/15 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-navy-700/30 blur-3xl" />

        <div className="relative px-6 md:px-10 py-10 md:py-14 text-white">
          <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-teal-100/80">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 ring-1 ring-white/15 px-3 py-1">
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300 text-emerald-300 live-dot" aria-hidden />
              Live Selection
            </span>
            <span className="opacity-70">·</span>
            <span>Office of the Medical Superintendent</span>
            <span className="opacity-70">·</span>
            <span>Allied Hospital, Faisalabad</span>
          </div>

          <h1 className="mt-5 max-w-3xl">
            <span className="block font-display text-4xl md:text-[56px] font-semibold leading-[1.04] tracking-tight">
              House Officer
              <span className="text-teal-200"> seat selection</span>,
              <br className="hidden md:block" />
              live and merit-ordered.
            </span>
          </h1>

          <p className="mt-4 max-w-2xl text-[15px] md:text-base text-teal-50/85 leading-relaxed">
            FMU graduates of the 2025 Final Professional batch choose their four
            three-month rotations through this portal. Seats are first-come-first-served
            within capacity. Once submitted, picks are final — only the MS Office can
            reset them.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-white text-teal-800 px-5 py-3 font-medium hover:bg-teal-50 transition-colors shadow-[0_10px_30px_-10px_rgba(255,255,255,0.4)]"
            >
              Begin selection
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <a
              href="#roster"
              className="inline-flex items-center gap-2 rounded-xl bg-transparent ring-1 ring-white/25 hover:bg-white/10 text-white px-5 py-3 font-medium transition-colors"
            >
              View roster
            </a>
          </div>

          <dl className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Stat label="Eligible students" value={passes.length.toString()} sub="passed Final Prof." />
            <Stat label="Departments" value={matrix.length.toString()} sub="across 4 rotations" />
            <Stat label="Annual seats" value={totalSeats.toString()} sub="all rotations combined" />
            <Stat label="Filled" value={`${filledSeats}`} sub={`of ${totalSeats}`} accent />
          </dl>
        </div>
      </section>

      {/* Status strip */}
      <section className="grid sm:grid-cols-3 gap-3 -mt-2">
        <StatusCard
          tone="teal"
          icon="clock"
          title="Selection window"
          desc="Open · closes when all eligible students submit or per MS notice"
        />
        <StatusCard
          tone="emerald"
          icon="check"
          title={`${submittedRolls.size} submitted`}
          desc={`${passes.length - submittedRolls.size} remaining of eligible batch`}
        />
        <StatusCard
          tone="amber"
          icon="alert"
          title="Final on submit"
          desc="Department changes require MS Office reset"
        />
      </section>

      {/* Seat matrix */}
      <section>
        <SectionHeader
          eyebrow="Live Seats"
          title="Seat matrix"
          subtitle="Filled vs. available seats per department per rotation. Updates instantly as students submit."
        />
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="scrollx">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/80 text-slate-500 text-[11px] uppercase tracking-[0.12em]">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Department</th>
                  <th className="text-center px-3 py-3 font-medium">Cap.</th>
                  <th className="text-center px-3 py-3 font-medium">
                    R1 <span className="text-[10px] block font-normal text-slate-400">Jun – Aug</span>
                  </th>
                  <th className="text-center px-3 py-3 font-medium">
                    R2 <span className="text-[10px] block font-normal text-slate-400">Sep – Nov</span>
                  </th>
                  <th className="text-center px-3 py-3 font-medium">
                    R3 <span className="text-[10px] block font-normal text-slate-400">Dec – Feb</span>
                  </th>
                  <th className="text-center px-3 py-3 font-medium">
                    R4 <span className="text-[10px] block font-normal text-slate-400">Mar – May</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matrix.map((m) => {
                  const cat = classify(m.name);
                  const style = categoryStyle[cat];
                  return (
                    <tr key={m.name} className="group hover:bg-slate-50/60 transition-colors">
                      <td className="px-0 py-2.5">
                        <div className="flex items-stretch">
                          <span aria-hidden className={`w-1 ${style.bar} rounded-r-sm`} />
                          <div className="pl-4 pr-3 py-0.5 flex flex-col">
                            <span className="font-medium text-slate-800">{m.name}</span>
                            <span className={`mt-0.5 inline-flex items-center self-start px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider ring-1 ${style.chip}`}>
                              {style.label}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="text-center px-3 py-2.5 text-slate-500 font-mono tabular-nums">{m.capacity}</td>
                      {m.byRotation.map((r) => (
                        <td key={r.rotation} className="text-center px-3 py-2.5">
                          <SeatBadge filled={r.filled} capacity={m.capacity} />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <Legend />
      </section>

      {/* Roster */}
      <section id="roster">
        <SectionHeader
          eyebrow="Public Roster"
          title="Allocations by merit"
          subtitle="Every passed candidate ranked by total marks, with their submitted rotations. Empty cells mean the student has not yet selected."
        />
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="scrollx">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/80 text-slate-500 text-[11px] uppercase tracking-[0.12em]">
                <tr>
                  <th className="text-left px-3 py-3 font-medium">Rank</th>
                  <th className="text-left px-3 py-3 font-medium">Roll</th>
                  <th className="text-left px-3 py-3 font-medium">Name</th>
                  <th className="text-right px-3 py-3 font-medium">Marks</th>
                  <th className="text-left px-3 py-3 font-medium">R1</th>
                  <th className="text-left px-3 py-3 font-medium">R2</th>
                  <th className="text-left px-3 py-3 font-medium">R3</th>
                  <th className="text-left px-3 py-3 font-medium">R4</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {passesRanked.map((s) => {
                  const rotMap = selByRoll.get(s.roll_no);
                  const isTop3 = (s.rank ?? 999) <= 3;
                  return (
                    <tr key={s.roll_no} className="group hover:bg-slate-50/60 transition-colors">
                      <td className="px-3 py-2.5">
                        <span
                          className={
                            isTop3
                              ? "inline-flex items-center justify-center w-7 h-6 rounded-md bg-amber-50 text-amber-800 font-mono text-xs ring-1 ring-amber-100"
                              : "text-slate-500 font-mono text-xs"
                          }
                        >
                          {s.rank}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-700">{s.roll_no}</td>
                      <td className="px-3 py-2.5 text-slate-900">{s.name}</td>
                      <td className="px-3 py-2.5 text-right text-slate-600 font-mono tabular-nums">
                        {s.total ?? "—"}
                      </td>
                      {[1, 2, 3, 4].map((r) => (
                        <td key={r} className="px-3 py-2.5">
                          {rotMap?.get(r) ? (
                            <DeptChip name={rotMap.get(r)!} />
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
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
    <div className="mb-5">
      <p className="text-[11px] uppercase tracking-[0.18em] text-teal-700/80 font-semibold">
        {eyebrow}
      </p>
      <h2 className="mt-1.5 font-display text-2xl md:text-[28px] font-semibold text-slate-900 tracking-tight">
        {title}
      </h2>
      <p className="text-sm text-slate-500 mt-1 max-w-2xl">{subtitle}</p>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={
        accent
          ? "rounded-xl bg-white/15 ring-1 ring-white/25 px-4 py-3.5 backdrop-blur"
          : "rounded-xl bg-white/5 ring-1 ring-white/10 px-4 py-3.5 backdrop-blur"
      }
    >
      <dt className="text-[10px] uppercase tracking-[0.16em] text-teal-100/75">
        {label}
      </dt>
      <dd className="mt-1 font-display text-3xl font-semibold text-white tabular-nums tracking-tight leading-none">
        {value}
      </dd>
      {sub && <div className="mt-1.5 text-[11px] text-teal-100/60">{sub}</div>}
    </div>
  );
}

function StatusCard({
  tone,
  icon,
  title,
  desc,
}: {
  tone: "teal" | "emerald" | "amber";
  icon: "clock" | "check" | "alert";
  title: string;
  desc: string;
}) {
  const cls = {
    teal: "bg-white border-teal-100 text-teal-900 [--icon-bg:var(--color-teal-50)] [--icon-fg:var(--color-teal-700)]",
    emerald:
      "bg-white border-emerald-100 text-emerald-900 [--icon-bg:var(--color-emerald-50)] [--icon-fg:var(--color-emerald-700)]",
    amber:
      "bg-white border-amber-100 text-amber-900 [--icon-bg:var(--color-amber-50)] [--icon-fg:var(--color-amber-700)]",
  }[tone];
  return (
    <div className={`flex items-start gap-3 rounded-xl border ${cls} p-4 shadow-sm`}>
      <span
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-current/10"
        style={{ background: "var(--icon-bg)", color: "var(--icon-fg)" }}
      >
        {icon === "clock" && (
          <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        )}
        {icon === "check" && (
          <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L20 6" />
          </svg>
        )}
        {icon === "alert" && (
          <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4M12 17h.01" />
            <path d="M10.3 3.86l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.14l-8-14a2 2 0 0 0-3.4 0z" />
          </svg>
        )}
      </span>
      <div className="min-w-0">
        <div className="text-sm font-medium leading-snug">{title}</div>
        <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}

function SeatBadge({ filled, capacity }: { filled: number; capacity: number }) {
  const ratio = capacity === 0 ? 0 : filled / capacity;
  let cls = "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (ratio >= 1) cls = "bg-rose-50 text-rose-700 ring-rose-100";
  else if (ratio >= 0.7) cls = "bg-amber-50 text-amber-800 ring-amber-100";
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[3.5rem] gap-1 px-2 py-1 rounded-md text-xs ring-1 ${cls} tabular-nums font-mono`}
    >
      {filled}<span className="opacity-50">/</span>{capacity}
    </span>
  );
}

function DeptChip({ name }: { name: string }) {
  const cat = classify(name);
  const style = categoryStyle[cat];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs ring-1 ${style.chip}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${style.bar}`} />
      {name}
    </span>
  );
}

function Legend() {
  const cats = [
    "Medicine",
    "Surgery",
    "Gynae",
    "Paediatrics",
    "Allied Specialty",
    "Diagnostic",
  ] as const;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-500">
      <span className="uppercase tracking-[0.14em]">Categories:</span>
      {cats.map((c) => {
        const s = categoryStyle[c];
        return (
          <span key={c} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={`h-2 w-2 rounded-full ${s.bar}`} />
            <span>{s.label}</span>
          </span>
        );
      })}
    </div>
  );
}
