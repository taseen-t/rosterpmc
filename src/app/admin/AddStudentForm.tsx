"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminAddStudent } from "@/app/actions";

export function AddStudentForm() {
  const [open, setOpen] = useState(false);
  const [roll, setRoll] = useState("");
  const [name, setName] = useState("");
  const [total, setTotal] = useState("");
  const [med, setMed] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function reset() {
    setRoll("");
    setName("");
    setTotal("");
    setMed("");
    setError(null);
  }

  function submit() {
    setError(null);
    start(async () => {
      const r = await adminAddStudent({
        roll_no: roll,
        name,
        total: total ? Number(total) : null,
        medicine_marks: med ? Number(med) : null,
      });
      if (r?.error) {
        setError(r.error);
      } else {
        reset();
        setOpen(false);
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-sm font-medium shadow-sm"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add new student
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display text-lg font-semibold text-slate-900">
            Add new student
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            For students missing from the OCR-imported PDF. They&apos;ll be re-ranked
            against the rest by total marks.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          Cancel
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Roll number" required>
          <input
            type="text"
            inputMode="numeric"
            value={roll}
            onChange={(e) => setRoll(e.target.value)}
            placeholder="e.g. 255326"
            maxLength={8}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
          />
        </Field>
        <Field label="Full name" required>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Hina Anwar"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
          />
        </Field>
        <Field label="Total marks (out of 1500)">
          <input
            type="number"
            min={0}
            max={1500}
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            placeholder="e.g. 1180"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
          />
        </Field>
        <Field
          label="Medicine marks (tiebreaker)"
          hint="Used when totals tie. Optional."
        >
          <input
            type="number"
            min={0}
            max={500}
            value={med}
            onChange={(e) => setMed(e.target.value)}
            placeholder="e.g. 380"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
          />
        </Field>
      </div>

      {error && (
        <div className="mt-3 rounded-lg bg-rose-50 ring-1 ring-rose-100 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          disabled={pending}
          className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-sm disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !roll || !name}
          className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          {pending ? "Adding…" : "Add student"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-slate-700">
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </span>
        {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
