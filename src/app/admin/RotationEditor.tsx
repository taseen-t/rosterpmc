"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adminSetStudentRotations,
  adminFinalizeStudent,
  adminUnlockStudent,
  adminResetStudent,
} from "@/app/actions";

export type RotationEditorStudent = {
  roll_no: string;
  name: string;
  rank: number | null;
  submitted: boolean;
  picks: { rotation: number; department: string }[];
};

export type DepartmentLoad = {
  name: string;
  capacity: number;
  // For each rotation: how many seats are currently taken (across all
  // students — INCLUDING this row's existing picks). The editor backs
  // those out for its own row so re-saving the same picks isn't blocked.
  filled: number[];
};

type Props = {
  student: RotationEditorStudent;
  departments: DepartmentLoad[];
};

const ROTATION_LABELS: Record<number, string> = {
  1: "Jun – Aug",
  2: "Sep – Nov",
  3: "Dec – Feb",
  4: "Mar – May",
};

/**
 * Renders four rotation cells for one student plus the finalize/unlock
 * controls. Capacity is checked live: a department option is disabled
 * for a rotation when that rotation is full (excluding the student's
 * own current pick), and disabled across other rotations once already
 * chosen here.
 */
export function RotationEditor({ student, departments }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<"idle" | "saved">("idle");

  const initialByRotation = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of student.picks) m.set(p.rotation, p.department);
    return m;
  }, [student.picks]);

  // Local edits live in state until the admin clicks Save.
  const [draft, setDraft] = useState<Record<number, string>>(() => ({
    1: initialByRotation.get(1) ?? "",
    2: initialByRotation.get(2) ?? "",
    3: initialByRotation.get(3) ?? "",
    4: initialByRotation.get(4) ?? "",
  }));

  const dirty =
    draft[1] !== (initialByRotation.get(1) ?? "") ||
    draft[2] !== (initialByRotation.get(2) ?? "") ||
    draft[3] !== (initialByRotation.get(3) ?? "") ||
    draft[4] !== (initialByRotation.get(4) ?? "");

  // Existing picks for this student, by rotation → department.
  // Used to back out their own seat count when computing "is this full?"
  const ownByRotation = initialByRotation;

  function effectivelyFull(rotation: number, deptName: string): boolean {
    const d = departments.find((x) => x.name === deptName);
    if (!d) return false;
    const own = ownByRotation.get(rotation) === deptName ? 1 : 0;
    const otherFilled = (d.filled[rotation - 1] ?? 0) - own;
    return otherFilled >= d.capacity;
  }

  function chosenElsewhere(rotation: number, deptName: string): boolean {
    for (let r = 1; r <= 4; r++) {
      if (r === rotation) continue;
      if (draft[r] === deptName) return true;
    }
    return false;
  }

  function pickedCount(): number {
    return [1, 2, 3, 4].filter((r) => draft[r]).length;
  }

  function save() {
    setError(null);
    setSaved("idle");
    const picks = [1, 2, 3, 4]
      .filter((r) => draft[r])
      .map((r) => ({ rotation: r, department: draft[r] }));
    if (picks.length !== 4) {
      setError("Pick all four rotations before saving.");
      return;
    }
    start(async () => {
      const r = await adminSetStudentRotations({
        roll: student.roll_no,
        picks,
      });
      if (r?.error) {
        setError(r.error);
        return;
      }
      setSaved("saved");
      setTimeout(() => setSaved("idle"), 1800);
      router.refresh();
    });
  }

  function finalize() {
    setError(null);
    const count = pickedCount();
    if (count < 4) {
      const ok = confirm(
        `Only ${count} of 4 rotations are picked. Finalize anyway?\n\nFinalizing locks the student. You can unlock later if needed.\n\nClick OK to finalize as-is, or Cancel to fill the remaining cells first.`,
      );
      if (!ok) return;
    }
    start(async () => {
      // Save first if there are unsaved changes — but only if we have
      // four picks, since the server only accepts full sets.
      if (dirty && count === 4) {
        const r = await adminSetStudentRotations({
          roll: student.roll_no,
          picks: [1, 2, 3, 4].map((r) => ({
            rotation: r,
            department: draft[r],
          })),
        });
        if (r?.error) {
          setError(r.error);
          return;
        }
      }
      const f = await adminFinalizeStudent(student.roll_no);
      if (f?.error) {
        setError(f.error);
        return;
      }
      router.refresh();
    });
  }

  function unlock() {
    start(async () => {
      await adminUnlockStudent(student.roll_no);
      router.refresh();
    });
  }

  function clearAll() {
    if (!confirm("Clear all four picks for this student? Their finalization will also be removed.")) {
      return;
    }
    start(async () => {
      await adminResetStudent(student.roll_no);
      setDraft({ 1: "", 2: "", 3: "", 4: "" });
      router.refresh();
    });
  }

  const locked = student.submitted;

  return (
    <tr className="align-top">
      <td colSpan={7} className="px-4 py-5 bg-[var(--muted)]/40 border-t border-[var(--border)]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="eyebrow">Rotations · {student.name}</span>
            {locked && (
              <span className="inline-flex items-center gap-1.5 text-[11px] tracking-wide text-[var(--accent)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                Finalized
              </span>
            )}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((rot) => (
              <RotationCell
                key={rot}
                rotation={rot}
                label={`Rotation ${rot}`}
                period={ROTATION_LABELS[rot]}
                value={draft[rot]}
                onChange={(v) => setDraft((d) => ({ ...d, [rot]: v }))}
                disabled={locked || pending}
                departments={departments}
                effectivelyFull={(d) => effectivelyFull(rot, d)}
                chosenElsewhere={(d) => chosenElsewhere(rot, d)}
              />
            ))}
          </div>

          {error && (
            <div className="rounded-md bg-[var(--rose-soft)] border border-[var(--rose)]/30 px-3 py-2 text-sm text-[var(--rose)]">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {locked ? (
              <>
                <button
                  type="button"
                  onClick={unlock}
                  disabled={pending}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[var(--foreground)] text-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-[var(--background)] text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Unlock to edit
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={pending}
                  className="px-3 py-2 rounded-md text-[var(--rose)] hover:bg-[var(--rose-soft)] text-sm transition-colors disabled:opacity-50"
                >
                  Clear all picks
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={save}
                  disabled={pending || !dirty || pickedCount() !== 4}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[var(--foreground)] text-[var(--background)] hover:bg-[var(--accent)] text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {pending ? "Saving…" : "Save draft"}
                </button>
                <button
                  type="button"
                  onClick={finalize}
                  disabled={pending}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Finalize
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={pending}
                  className="px-3 py-2 rounded-md text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] text-sm transition-colors disabled:opacity-50"
                >
                  Clear
                </button>
                {saved === "saved" && (
                  <span className="text-xs text-[var(--emerald)]">Saved.</span>
                )}
                {dirty && (
                  <span className="text-xs text-[var(--muted-foreground)] italic">
                    Unsaved changes.
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

function RotationCell({
  rotation,
  label,
  period,
  value,
  onChange,
  disabled,
  departments,
  effectivelyFull,
  chosenElsewhere,
}: {
  rotation: number;
  label: string;
  period: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  departments: DepartmentLoad[];
  effectivelyFull: (deptName: string) => boolean;
  chosenElsewhere: (deptName: string) => boolean;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="eyebrow text-[10px]">{label}</span>
        <span className="text-[10px] text-[var(--muted-foreground)] font-mono-label tracking-wide">
          {period}
        </span>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <option value="">— None —</option>
        {departments.map((d) => {
          const full = effectivelyFull(d.name);
          const elsewhere = chosenElsewhere(d.name);
          const own = d.filled[rotation - 1] ?? 0;
          const otherFilled = own - (value === d.name ? 1 : 0);
          const remaining = Math.max(0, d.capacity - otherFilled);
          const blocked = full || elsewhere;
          const suffix = elsewhere
            ? "— already chosen"
            : full
              ? "— full"
              : `${remaining} left of ${d.capacity}`;
          return (
            <option
              key={d.name}
              value={d.name}
              disabled={blocked && value !== d.name}
            >
              {d.name} · {suffix}
            </option>
          );
        })}
      </select>
    </label>
  );
}
