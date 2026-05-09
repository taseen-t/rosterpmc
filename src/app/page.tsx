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
    <div className="mx-auto max-w-6xl px-4 md:px-6 py-10 md:py-14 space-y-16">
      {/* Hero — Modula style, mostly white with a single lime accent */}
      <section className="relative overflow-hidden rounded-[28px] border border-hairline bg-paper">
        <div className="absolute -top-32 -right-24 h-72 w-72 rounded-full bg-lime-300 opacity-60 blur-[110px] pointer-events-none" />
        <div className="absolute -bottom-40 -left-32 h-72 w-72 rounded-full bg-teal-200 opacity-50 blur-[120px] pointer-events-none" />

        <div className="relative px-6 md:px-12 py-12 md:py-16">
          <div className="flex flex-wrap items-center gap-3 label-overline">
            <span className="inline-flex items-center gap-2 rounded-full bg-ink-900 text-paper px-3 py-1.5">
              <span className="relative inline-flex h-2 w-2 rounded-full bg-lime-300 text-lime-300 live-dot" aria-hidden />
              <span className="!text-[10px] !text-paper">LIVE SELECTION</span>
            </span>
            <span className="text-ink-400">·</span>
            <span className="!text-ink-700">Office of the Medical Superintendent</span>
          </div>

          <h1 className="mt-8 max-w-4xl font-display h1-display text-ink-900">
            House Officer seat selection,
            <br className="hidden md:block" />
            live and merit-ordered.
          </h1>

          <p className="mt-6 max-w-2xl text-[18px] md:text-[19px] text-ink-700 leading-[1.55]">
            FMU graduates of the 2025 Final Professional batch choose their four
            three-month rotations through this portal. Seats are first-come-first-served
            within capacity. Once submitted, picks are final — only the MS Office can
            reset them.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-ink-900 hover:bg-ink-700 text-paper px-5 py-3 text-[15px] font-medium transition-colors"
            >
              Begin selection
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <a
              href="#roster"
              className="inline-flex items-center gap-2 rounded-full bg-lime-300 hover:bg-lime-200 text-ink-900 px-5 py-3 text-[15px] font-medium transition-colors ring-1 ring-lime-500/20"
            >
              View roster
            </a>
          </div>

          <dl className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Eligible students" value={passes.length.toString()} sub="passed Final Prof." />
            <Stat label="Departments" value={matrix.length.toString()} sub="across 4 rotations" />
            <Stat label="Annual seats" value={totalSeats.toString()} sub="all rotations" />
            <Stat
              label="Filled"
              value={`${filledSeats}`}
              sub={`of ${totalSeats}`}
              accent
            />
          </dl>
        </div>
      </section>

      {/* Status strip */}
      <section className="grid sm:grid-cols-3 gap-3">
        <StatusCard
          icon="clock"
          title="Selection window"
          desc="Open · closes when all eligible students submit or per MS notice"
        />
        <StatusCard
          icon="check"
          title={`${submittedRolls.size} submitted`}
          desc={`${passes.length - submittedRolls.size} remaining of eligible batch`}
          accent
        />
        <StatusCard
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
        <div className="rounded-2xl border border-hairline bg-paper overflow-hidden">
          <div className="scrollx">
            <table className="min-w-full text-[14px]">
              <thead className="bg-cream/50 text-ink-400">
                <tr>
                  <th className="text-left px-5 py-3.5 font-medium label-overline !text-ink-400">Department</th>
                  <th className="text-center px-3 py-3.5 font-medium label-overline !text-ink-400">Cap.</th>
                  <th className="text-center px-3 py-3.5 font-medium">
                    <span className="label-overline !text-ink-400">R1</span>
                    <span className="block text-[10px] font-normal text-ink-400 mt-0.5">Jun – Aug</span>
                  </th>
                  <th className="text-center px-3 py-3.5 font-medium">
                    <span className="label-overline !text-ink-400">R2</span>
                    <span className="block text-[10px] font-normal text-ink-400 mt-0.5">Sep – Nov</span>
                  </th>
                  <th className="text-center px-3 py-3.5 font-medium">
                    <span className="label-overline !text-ink-400">R3</span>
                    <span className="block text-[10px] font-normal text-ink-400 mt-0.5">Dec – Feb</span>
                  </th>
                  <th className="text-center px-3 py-3.5 font-medium">
                    <span className="label-overline !text-ink-400">R4</span>
                    <span className="block text-[10px] font-normal text-ink-400 mt-0.5">Mar – May</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {matrix.map((m) => {
                  const cat = classify(m.name);
                  const style = categoryStyle[cat];
                  return (
                    <tr key={m.name} className="group hover:bg-cream/40 transition-colors">
                      <td className="px-0 py-3">
                        <div className="flex items-stretch">
                          <span aria-hidden className={`w-1 ${style.bar} rounded-r-sm`} />
                          <div className="pl-4 pr-3 py-0.5 flex flex-col">
                            <span className="font-medium text-ink-900">{m.name}</span>
                            <span className={`mt-1 inline-flex items-center self-start px-1.5 py-0.5 rounded text-[10px] uppercase tracking-[0.08em] ring-1 ${style.chip}`}>
                              {style.label}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="text-center px-3 py-3 text-ink-400 font-mono tabular-nums">{m.capacity}</td>
                      {m.byRotation.map((r) => (
                        <td key={r.rotation} className="text-center px-3 py-3">
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
        <div className="rounded-2xl border border-hairline bg-paper overflow-hidden">
          <div className="scrollx">
            <table className="min-w-full text-[14px]">
              <thead className="bg-cream/50 text-ink-400">
                <tr>
                  <th className="text-left px-3 py-3.5 label-overline !text-ink-400">Rank</th>
                  <th className="text-left px-3 py-3.5 label-overline !text-ink-400">Roll</th>
                  <th className="text-left px-3 py-3.5 label-overline !text-ink-400">Name</th>
                  <th className="text-right px-3 py-3.5 label-overline !text-ink-400">Marks</th>
                  <th className="text-left px-3 py-3.5 label-overline !text-ink-400">R1</th>
                  <th className="text-left px-3 py-3.5 label-overline !text-ink-400">R2</th>
                  <th className="text-left px-3 py-3.5 label-overline !text-ink-400">R3</th>
                  <th className="text-left px-3 py-3.5 label-overline !text-ink-400">R4</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {passesRanked.map((s) => {
                  const rotMap = selByRoll.get(s.roll_no);
                  const isTop3 = (s.rank ?? 999) <= 3;
                  return (
                    <tr key={s.roll_no} className="group hover:bg-cream/40 transition-colors">
                      <td className="px-3 py-3">
                        <span
                          className={
                            isTop3
                              ? "inline-flex items-center justify-center w-7 h-6 rounded-md bg-lime-300 text-ink-900 font-mono text-xs ring-1 ring-lime-500/30"
                              : "text-ink-400 font-mono text-xs"
                          }
                        >
                          {s.rank}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono text-ink-700">{s.roll_no}</td>
                      <td className="px-3 py-3 text-ink-900">{s.name}</td>
                      <td className="px-3 py-3 text-right text-ink-600 font-mono tabular-nums">
                        {s.total ?? "—"}
                      </td>
                      {[1, 2, 3, 4].map((r) => (
                        <td key={r} className="px-3 py-3">
                          {rotMap?.get(r) ? (
                            <DeptChip name={rotMap.get(r)!} />
                          ) : (
                            <span className="text-ink-400">—</span>
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
    <div className="mb-6">
      <p className="label-overline text-ink-700">{eyebrow}</p>
      <h2 className="mt-2 font-display h2-title text-ink-900">{title}</h2>
      <p className="text-[15px] text-ink-600 mt-1.5 max-w-2xl leading-[1.55]">{subtitle}</p>
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
          ? "rounded-2xl bg-ink-900 text-paper px-5 py-4 ring-1 ring-ink-900"
          : "rounded-2xl bg-cream ring-1 ring-hairline px-5 py-4"
      }
    >
      <dt className={`label-overline ${accent ? "!text-lime-300" : "!text-ink-400"}`}>
        {label}
      </dt>
      <dd
        className={`mt-2 font-display tabular-nums tracking-tight leading-none ${
          accent ? "text-paper" : "text-ink-900"
        } text-[40px] md:text-[44px] font-medium`}
      >
        {value}
      </dd>
      {sub && (
        <div className={`mt-2 text-[13px] ${accent ? "text-ink-400" : "text-ink-400"}`}>
          {sub}
        </div>
      )}
    </div>
  );
}

function StatusCard({
  icon,
  title,
  desc,
  accent,
}: {
  icon: "clock" | "check" | "alert";
  title: string;
  desc: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border border-hairline bg-paper p-5 ${
        accent ? "ring-1 ring-lime-500/30" : ""
      }`}
    >
      <span
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          accent ? "bg-lime-300 text-ink-900" : "bg-cream text-ink-700 ring-1 ring-hairline"
        }`}
      >
        {icon === "clock" && (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        )}
        {icon === "check" && (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L20 6" />
          </svg>
        )}
        {icon === "alert" && (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4M12 17h.01" />
            <path d="M10.3 3.86l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.14l-8-14a2 2 0 0 0-3.4 0z" />
          </svg>
        )}
      </span>
      <div className="min-w-0">
        <div className="text-[15px] font-medium text-ink-900 leading-snug">{title}</div>
        <div className="text-[13px] text-ink-600 mt-1 leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}

function SeatBadge({ filled, capacity }: { filled: number; capacity: number }) {
  const ratio = capacity === 0 ? 0 : filled / capacity;
  let cls = "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (ratio >= 1) cls = "bg-rose-50 text-rose-700 ring-rose-100";
  else if (ratio >= 0.7) cls = "bg-amber-50 text-amber-700 ring-amber-200";
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
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-ink-400">
      <span className="uppercase tracking-[0.14em]">Categories</span>
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
