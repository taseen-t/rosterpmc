"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { submit } from "@/app/actions";
import type { SeatMatrixRow } from "@/lib/selections";

type Props = {
  rotations: { n: number; label: string; dates: string }[];
  matrix: SeatMatrixRow[];
  existing: { rotation: number; department: string }[];
};

export function SelectForm({ rotations, matrix }: Props) {
  const [picks, setPicks] = useState<Record<number, string>>({});
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  const pickedDepts = useMemo(
    () => new Set(Object.values(picks).filter(Boolean)),
    [picks],
  );
  const allFour = rotations.every((r) => picks[r.n]);
  const distinct = pickedDepts.size === Object.values(picks).filter(Boolean).length;
  const ready = allFour && distinct;

  function setPick(rotation: number, dept: string) {
    setPicks((p) => ({ ...p, [rotation]: dept }));
    setError(null);
  }

  function clearPick(rotation: number) {
    setPicks((p) => {
      const next = { ...p };
      delete next[rotation];
      return next;
    });
    setError(null);
  }

  function onSubmit() {
    if (!ready) return;
    setError(null);
    const payload = rotations.map((r) => ({
      rotation: r.n,
      department: picks[r.n],
    }));
    start(async () => {
      const res = await submit(payload);
      if (res?.error) {
        setError(res.error);
        setShowConfirm(false);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 md:p-8">
        <div className="flex items-start gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-teal-50 grid place-items-center ring-1 ring-teal-100 shrink-0">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-teal-700"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 11l3 3 8-8" />
              <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Choose 4 rotations
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Pick one department for each rotation. All four must be different. You will
              not be able to change after submission.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {rotations.map((r) => (
            <RotationPicker
              key={r.n}
              rotation={r}
              currentDept={picks[r.n] ?? ""}
              forbidden={
                new Set(
                  Object.entries(picks)
                    .filter(([k]) => Number(k) !== r.n)
                    .map(([, v]) => v),
                )
              }
              matrix={matrix}
              onPick={(d) => setPick(r.n, d)}
              onClear={() => clearPick(r.n)}
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 md:p-8">
        <h3 className="text-base font-semibold text-slate-900 mb-3">
          Your selection
        </h3>
        <ul className="grid sm:grid-cols-2 gap-2 mb-4">
          {rotations.map((r) => (
            <li
              key={r.n}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <span className="text-slate-500">{r.label}</span>
              <span
                className={picks[r.n] ? "font-medium text-slate-900" : "text-slate-400"}
              >
                {picks[r.n] ?? "Not selected"}
              </span>
            </li>
          ))}
        </ul>

        {error && (
          <div className="mb-4 rounded-lg bg-rose-50 ring-1 ring-rose-100 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}
        {!distinct && (
          <div className="mb-4 rounded-lg bg-amber-50 ring-1 ring-amber-100 px-3 py-2 text-sm text-amber-800">
            All four rotations must be in different departments.
          </div>
        )}

        <div className="flex flex-wrap gap-3 justify-end">
          <button
            type="button"
            onClick={() => setPicks({})}
            disabled={pending || Object.keys(picks).length === 0}
            className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 text-sm"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={!ready || pending}
            className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium text-sm"
          >
            {pending ? "Submitting…" : "Submit (final)"}
          </button>
        </div>
      </div>

      {showConfirm && (
        <ConfirmDialog
          rotations={rotations}
          picks={picks}
          onCancel={() => setShowConfirm(false)}
          onConfirm={onSubmit}
          pending={pending}
        />
      )}
    </div>
  );
}

function RotationPicker({
  rotation,
  currentDept,
  forbidden,
  matrix,
  onPick,
  onClear,
}: {
  rotation: { n: number; label: string; dates: string };
  currentDept: string;
  forbidden: Set<string>;
  matrix: SeatMatrixRow[];
  onPick: (d: string) => void;
  onClear: () => void;
}) {
  const options = matrix.map((m) => {
    const slot = m.byRotation.find((b) => b.rotation === rotation.n)!;
    return {
      name: m.name,
      capacity: m.capacity,
      filled: slot.filled,
      available: slot.available,
      disabled: slot.available === 0 || (forbidden.has(m.name) && currentDept !== m.name),
      reason:
        slot.available === 0
          ? "Full"
          : forbidden.has(m.name) && currentDept !== m.name
            ? "Already chosen for another rotation"
            : null,
    };
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-medium text-slate-900">{rotation.label}</div>
          <div className="text-[11px] text-slate-500 font-mono">{rotation.dates}</div>
        </div>
        {currentDept && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-slate-500 hover:text-rose-600"
          >
            Clear
          </button>
        )}
      </div>
      <select
        value={currentDept}
        onChange={(e) => onPick(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
      >
        <option value="">— Pick a department —</option>
        {options.map((o) => (
          <option key={o.name} value={o.name} disabled={o.disabled}>
            {o.name} · {o.available}/{o.capacity}
            {o.reason ? ` (${o.reason})` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

function ConfirmDialog({
  rotations,
  picks,
  onCancel,
  onConfirm,
  pending,
}: {
  rotations: { n: number; label: string; dates: string }[];
  picks: Record<number, string>;
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6">
        <h3 className="text-lg font-semibold text-slate-900">Confirm submission</h3>
        <p className="mt-1 text-sm text-slate-600">
          This will lock your selection permanently. You cannot change it later.
        </p>
        <ul className="mt-4 space-y-2">
          {rotations.map((r) => (
            <li key={r.n} className="flex justify-between text-sm">
              <span className="text-slate-500">{r.label}</span>
              <span className="font-medium text-slate-900">{picks[r.n]}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm disabled:opacity-60"
          >
            {pending ? "Submitting…" : "Yes, lock my selection"}
          </button>
        </div>
      </div>
    </div>
  );
}
