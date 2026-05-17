import type { UnitBreakdownRow, UnitStudent } from "@/lib/units";
import { categoryStyle } from "@/lib/categories";

/**
 * Per-unit allocation tables, in the format used by the official roster
 * document: centered unit name, then a single 9-column table where each
 * row counts as Sr. No., paired with (Merit No., Name) for each of the
 * four rotations. Each rotation column is independently sorted by merit
 * rank — row #1 across columns is *not* the same student, just the
 * top-ranked person assigned to this unit in each rotation.
 *
 * Wrapped in <details>/<summary> per-unit so 39 tables don't all
 * unfold at once; the summary acts as the centered formal header and
 * also the click target.
 */
export function UnitBreakdown({ units }: { units: UnitBreakdownRow[] }) {
  return (
    <div className="space-y-6">
      {units.map((u) => (
        <UnitTable key={u.name} unit={u} />
      ))}
      {units.length === 0 && (
        <div className="rounded-lg bg-[var(--background)] border border-[var(--border)] px-5 py-8 text-center text-[var(--muted-foreground)] text-sm">
          No departments configured.
        </div>
      )}
    </div>
  );
}

function UnitTable({ unit }: { unit: UnitBreakdownRow }) {
  const style = categoryStyle[unit.category];
  const totalSeats = unit.capacity * 4;
  // Match the screenshot's row pattern: as many rows as the rotation
  // with the most students. Empty cells where a rotation has fewer.
  const maxRows = Math.max(
    0,
    ...unit.byRotation.map((r) => r.students.length),
  );

  return (
    <details className="group rounded-lg bg-[var(--background)] border border-[var(--border)] overflow-hidden">
      <summary className="cursor-pointer list-none relative px-6 py-6 hover:bg-[var(--muted)]/40 transition-colors text-center">
        {/* Subtle category bar pinned to the top of the card. */}
        <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${style.bar}`} />

        <h3 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
          {unit.name}
        </h3>
        <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          {style.label} · {unit.totalFinalized} of {totalSeats} finalized
        </p>

        {/* Bottom-right chevron — small, rotates open. */}
        <span
          aria-hidden
          className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] transition-transform duration-200 group-open:rotate-180"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </summary>

      <div className="border-t border-[var(--border)] scrollx">
        {maxRows === 0 ? (
          <p className="px-6 py-10 text-center text-[var(--muted-foreground)] text-sm">
            No finalized placements yet.
          </p>
        ) : (
          <AllocationTable unit={unit} maxRows={maxRows} />
        )}
      </div>
    </details>
  );
}

function AllocationTable({
  unit,
  maxRows,
}: {
  unit: UnitBreakdownRow;
  maxRows: number;
}) {
  return (
    <table className="min-w-full border-collapse text-sm">
      <thead>
        <tr className="bg-[var(--muted)] text-[var(--muted-foreground)]">
          <th className="border border-[var(--border)] px-3 py-3 text-xs font-semibold uppercase tracking-wider text-center">
            Sr. No.
          </th>
          {[1, 2, 3, 4].map((rot) => (
            <RotationHeadGroup key={rot} rotation={rot} />
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: maxRows }, (_, i) => (
          <AllocationRow
            key={i}
            srNo={i + 1}
            rows={unit.byRotation.map((r) => r.students[i])}
          />
        ))}
      </tbody>
    </table>
  );
}

const ORDINAL: Record<number, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
  4: "4th",
};

function RotationHeadGroup({ rotation }: { rotation: number }) {
  return (
    <>
      <th className="border border-[var(--border)] px-3 py-3 text-xs font-semibold uppercase tracking-wider text-center">
        Merit No.
      </th>
      <th className="border border-[var(--border)] px-3 py-3 text-xs font-semibold uppercase tracking-wider text-left whitespace-nowrap">
        {ORDINAL[rotation]} Rotation
      </th>
    </>
  );
}

function AllocationRow({
  srNo,
  rows,
}: {
  srNo: number;
  rows: (UnitStudent | undefined)[];
}) {
  return (
    <tr className="hover:bg-[var(--muted)]/40 transition-colors">
      <td className="border border-[var(--border)] px-3 py-2.5 text-center font-semibold tabular-nums text-[var(--muted-foreground)]">
        {srNo}
      </td>
      {rows.map((s, i) => (
        <RotationCells key={i} student={s} />
      ))}
    </tr>
  );
}

function RotationCells({ student }: { student: UnitStudent | undefined }) {
  if (!student) {
    return (
      <>
        <td className="border border-[var(--border)] px-3 py-2.5" />
        <td className="border border-[var(--border)] px-3 py-2.5" />
      </>
    );
  }
  return (
    <>
      <td className="border border-[var(--border)] px-3 py-2.5 text-center font-semibold tabular-nums text-[var(--foreground)]">
        {student.rank ?? "—"}
      </td>
      <td className="border border-[var(--border)] px-3 py-2.5 text-[var(--foreground)] whitespace-nowrap">
        {student.name}
      </td>
    </>
  );
}
