import type { UnitBreakdownRow, UnitStudent } from "@/lib/units";
import { categoryStyle } from "@/lib/categories";

/**
 * Per-unit accordion view: every department gets a row, click to expand
 * into its four-rotation roster. Uses native <details>/<summary> so it
 * works without JS — important since this is rendered as a server
 * component and we don't want to ship state for purely-display content.
 *
 * Each finalized student in the expanded panel shows their merit rank,
 * name, roll number, and a tiny 4-cell rotation strip with the rotation
 * that placed them in *this* unit highlighted in the unit's category color.
 */
export function UnitBreakdown({ units }: { units: UnitBreakdownRow[] }) {
  return (
    <div className="rounded-lg bg-[var(--background)] border border-[var(--border)] overflow-hidden divide-y divide-[var(--border)]">
      {units.map((u) => (
        <UnitRow key={u.name} unit={u} />
      ))}
      {units.length === 0 && (
        <div className="px-5 py-8 text-center text-[var(--muted-foreground)] text-sm">
          No departments configured.
        </div>
      )}
    </div>
  );
}

function UnitRow({ unit }: { unit: UnitBreakdownRow }) {
  const style = categoryStyle[unit.category];
  const totalSeats = unit.capacity * 4;
  const fillRatio = totalSeats === 0 ? 0 : unit.totalFinalized / totalSeats;
  return (
    <details className="group">
      <summary className="cursor-pointer flex flex-wrap items-center gap-3 md:gap-4 px-4 md:px-5 py-4 hover:bg-[var(--muted)]/40 transition-colors list-none">
        {/* category bar */}
        <span aria-hidden className={`w-1.5 self-stretch ${style.bar} rounded-r-sm`} />

        {/* unit name + category eyebrow */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span className="font-semibold text-[var(--foreground)]">
              {unit.name}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              {style.label}
            </span>
          </div>
        </div>

        {/* fill summary */}
        <span
          className={`text-xs font-semibold tabular-nums px-2.5 py-1 rounded-md ${
            fillRatio >= 1
              ? "bg-emerald-50 text-emerald-700"
              : fillRatio >= 0.5
                ? "bg-blue-50 text-blue-700"
                : "bg-gray-100 text-gray-600"
          }`}
        >
          {unit.totalFinalized} / {totalSeats} finalized
        </span>

        {/* chevron */}
        <span
          aria-hidden
          className="text-[var(--muted-foreground)] transition-transform duration-200 group-open:rotate-180"
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

      <div className="px-4 md:px-5 pb-6 pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-[var(--muted)]/30">
        {unit.byRotation.map(({ rotation, students }) => (
          <RotationColumn
            key={rotation}
            rotation={rotation}
            students={students}
            capacity={unit.capacity}
            unitName={unit.name}
          />
        ))}
      </div>
    </details>
  );
}

const ROTATION_PERIODS: Record<number, string> = {
  1: "Jun – Aug",
  2: "Sep – Nov",
  3: "Dec – Feb",
  4: "Mar – May",
};

function RotationColumn({
  rotation,
  students,
  capacity,
  unitName,
}: {
  rotation: number;
  students: UnitStudent[];
  capacity: number;
  unitName: string;
}) {
  return (
    <div className="rounded-md bg-[var(--background)] p-4 border border-[var(--border)]">
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--primary)]">
          Rotation {rotation}
        </p>
        <p className="text-[10px] font-medium text-[var(--muted-foreground)] tabular-nums">
          {students.length} / {capacity}
        </p>
      </div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)] mb-3">
        {ROTATION_PERIODS[rotation]}
      </p>

      {students.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">—</p>
      ) : (
        <ul className="space-y-3">
          {students.map((s) => (
            <StudentCard
              key={s.roll_no}
              student={s}
              currentUnit={unitName}
              currentRotation={rotation}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function StudentCard({
  student,
  currentUnit,
  currentRotation,
}: {
  student: UnitStudent;
  currentUnit: string;
  currentRotation: number;
}) {
  return (
    <li className="space-y-1.5">
      <div className="flex items-baseline gap-2">
        <span className="inline-flex items-center justify-center min-w-[1.75rem] h-5 px-1.5 rounded text-[10px] font-bold tabular-nums bg-[var(--muted)] text-[var(--foreground)]">
          {student.rank ?? "—"}
        </span>
        <span className="text-sm font-medium text-[var(--foreground)] leading-tight">
          {student.name}
        </span>
      </div>
      <p className="text-[10px] font-mono text-[var(--muted-foreground)] pl-9">
        {student.roll_no}
      </p>
      <RotationStrip
        rotations={student.rotations}
        currentUnit={currentUnit}
        currentRotation={currentRotation}
      />
    </li>
  );
}

/**
 * Tiny strip showing the student's full 4-rotation lineup. The rotation
 * cell that lands them in the unit currently being viewed gets the
 * unit-category color treatment; the others are muted. Helps the reader
 * see context at a glance without having to look the student up elsewhere.
 */
function RotationStrip({
  rotations,
  currentUnit,
  currentRotation,
}: {
  rotations: Record<number, string>;
  currentUnit: string;
  currentRotation: number;
}) {
  return (
    <div className="pl-9 flex gap-1">
      {[1, 2, 3, 4].map((rot) => {
        const dept = rotations[rot];
        const isCurrent = rot === currentRotation;
        const matchesUnit = dept === currentUnit;
        return (
          <div
            key={rot}
            className={`flex-1 min-w-0 rounded px-1.5 py-1 text-[9px] leading-tight ${
              isCurrent
                ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : matchesUnit
                  ? "bg-blue-50 text-blue-700"
                  : "bg-[var(--muted)] text-[var(--muted-foreground)]"
            }`}
            title={dept ? `R${rot}: ${dept}` : `R${rot}: —`}
          >
            <p className="font-bold opacity-90">R{rot}</p>
            <p className="truncate font-medium" title={dept ?? ""}>
              {dept ?? "—"}
            </p>
          </div>
        );
      })}
    </div>
  );
}
