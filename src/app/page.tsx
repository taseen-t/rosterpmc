import { getStudentsWithOverrides, getDepartmentsWithOverrides } from "@/lib/data";
import { getAllSelections, getSeatMatrix } from "@/lib/selections";
import { classify, categoryStyle } from "@/lib/categories";
import { LandingMarquees } from "./LandingMarquees";

// ISR: revalidate the homepage at most every 15 seconds. Admin edits call
// revalidatePath('/'), so changes show up immediately; the CDN serves the
// page during quiet stretches.
export const revalidate = 15;

export default async function HomePage() {
  const [students, departments, selections, matrix] = await Promise.all([
    getStudentsWithOverrides(),
    getDepartmentsWithOverrides(),
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

  // Only show students whose four rotations are confirmed. Drafts and
  // partial assignments stay private until the admin finalizes.
  const fullyAssigned = passesRanked.filter((s) => {
    const m = selByRoll.get(s.roll_no);
    return m && m.size === 4;
  });

  const totalSeats = matrix.reduce((acc, m) => acc + m.capacity * 4, 0);
  const filledSeats = matrix.reduce(
    (acc, m) => acc + m.byRotation.reduce((a, r) => a + r.filled, 0),
    0,
  );

  // Department-name marquee feed — uppercased once on the server.
  const deptMarqueeItems = departments.map((d) => d.name.toUpperCase());

  // Stats marquee feed — comma-separated big-number flashes.
  const statsMarqueeItems = [
    `${passes.length} STUDENTS`,
    `${totalSeats} SEATS`,
    `${departments.length} DEPARTMENTS`,
    "4 ROTATIONS",
    "12 MONTHS",
    "ALLIED HOSPITAL",
    "FAISALABAD",
    "2026 — 2027",
  ];

  const ldJson = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Roster · FMU",
    url: "https://rosterpmc.vercel.app",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Any",
    description:
      "Independent allocation portal for FMU House Officers (2026-27). Four three-month rotations, assigned by merit, published live.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }}
      />

      {/* ─── Hero ──────────────────────────────────────────────────── */}
      <section className="relative">
        <div className="mx-auto max-w-[95vw] px-4 md:px-6 pt-16 md:pt-24 pb-20">
          <p className="eyebrow-accent">House Officers · 2026 / 27</p>
          <h1 className="mt-4 font-display font-bold uppercase tracking-tighter leading-[0.85] text-[var(--foreground)] text-[clamp(3rem,12vw,12rem)]">
            Roster
            <br />
            <span className="text-[var(--accent)]">2026 / 27.</span>
            <br />
            Assigned
            <br />
            by merit.
          </h1>

          <div className="mt-12 grid md:grid-cols-[1.4fr_0.6fr] gap-8 items-end">
            <p className="text-lg md:text-2xl text-[var(--muted-foreground)] leading-tight max-w-2xl">
              An independent allocation record for the Final Professional MBBS
              class of 2025 — four three-month rotations, assigned and
              finalized by the admin team, published live as they&apos;re
              confirmed.
            </p>
            <a
              href="#roster"
              className="inline-flex items-center justify-between gap-6 px-6 py-5 bg-[var(--foreground)] text-[var(--background)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] transition-colors uppercase tracking-tighter font-bold text-lg md:text-xl"
            >
              View the roster
              <span aria-hidden className="text-2xl">↓</span>
            </a>
          </div>

          <p className="mt-16 text-xs md:text-sm uppercase tracking-widest text-[var(--muted-foreground)]">
            Built by{" "}
            <span className="text-[var(--foreground)] font-bold">
              Dr. Rabiya Tariq
            </span>{" "}
            &amp;{" "}
            <span className="text-[var(--foreground)] font-bold">
              Mohammad Taseen Tariq
            </span>
          </p>
        </div>
      </section>

      {/* ─── Stats marquee + dept marquee ─────────────────────────── */}
      <LandingMarquees stats={statsMarqueeItems} departments={deptMarqueeItems} />

      {/* ─── Big stats grid ─────────────────────────────────────── */}
      <section className="mx-auto max-w-[95vw] px-4 md:px-6 py-24 md:py-32">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--border)] border-2 border-[var(--border)]">
          <BigStat label="Eligible" value={passes.length.toString()} />
          <BigStat label="Finalized" value={fullyAssigned.length.toString()} />
          <BigStat label="Seats filled" value={`${filledSeats}/${totalSeats}`} />
          <BigStat label="Rotations" value="4" />
        </div>
      </section>

      {/* ─── Seat matrix ────────────────────────────────────────── */}
      <section className="mx-auto max-w-[95vw] px-4 md:px-6 pb-24 md:pb-32">
        <div className="flex flex-wrap items-baseline justify-between gap-4 mb-8">
          <p className="eyebrow-accent">Live seat matrix</p>
          <p className="eyebrow">{matrix.length} departments</p>
        </div>
        <h2 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold uppercase tracking-tighter leading-[0.85] text-[var(--foreground)]">
          Department
          <br />
          Occupancy.
        </h2>
        <p className="mt-6 max-w-2xl text-lg md:text-xl text-[var(--muted-foreground)] leading-tight">
          Filled and available seats per department, per three-month rotation.
          Updates immediately when the admin saves a placement.
        </p>

        <div className="mt-12 border-2 border-[var(--border)] overflow-hidden">
          <div className="scrollx">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--muted)] eyebrow">
                <tr>
                  <th className="text-left px-5 py-5 font-bold uppercase tracking-widest">Department</th>
                  <th className="text-center px-3 py-5 font-bold uppercase tracking-widest">Cap.</th>
                  <th className="text-center px-3 py-5 font-bold uppercase tracking-widest">
                    R1
                    <span className="block text-[9px] opacity-60 mt-1 normal-case tracking-wider">
                      Jun–Aug
                    </span>
                  </th>
                  <th className="text-center px-3 py-5 font-bold uppercase tracking-widest">
                    R2
                    <span className="block text-[9px] opacity-60 mt-1 normal-case tracking-wider">
                      Sep–Nov
                    </span>
                  </th>
                  <th className="text-center px-3 py-5 font-bold uppercase tracking-widest">
                    R3
                    <span className="block text-[9px] opacity-60 mt-1 normal-case tracking-wider">
                      Dec–Feb
                    </span>
                  </th>
                  <th className="text-center px-3 py-5 font-bold uppercase tracking-widest">
                    R4
                    <span className="block text-[9px] opacity-60 mt-1 normal-case tracking-wider">
                      Mar–May
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-[var(--border)]">
                {matrix.map((m) => {
                  const cat = classify(m.name);
                  const style = categoryStyle[cat];
                  return (
                    <tr key={m.name} className="hover:bg-[var(--muted)] transition-colors">
                      <td className="px-0 py-4">
                        <div className="flex items-stretch">
                          <span aria-hidden className={`w-1 ${style.bar}`} />
                          <div className="pl-5 pr-3 flex flex-col">
                            <span className="text-[var(--foreground)] uppercase tracking-tight font-bold">
                              {m.name}
                            </span>
                            <span className="eyebrow mt-1.5 text-[10px]">
                              {style.label}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="text-center px-3 py-4 text-[var(--muted-foreground)] font-bold tabular-nums">
                        {m.capacity}
                      </td>
                      {m.byRotation.map((r) => (
                        <td key={r.rotation} className="text-center px-3 py-4">
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

      {/* ─── Public roster ─────────────────────────────────────── */}
      <section id="roster" className="mx-auto max-w-[95vw] px-4 md:px-6 pb-24 md:pb-32">
        <div className="flex flex-wrap items-baseline justify-between gap-4 mb-8">
          <p className="eyebrow-accent">Public roster</p>
          <p className="eyebrow">{fullyAssigned.length} finalized</p>
        </div>
        <h2 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold uppercase tracking-tighter leading-[0.85] text-[var(--foreground)]">
          Allocations
          <br />
          by <span className="text-[var(--accent)]">merit.</span>
        </h2>
        <p className="mt-6 max-w-2xl text-lg md:text-xl text-[var(--muted-foreground)] leading-tight">
          Students whose four rotations have been confirmed appear below in
          merit order. Drafts stay private until the admin finalizes all four
          placements.
        </p>

        <div className="mt-12 border-2 border-[var(--border)] overflow-hidden">
          <div className="scrollx">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--muted)] eyebrow">
                <tr>
                  <th className="text-left px-4 py-5 font-bold uppercase tracking-widest">Rank</th>
                  <th className="text-left px-4 py-5 font-bold uppercase tracking-widest">Name</th>
                  <th className="text-right px-4 py-5 font-bold uppercase tracking-widest">Marks</th>
                  <th className="text-left px-4 py-5 font-bold uppercase tracking-widest">R1</th>
                  <th className="text-left px-4 py-5 font-bold uppercase tracking-widest">R2</th>
                  <th className="text-left px-4 py-5 font-bold uppercase tracking-widest">R3</th>
                  <th className="text-left px-4 py-5 font-bold uppercase tracking-widest">R4</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-[var(--border)]">
                {fullyAssigned.map((s) => {
                  const rotMap = selByRoll.get(s.roll_no)!;
                  const isTop3 = (s.rank ?? 999) <= 3;
                  return (
                    <tr key={s.roll_no} className="hover:bg-[var(--muted)] transition-colors">
                      <td className="px-4 py-4">
                        <span
                          className={
                            isTop3
                              ? "inline-flex items-center justify-center w-9 h-7 bg-[var(--accent)] text-[var(--accent-foreground)] font-bold tabular-nums text-sm"
                              : "text-[var(--muted-foreground)] font-bold tabular-nums text-sm"
                          }
                        >
                          {s.rank}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-[var(--foreground)]">
                        {s.name}
                      </td>
                      <td className="px-4 py-4 text-right text-[var(--muted-foreground)] font-bold tabular-nums">
                        {s.total ?? "—"}
                      </td>
                      {[1, 2, 3, 4].map((r) => (
                        <td key={r} className="px-4 py-4">
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
                      className="px-4 py-20 text-center text-[var(--muted-foreground)] uppercase tracking-widest text-sm"
                    >
                      No rosters published yet. Students will appear here once
                      the admin confirms all four rotations.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-8 text-xs md:text-sm uppercase tracking-widest text-[var(--muted-foreground)] max-w-2xl">
          Need a correction? Contact your roster administrator directly.
        </p>
      </section>
    </>
  );
}

function BigStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--background)] px-6 md:px-10 py-10 md:py-14">
      <p className="eyebrow">{label}</p>
      <p className="mt-4 font-display text-5xl md:text-7xl lg:text-[6rem] font-bold uppercase tracking-tighter text-[var(--foreground)] tabular-nums leading-[0.85]">
        {value}
      </p>
    </div>
  );
}

function SeatBadge({ filled, capacity }: { filled: number; capacity: number }) {
  const ratio = capacity === 0 ? 0 : filled / capacity;
  let cls = "border-[var(--emerald)] text-[var(--emerald)]";
  if (ratio >= 1) cls = "border-[var(--rose)] text-[var(--rose)] bg-[var(--rose)]/10";
  else if (ratio >= 0.7) cls = "border-[var(--amber)] text-[var(--amber)]";
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[3.5rem] px-2.5 py-1 border-2 text-xs font-bold tabular-nums ${cls}`}
    >
      {filled} / {capacity}
    </span>
  );
}

function DeptChip({ name }: { name: string }) {
  const cat = classify(name);
  const style = categoryStyle[cat];
  return (
    <span className={`inline-flex items-center gap-2 px-2.5 py-1 border-2 text-xs uppercase tracking-tight font-bold ${style.chip}`}>
      <span aria-hidden className={`h-2 w-2 ${style.bar}`} />
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
    <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-widest text-[var(--muted-foreground)]">
      <span className="eyebrow text-[10px]">Categories</span>
      {cats.map((c) => {
        const s = categoryStyle[c];
        return (
          <span key={c} className="inline-flex items-center gap-2">
            <span aria-hidden className={`h-2.5 w-2.5 ${s.bar}`} />
            <span>{s.label}</span>
          </span>
        );
      })}
    </div>
  );
}
