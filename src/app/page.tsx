import Link from "next/link";
import { getStudentsWithOverrides } from "@/lib/data";
import { getAllSelections, getSeatMatrix } from "@/lib/selections";
import { classify, categoryStyle } from "@/lib/categories";

// ISR: revalidate the homepage at most every 15 seconds. Server actions
// (admin edits, finalization) call revalidatePath('/') so changes show up
// immediately; the cache otherwise serves the page fast from the CDN.
export const revalidate = 15;

export default async function HomePage() {
  const [students, selections, matrix] = await Promise.all([
    getStudentsWithOverrides(),
    getAllSelections(),
    getSeatMatrix(),
  ]);

  // Group picks by roll. Only students with ALL FOUR rotations assigned
  // are eligible to appear in the public roster — the admin's draft work
  // stays private until they finalize.
  const selByRoll = new Map<string, Map<number, string>>();
  for (const s of selections) {
    if (!selByRoll.has(s.roll_no)) selByRoll.set(s.roll_no, new Map());
    selByRoll.get(s.roll_no)!.set(s.rotation, s.department);
  }

  const passes = students.filter((s) => s.overall === "Pass");
  const passesRanked = passes
    .filter((s) => s.rank != null)
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));

  const fullyAssigned = passesRanked.filter((s) => {
    const m = selByRoll.get(s.roll_no);
    return m && m.size === 4;
  });

  const totalSeats = matrix.reduce((acc, m) => acc + m.capacity * 4, 0);
  const filledSeats = matrix.reduce(
    (acc, m) => acc + m.byRotation.reduce((a, r) => a + r.filled, 0),
    0,
  );

  const ldJson = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "House Job Roster · FMU",
    url: "https://rosterpmc.vercel.app",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Any",
    description:
      "Independent allocation portal for FMU House Officers (2026-27). Four three-month rotations, assigned by merit, published transparently.",
    creator: [
      { "@type": "Person", name: "Dr. Rabiya Tariq" },
      { "@type": "Person", name: "Mohammad Taseen Tariq" },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }}
      />

      {/* ─── Hero ───────────────────────────────────────────────────── */}
      <section className="relative">
        <div className="mx-auto max-w-3xl px-6 md:px-8 pt-24 md:pt-32 pb-20 md:pb-28 text-center">
          <p className="eyebrow-accent">House Officers · 2026 – 2027</p>
          <h1 className="mt-6 font-display text-[44px] sm:text-6xl md:text-7xl font-normal text-[var(--foreground)] tracking-[-0.02em] leading-[1.05]">
            The roster,
            <br />
            <span className="italic text-[var(--accent)]">composed</span> by merit.
          </h1>
          <p className="mt-8 mx-auto max-w-2xl text-[17px] md:text-lg text-[var(--muted-foreground)] leading-[1.75]">
            An independent allocation record for the Final Professional MBBS
            class of 2025 — four three-month rotations, assigned and finalized by
            the admin team, published here as they&apos;re confirmed.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="#roster"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[var(--foreground)] text-[var(--background)] hover:bg-[var(--accent)] transition-all duration-200 font-medium text-sm"
            >
              View the roster
              <span aria-hidden>↓</span>
            </Link>
          </div>

          <p className="mt-12 font-display text-base italic text-[var(--muted-foreground)]">
            Built by{" "}
            <span className="text-[var(--foreground)] not-italic font-semibold">
              Dr. Rabiya Tariq
            </span>{" "}
            &amp;{" "}
            <span className="text-[var(--foreground)] not-italic font-semibold">
              Mohammad Taseen Tariq
            </span>
          </p>
        </div>

        {/* Decorative rule below hero */}
        <div className="mx-auto max-w-5xl px-6 md:px-8">
          <div className="hairline" />
        </div>
      </section>

      {/* ─── Status numbers ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 md:px-8 py-20 md:py-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--border)] border border-[var(--border)] rounded-lg overflow-hidden">
          <BigStat label="Eligible candidates" value={passes.length.toString()} />
          <BigStat label="Finalized rosters" value={fullyAssigned.length.toString()} />
          <BigStat
            label="Seats filled"
            value={`${filledSeats} / ${totalSeats}`}
          />
          <BigStat label="Rotations / yr" value="4" />
        </div>
      </section>

      {/* ─── Seat matrix ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 md:px-8 py-12">
        <RuleLabel>Live seat matrix</RuleLabel>
        <h2 className="mt-6 font-display text-3xl md:text-[40px] font-semibold text-[var(--foreground)] tracking-tight">
          Department occupancy
        </h2>
        <p className="mt-3 max-w-2xl text-[var(--muted-foreground)] leading-relaxed">
          Filled and available seats per department, per three-month rotation.
          Updates immediately when the admin saves a placement.
        </p>

        <div className="mt-10 rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="scrollx">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--muted)] text-[var(--muted-foreground)] eyebrow">
                <tr>
                  <th className="text-left px-5 py-4 font-normal">Department</th>
                  <th className="text-center px-3 py-4 font-normal">Cap.</th>
                  <th className="text-center px-3 py-4 font-normal">
                    R1
                    <span className="block text-[9px] opacity-60 mt-0.5 normal-case tracking-wide">
                      Jun – Aug
                    </span>
                  </th>
                  <th className="text-center px-3 py-4 font-normal">
                    R2
                    <span className="block text-[9px] opacity-60 mt-0.5 normal-case tracking-wide">
                      Sep – Nov
                    </span>
                  </th>
                  <th className="text-center px-3 py-4 font-normal">
                    R3
                    <span className="block text-[9px] opacity-60 mt-0.5 normal-case tracking-wide">
                      Dec – Feb
                    </span>
                  </th>
                  <th className="text-center px-3 py-4 font-normal">
                    R4
                    <span className="block text-[9px] opacity-60 mt-0.5 normal-case tracking-wide">
                      Mar – May
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {matrix.map((m) => {
                  const cat = classify(m.name);
                  const style = categoryStyle[cat];
                  return (
                    <tr key={m.name} className="hover:bg-[var(--muted)]/40 transition-colors">
                      <td className="px-0 py-3.5">
                        <div className="flex items-stretch">
                          <span aria-hidden className={`w-1 ${style.bar}`} />
                          <div className="pl-5 pr-3 py-0.5 flex flex-col">
                            <span className="text-[var(--foreground)]">{m.name}</span>
                            <span className="eyebrow mt-1 text-[9px]">
                              {style.label}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="text-center px-3 py-3.5 text-[var(--muted-foreground)] font-mono-label tabular-nums">
                        {m.capacity}
                      </td>
                      {m.byRotation.map((r) => (
                        <td key={r.rotation} className="text-center px-3 py-3.5">
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

      {/* ─── Public roster ──────────────────────────────────────────── */}
      <section id="roster" className="mx-auto max-w-5xl px-6 md:px-8 py-20 md:py-24">
        <RuleLabel>Public roster</RuleLabel>
        <h2 className="mt-6 font-display text-3xl md:text-[40px] font-semibold text-[var(--foreground)] tracking-tight">
          Allocations by merit
        </h2>
        <p className="mt-3 max-w-2xl text-[var(--muted-foreground)] leading-relaxed">
          Students whose four rotations have been confirmed appear below in
          merit order. Drafts and partial assignments are kept private until the
          admin finalizes all four placements.
        </p>

        <div className="mt-10 rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="scrollx">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--muted)] text-[var(--muted-foreground)] eyebrow">
                <tr>
                  <th className="text-left px-4 py-4 font-normal">Rank</th>
                  <th className="text-left px-4 py-4 font-normal">Name</th>
                  <th className="text-right px-4 py-4 font-normal">Marks</th>
                  <th className="text-left px-4 py-4 font-normal">R1</th>
                  <th className="text-left px-4 py-4 font-normal">R2</th>
                  <th className="text-left px-4 py-4 font-normal">R3</th>
                  <th className="text-left px-4 py-4 font-normal">R4</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {fullyAssigned.map((s) => {
                  const rotMap = selByRoll.get(s.roll_no)!;
                  const isTop3 = (s.rank ?? 999) <= 3;
                  return (
                    <tr key={s.roll_no} className="hover:bg-[var(--muted)]/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <span
                          className={
                            isTop3
                              ? "inline-flex items-center justify-center w-8 h-7 rounded-md border border-[var(--accent)]/60 bg-[var(--accent-muted)]/40 text-[var(--accent)] font-mono-label text-xs tabular-nums"
                              : "text-[var(--muted-foreground)] font-mono-label text-xs tabular-nums"
                          }
                        >
                          {s.rank}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[var(--foreground)]">
                        {s.name}
                      </td>
                      <td className="px-4 py-3.5 text-right text-[var(--muted-foreground)] font-mono-label tabular-nums">
                        {s.total ?? "—"}
                      </td>
                      {[1, 2, 3, 4].map((r) => (
                        <td key={r} className="px-4 py-3.5">
                          <DeptChip name={rotMap.get(r)!} />
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {fullyAssigned.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-16 text-center text-[var(--muted-foreground)]"
                    >
                      No rosters published yet. Students whose four rotations
                      are confirmed by the admin will appear here in merit
                      order.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-6 text-xs text-[var(--muted-foreground)] leading-relaxed max-w-2xl">
          For corrections or changes to your placements, please contact your
          roster administrator directly.
        </p>
      </section>
    </>
  );
}

function RuleLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="section-rule">
      <span className="hairline flex-1" />
      <span className="eyebrow-accent shrink-0">{children}</span>
      <span className="hairline flex-1" />
    </div>
  );
}

function BigStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--card)] px-6 py-8">
      <p className="eyebrow">{label}</p>
      <p className="mt-3 font-display text-3xl md:text-4xl font-semibold text-[var(--foreground)] tabular-nums tracking-tight">
        {value}
      </p>
    </div>
  );
}

function SeatBadge({ filled, capacity }: { filled: number; capacity: number }) {
  const ratio = capacity === 0 ? 0 : filled / capacity;
  let cls = "bg-[var(--emerald-soft)] text-[var(--emerald)] border-[var(--emerald)]/30";
  if (ratio >= 1) cls = "bg-[var(--rose-soft)] text-[var(--rose)] border-[var(--rose)]/30";
  else if (ratio >= 0.7) cls = "bg-[var(--amber-soft)] text-[var(--amber)] border-[var(--amber)]/30";
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[3.25rem] gap-1 px-2 py-0.5 rounded-md text-xs border ${cls} tabular-nums font-mono-label`}
    >
      {filled} / {capacity}
    </span>
  );
}

function DeptChip({ name }: { name: string }) {
  const cat = classify(name);
  const style = categoryStyle[cat];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs border ${style.chip}`}>
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
    <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-[var(--muted-foreground)]">
      <span className="eyebrow text-[10px]">Categories</span>
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
