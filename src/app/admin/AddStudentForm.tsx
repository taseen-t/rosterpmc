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
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-strong)] hover:scale-105 transition-all duration-200 font-semibold text-sm"
      >
        <span className="text-base leading-none">+</span> Add new student
      </button>
    );
  }

  return (
    <div className="rounded-lg bg-[var(--muted)] p-6 md:p-8">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <p className="eyebrow-primary">New entry</p>
          <h3 className="mt-2 font-display text-2xl md:text-3xl font-bold text-[var(--foreground)] tracking-tight">
            Add a student
          </h3>
          <p className="text-sm text-[var(--muted-foreground)] mt-2 leading-relaxed">
            For students missing from the imported result. They&apos;re re-ranked
            against the rest by total marks.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="text-sm font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          Cancel
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Roll number" required>
          <input
            type="text"
            inputMode="numeric"
            value={roll}
            onChange={(e) => setRoll(e.target.value)}
            placeholder="000000"
            maxLength={8}
            className="w-full rounded-md bg-[var(--background)] border-2 border-transparent focus:border-[var(--primary)] px-3 py-2.5 text-sm font-semibold tabular-nums outline-none transition-all duration-200"
          />
        </Field>
        <Field label="Full name" required>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Hina Anwar"
            className="w-full rounded-md bg-[var(--background)] border-2 border-transparent focus:border-[var(--primary)] px-3 py-2.5 text-sm outline-none transition-all duration-200"
          />
        </Field>
        <Field label="Total marks (out of 1500)">
          <input
            type="number"
            min={0}
            max={1500}
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            placeholder="1180"
            className="w-full rounded-md bg-[var(--background)] border-2 border-transparent focus:border-[var(--primary)] px-3 py-2.5 text-sm font-semibold tabular-nums outline-none transition-all duration-200"
          />
        </Field>
        <Field label="Medicine marks" hint="Used as tiebreaker. Optional.">
          <input
            type="number"
            min={0}
            max={500}
            value={med}
            onChange={(e) => setMed(e.target.value)}
            placeholder="380"
            className="w-full rounded-md bg-[var(--background)] border-2 border-transparent focus:border-[var(--primary)] px-3 py-2.5 text-sm font-semibold tabular-nums outline-none transition-all duration-200"
          />
        </Field>
      </div>

      {error && (
        <div className="mt-5 rounded-md bg-red-50 text-red-700 px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          disabled={pending}
          className="px-5 py-2.5 rounded-md bg-[var(--background)] text-[var(--muted-foreground)] hover:bg-[var(--dark)] hover:text-[var(--dark-foreground)] hover:scale-105 transition-all duration-200 font-semibold text-sm disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !roll || !name}
          className="px-6 py-2.5 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-strong)] hover:scale-105 transition-all duration-200 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
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
        <span className="text-xs font-semibold text-[var(--foreground)]">
          {label}
          {required && <span className="text-[var(--danger)] ml-0.5">*</span>}
        </span>
        {hint && <span className="text-[10px] text-[var(--muted-foreground)]">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
