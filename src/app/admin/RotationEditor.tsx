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
    <tr>
      <td colSpan={7} className="px-5 py-6 bg-[var(--muted)]/60 border-t-2 border-[var(--accent)]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
            <span className="eyebrow-accent">Rotations · {student.name}</span>
            {locked && (
              <span className="inline-flex items-center gap-2 px-2 py-1 bg-[var(--accent)] text-[var(--accent-foreground)] text-[10px] uppercase tracking-widest font-bold">
                ● Finalized
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
            <div className="border-2 border-[var(--rose)] px-4 py-2.5 text-sm text-[var(--rose)] uppercase tracking-wider font-bold">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {locked ? (
              <>
                <button
                  type="button"
                  onClick={unlock}
                  disabled={pending}
                  className="px-5 py-3 border-2 border-[var(--foreground)] text-[var(--foreground)] uppercase tracking-tighter font-bold text-sm hover:bg-[var(--foreground)] hover:text-[var(--background)] transition-colors disabled:opacity-50"
                >
                  Unlock to edit
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={pending}
                  className="px-3 py-3 text-[var(--rose)] uppercase tracking-widest font-bold text-xs hover:text-[var(--foreground)] disabled:opacity-50"
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
                  className="px-5 py-3 bg-[var(--foreground)] text-[var(--background)] uppercase tracking-tighter font-bold text-sm hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[var(--foreground)] disabled:hover:text-[var(--background)]"
                >
                  {pending ? "Saving…" : "Save draft"}
                </button>
                <button
                  type="button"
                  onClick={finalize}
                  disabled={pending}
                  className="px-5 py-3 bg-[var(--accent)] text-[var(--accent-foreground)] uppercase tracking-tighter font-bold text-sm hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                >
                  Finalize
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={pending}
                  className="px-3 py-3 text-[var(--muted-foreground)] uppercase tracking-widest font-bold text-xs hover:text-[var(--foreground)] disabled:opacity-50"
                >
                  Clear
                </button>
                {saved === "saved" && (
                  <span className="text-xs uppercase tracking-widest font-bold text-[var(--emerald)]">
                    Saved.
                  </span>
                )}
                {dirty && (
                  <span className="text-xs uppercase tracking-widest text-[var(--accent)]">
                    Unsaved
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
      <div className="flex items-baseline justify-between mb-2">
        <span className="eyebrow text-[10px]">{label}</span>
        <span className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
          {period}
        </span>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full border-2 border-[var(--border-strong)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] uppercase tracking-tight font-bold focus:border-[var(--accent)] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
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
              : `${remaining} / ${d.capacity}`;
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
