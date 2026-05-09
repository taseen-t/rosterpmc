import Link from "next/link";
import { getStudentsWithOverrides } from "@/lib/data";
import { getAllSelections, getSeatMatrix } from "@/lib/selections";

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

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 py-8 md:py-10 space-y-10">
      <section className="rounded-2xl bg-gradient-to-br from-teal-600 via-teal-700 to-navy-800 px-6 md:px-10 py-8 md:py-12 text-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-100/90">
              Office of the Medical Superintendent
            </p>
            <h1 className="mt-2 text-2xl md:text-3xl font-semibold leading-tight">
              House Officer Seat Selection{" "}
              <br className="hidden md:block" />
              <span className="text-teal-100">
                Allied Hospital, Faisalabad — 2026-27
              </span>
            </h1>
            <p className="mt-3 text-sm md:text-base text-teal-50/90 max-w-2xl">
              Enter your roll number to choose your four 3-month rotations. Selection is
              first-come-first-served by merit and final once submitted.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-white text-teal-700 px-4 py-2.5 font-medium hover:bg-teal-50"
            >
              Start selection
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
        </div>

        <dl className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <Stat label="Eligible students" value={passes.length.toString()} />
          <Stat label="Departments" value={matrix.length.toString()} />
          <Stat label="Seats / year" value={totalSeats.toString()} />
          <Stat label="Seats filled" value={`${filledSeats} / ${totalSeats}`} />
        </dl>
      </section>

      <section>
        <SectionHeader
          title="Live seat matrix"
          subtitle="Filled vs available seats per department per rotation. Updates in real time as students submit."
        />
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="scrollx">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Department</th>
                  <th className="text-center px-3 py-3 font-medium">Cap.</th>
                  <th className="text-center px-3 py-3 font-medium">
                    R1
                    <br />
                    <span className="text-[10px] font-normal text-slate-400">
                      Jun-Aug
                    </span>
                  </th>
                  <th className="text-center px-3 py-3 font-medium">
                    R2
                    <br />
                    <span className="text-[10px] font-normal text-slate-400">
                      Sep-Nov
                    </span>
                  </th>
                  <th className="text-center px-3 py-3 font-medium">
                    R3
                    <br />
                    <span className="text-[10px] font-normal text-slate-400">
                      Dec-Feb
                    </span>
                  </th>
                  <th className="text-center px-3 py-3 font-medium">
                    R4
                    <br />
                    <span className="text-[10px] font-normal text-slate-400">
                      Mar-May
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matrix.map((m) => (
                  <tr key={m.name} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{m.name}</td>
                    <td className="text-center px-3 py-2.5 text-slate-500">
                      {m.capacity}
                    </td>
                    {m.byRotation.map((r) => (
                      <td key={r.rotation} className="text-center px-3 py-2.5">
                        <SeatBadge filled={r.filled} capacity={m.capacity} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section>
        <SectionHeader
          title="Live allocation roster"
          subtitle="Public list of every passed candidate with their submitted rotations. Empty cells mean the student has not yet selected."
        />
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="scrollx">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-3 py-3 font-medium">#</th>
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
                  return (
                    <tr key={s.roll_no} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2.5 text-slate-500 font-mono">{s.rank}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-700">
                        {s.roll_no}
                      </td>
                      <td className="px-3 py-2.5 text-slate-900">{s.name}</td>
                      <td className="px-3 py-2.5 text-right text-slate-600 tabular-nums">
                        {s.total ?? "—"}
                      </td>
                      {[1, 2, 3, 4].map((r) => (
                        <td key={r} className="px-3 py-2.5 text-slate-700">
                          {rotMap?.get(r) ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 text-xs ring-1 ring-teal-100">
                              {rotMap.get(r)}
                            </span>
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

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg md:text-xl font-semibold text-slate-900">{title}</h2>
      <p className="text-sm text-slate-500 mt-0.5 max-w-2xl">{subtitle}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/10 ring-1 ring-white/15 px-4 py-3 backdrop-blur">
      <dt className="text-[11px] uppercase tracking-wider text-teal-100/80">
        {label}
      </dt>
      <dd className="mt-0.5 text-xl font-semibold text-white tabular-nums">{value}</dd>
    </div>
  );
}

function SeatBadge({ filled, capacity }: { filled: number; capacity: number }) {
  const ratio = capacity === 0 ? 0 : filled / capacity;
  let cls = "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (ratio >= 1) cls = "bg-rose-50 text-rose-700 ring-rose-100";
  else if (ratio >= 0.7) cls = "bg-amber-50 text-amber-700 ring-amber-100";
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[3.25rem] gap-1 px-2 py-0.5 rounded-md text-xs ring-1 ${cls} tabular-nums`}
    >
      {filled} / {capacity}
    </span>
  );
}
