import { getStudentsWithOverrides, getDepartmentsWithOverrides } from "@/lib/data";
import { getAllSelections, getSeatMatrix, getSubmittedSet } from "@/lib/selections";
import { classify, categoryStyle } from "@/lib/categories";
import { buildUnitBreakdown } from "@/lib/units";
import { UnitBreakdown } from "@/components/UnitBreakdown";

// ISR: revalidate the homepage at most every 15 seconds. Admin edits call
// revalidatePath('/'), so changes show up immediately; CDN serves during
// quiet stretches.
export const revalidate = 15;

export default async function HomePage() {
  const [students, departments, selections, matrix, submittedSet] = await Promise.all([
    getStudentsWithOverrides(),
    getDepartmentsWithOverrides(),
    getAllSelections(),
    getSeatMatrix(),
    getSubmittedSet(),
  ]);

  // Per-department breakdown of finalized students. Derived from the data
  // we already fetched — purely a render-time mapping, no extra DB hit.
  const unitBreakdown = buildUnitBreakdown(
    departments,
    students,
    selections,
    submittedSet,
  );

  const selByRoll = new Map<string, Map<number, string>>();
  for (const s of selections) {
    if (!selByRoll.has(s.roll_no)) selByRoll.set(s.roll_no, new Map());
    selByRoll.get(s.roll_no)!.set(s.rotation, s.department);
  }

  const passes = students.filter((s) => s.overall === "Pass");
  const passesRanked = passes
    .filter((s) => s.rank != null)
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));

  // Only show students with all four rotations confirmed. Drafts stay
  // private until the admin finalizes.
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
      <section className="relative overflow-hidden">
        {/* Decorative geometric shapes — pure flat, no shadows. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-20 h-[28rem] w-[28rem] rounded-full bg-blue-50"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-32 -left-32 h-72 w-72 rounded-full bg-emerald-50"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-20 right-32 h-40 w-40 rotate-12 rounded-2xl bg-amber-100"
        />

        <div className="relative mx-auto max-w-7xl px-4 md:px-6 pt-16 md:pt-24 pb-20 md:pb-28">
          <div className="grid lg:grid-cols-[1.4fr_0.6fr] gap-12 items-center">
            <div>
              <p className="eyebrow-primary">House Officers · 2026 / 27</p>
              <h1 className="mt-5 font-display text-5xl md:text-7xl lg:text-[5.5rem] font-extrabold leading-[1.02] tracking-tight text-[var(--foreground)]">
                The roster,
                <br />
                <span className="text-[var(--primary)]">assigned by merit.</span>
              </h1>
              <p className="mt-7 max-w-2xl text-lg md:text-xl text-[var(--muted-foreground)] leading-relaxed">
                An independent allocation record for the Final Professional
                MBBS class of 2025 — four three-month rotations, finalized
                by the admin team and published transparently as they&apos;re
                confirmed.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <a
                  href="#roster"
                  className="inline-flex items-center gap-2 px-7 py-4 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-strong)] hover:scale-105 transition-all duration-200 font-semibold text-base"
                >
                  View the roster
                  <span aria-hidden>↓</span>
                </a>
                <a
                  href="#matrix"
                  className="inline-flex items-center gap-2 px-7 py-4 rounded-md border-4 border-[var(--foreground)] text-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-[var(--background)] transition-all duration-200 font-semibold text-base"
                >
                  Live seats
                </a>
              </div>
            </div>

            {/* Hero illustration: stacked rotation cards. */}
            <div className="hidden lg:flex flex-col gap-3">
              <HeroRotationCard tone="primary" rotation="R1" period="Jun – Aug" />
              <HeroRotationCard tone="secondary" rotation="R2" period="Sep – Nov" />
              <HeroRotationCard tone="accent" rotation="R3" period="Dec – Feb" />
              <HeroRotationCard tone="dark" rotation="R4" period="Mar – May" />
            </div>
          </div>

          <p className="mt-16 text-sm text-[var(--muted-foreground)]">
            Built by{" "}
            <span className="text-[var(--foreground)] font-semibold">
              Dr. Rabiya Tariq
            </span>{" "}
            &amp;{" "}
            <span className="text-[var(--foreground)] font-semibold">
              Mohammad Taseen Tariq
            </span>
          </p>
        </div>
      </section>

      {/* ─── Stats — multi-color tiles on muted band ─────────────── */}
      <section className="bg-[var(--muted)]">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-20 md:py-24">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <StatTile
              tone="primary"
              label="Eligible"
              value={passes.length.toString()}
              hint="Final Prof Pass"
            />
            <StatTile
              tone="secondary"
              label="Finalized"
              value={fullyAssigned.length.toString()}
              hint="Four rotations locked"
            />
            <StatTile
              tone="accent"
              label="Seats filled"
              value={`${filledSeats} / ${totalSeats}`}
              hint="Across all rotations"
            />
            <StatTile
              tone="dark"
              label="Rotations"
              value="4"
              hint="Three months each"
            />
          </div>
        </div>
      </section>

      {/* ─── Seat matrix ────────────────────────────────────────── */}
      <section id="matrix" className="mx-auto max-w-7xl px-4 md:px-6 py-20 md:py-24">
        <SectionHeader
          eyebrow="Live seat matrix"
          title="Department occupancy"
          subtitle="Filled and available seats per department, per three-month rotation. Updates immediately when the admin saves a placement."
        />

        <div className="mt-10 rounded-lg bg-[var(--background)] overflow-hidden">
          <div className="scrollx">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--muted)]">
                <tr>
                  <th className="text-left px-5 py-4 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    Department
                  </th>
                  <th className="text-center px-3 py-4 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    Cap.
                  </th>
                  <th className="text-center px-3 py-4 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    R1
                    <span className="block text-[10px] font-normal opacity-70 mt-0.5 normal-case tracking-normal">
                      Jun – Aug
                    </span>
                  </th>
                  <th className="text-center px-3 py-4 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    R2
                    <span className="block text-[10px] font-normal opacity-70 mt-0.5 normal-case tracking-normal">
                      Sep – Nov
                    </span>
                  </th>
                  <th className="text-center px-3 py-4 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    R3
                    <span className="block text-[10px] font-normal opacity-70 mt-0.5 normal-case tracking-normal">
                      Dec – Feb
                    </span>
                  </th>
                  <th className="text-center px-3 py-4 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    R4
                    <span className="block text-[10px] font-normal opacity-70 mt-0.5 normal-case tracking-normal">
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
                    <tr key={m.name} className="hover:bg-[var(--muted)]/50 transition-colors">
                      <td className="px-0 py-3.5">
                        <div className="flex items-stretch">
                          <span aria-hidden className={`w-1.5 ${style.bar} rounded-r-sm`} />
                          <div className="pl-5 pr-3 flex flex-col">
                            <span className="text-[var(--foreground)] font-semibold">
                              {m.name}
                            </span>
                            <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                              {style.label}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="text-center px-3 py-3.5 text-[var(--muted-foreground)] font-semibold tabular-nums">
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

      {/* ─── Public roster ─────────────────────────────────────── */}
      <section id="roster" className="bg-[var(--muted)]">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-20 md:py-24">
          <SectionHeader
            eyebrow="Public roster"
            title="Allocations by merit"
            subtitle="Students whose four rotations have been confirmed appear below in merit order. Drafts stay private until the admin finalizes all four placements."
            rightSlot={
              <div className="px-4 py-2 rounded-md bg-[var(--secondary)] text-[var(--secondary-foreground)] text-sm font-semibold inline-flex items-center gap-2">
                <span aria-hidden className="h-2 w-2 rounded-full bg-white" />
                {fullyAssigned.length} finalized
              </div>
            }
          />

          <div className="mt-10 rounded-lg bg-[var(--background)] overflow-hidden">
            <div className="scrollx">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--muted)]">
                  <tr>
                    <th className="text-left px-4 py-4 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      Rank
                    </th>
                    <th className="text-left px-4 py-4 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      Name
                    </th>
                    <th className="text-right px-4 py-4 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      Marks
                    </th>
                    <th className="text-left px-4 py-4 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      R1
                    </th>
                    <th className="text-left px-4 py-4 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      R2
                    </th>
                    <th className="text-left px-4 py-4 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      R3
                    </th>
                    <th className="text-left px-4 py-4 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      R4
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {fullyAssigned.map((s) => {
                    const rotMap = selByRoll.get(s.roll_no)!;
                    const isTop3 = (s.rank ?? 999) <= 3;
                    return (
                      <tr key={s.roll_no} className="hover:bg-[var(--muted)]/50 transition-colors">
                        <td className="px-4 py-3.5">
                          <span
                            className={
                              isTop3
                                ? "inline-flex items-center justify-center w-9 h-7 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] font-bold tabular-nums text-sm"
                                : "text-[var(--muted-foreground)] font-semibold tabular-nums text-sm"
                            }
                          >
                            {s.rank}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-[var(--foreground)] font-medium">
                          {s.name}
                        </td>
                        <td className="px-4 py-3.5 text-right text-[var(--muted-foreground)] font-semibold tabular-nums">
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
                        className="px-4 py-20 text-center text-[var(--muted-foreground)]"
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

          <p className="mt-6 text-sm text-[var(--muted-foreground)] max-w-2xl">
            Need a correction? Contact your roster administrator directly.
          </p>
        </div>
      </section>

      {/* ─── By unit ───────────────────────────────────────────── */}
      <section id="by-unit" className="mx-auto max-w-7xl px-4 md:px-6 py-20 md:py-24">
        <SectionHeader
          eyebrow="By unit"
          title="Who's where"
          subtitle="Every department, broken down by rotation. Click a unit to expand and see the finalized House Officers placed there across all four three-month rotations."
        />
        <div className="mt-10">
          <UnitBreakdown units={unitBreakdown} />
        </div>
      </section>
    </>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  rightSlot,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div>
        <p className="eyebrow-primary">{eyebrow}</p>
        <h2 className="mt-3 font-display text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--foreground)] leading-tight">
          {title}
        </h2>
        <p className="mt-3 max-w-2xl text-base md:text-lg text-[var(--muted-foreground)] leading-relaxed">
          {subtitle}
        </p>
      </div>
      {rightSlot}
    </div>
  );
}

function StatTile({
  tone,
  label,
  value,
  hint,
}: {
  tone: "primary" | "secondary" | "accent" | "dark";
  label: string;
  value: string;
  hint: string;
}) {
  const cls = {
    primary: "bg-[var(--primary)] text-[var(--primary-foreground)]",
    secondary: "bg-[var(--secondary)] text-[var(--secondary-foreground)]",
    accent: "bg-[var(--accent)] text-[var(--accent-foreground)]",
    dark: "bg-[var(--dark)] text-[var(--dark-foreground)]",
  }[tone];
  return (
    <div
      className={`rounded-lg ${cls} p-6 md:p-8 transition-all duration-200 hover:scale-[1.02]`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">
        {label}
      </p>
      <p className="mt-3 font-display text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold tabular-nums tracking-tight leading-none">
        {value}
      </p>
      <p className="mt-3 text-sm opacity-80">{hint}</p>
    </div>
  );
}

function HeroRotationCard({
  tone,
  rotation,
  period,
}: {
  tone: "primary" | "secondary" | "accent" | "dark";
  rotation: string;
  period: string;
}) {
  const cls = {
    primary: "bg-blue-50 text-blue-900",
    secondary: "bg-emerald-50 text-emerald-900",
    accent: "bg-amber-50 text-amber-900",
    dark: "bg-gray-900 text-gray-50",
  }[tone];
  return (
    <div className={`rounded-lg ${cls} px-6 py-5 flex items-center justify-between transition-all duration-200 hover:scale-[1.02]`}>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider opacity-70">
          Rotation
        </p>
        <p className="font-display text-3xl font-extrabold tracking-tight leading-none mt-0.5">
          {rotation}
        </p>
      </div>
      <p className="text-sm font-semibold opacity-80">{period}</p>
    </div>
  );
}

function SeatBadge({ filled, capacity }: { filled: number; capacity: number }) {
  const ratio = capacity === 0 ? 0 : filled / capacity;
  let cls = "bg-emerald-50 text-emerald-700";
  if (ratio >= 1) cls = "bg-red-50 text-red-700";
  else if (ratio >= 0.7) cls = "bg-amber-50 text-amber-700";
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[3.5rem] px-2.5 py-1 rounded-md text-xs font-semibold tabular-nums ${cls}`}
    >
      {filled} / {capacity}
    </span>
  );
}

function DeptChip({ name }: { name: string }) {
  const cat = classify(name);
  const style = categoryStyle[cat];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${style.chip}`}>
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
    <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-semibold text-[var(--muted-foreground)]">
      <span className="uppercase tracking-wider opacity-80">Categories</span>
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
