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
        className="inline-flex items-center gap-2 px-5 py-3 bg-[var(--accent)] text-[var(--accent-foreground)] uppercase tracking-tighter font-bold text-sm hover:scale-105 active:scale-95 transition-transform"
      >
        + Add new student
      </button>
    );
  }

  return (
    <div className="border-2 border-[var(--border)] p-6 md:p-8">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <p className="eyebrow-accent">New entry</p>
          <h3 className="mt-2 font-display text-2xl md:text-3xl font-bold uppercase tracking-tighter text-[var(--foreground)]">
            Add a student
          </h3>
          <p className="text-xs text-[var(--muted-foreground)] mt-2 leading-tight uppercase tracking-wider">
            For students missing from the imported result. Re-ranked by total
            marks.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          Cancel
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <Field label="Roll number" required>
          <input
            type="text"
            inputMode="numeric"
            value={roll}
            onChange={(e) => setRoll(e.target.value)}
            placeholder="000000"
            maxLength={8}
            className="w-full border-b-2 border-[var(--border-strong)] bg-transparent px-0 py-3 text-2xl md:text-3xl font-bold uppercase tracking-tighter text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] outline-none"
          />
        </Field>
        <Field label="Full name" required>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="HINA ANWAR"
            className="w-full border-b-2 border-[var(--border-strong)] bg-transparent px-0 py-3 text-2xl md:text-3xl font-bold uppercase tracking-tighter text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] outline-none"
          />
        </Field>
        <Field label="Total /1500">
          <input
            type="number"
            min={0}
            max={1500}
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            placeholder="0"
            className="w-full border-b-2 border-[var(--border-strong)] bg-transparent px-0 py-3 text-2xl md:text-3xl font-bold tabular-nums text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] outline-none"
          />
        </Field>
        <Field
          label="Medicine /500"
          hint="Tiebreaker · optional"
        >
          <input
            type="number"
            min={0}
            max={500}
            value={med}
            onChange={(e) => setMed(e.target.value)}
            placeholder="0"
            className="w-full border-b-2 border-[var(--border-strong)] bg-transparent px-0 py-3 text-2xl md:text-3xl font-bold tabular-nums text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] outline-none"
          />
        </Field>
      </div>

      {error && (
        <div className="mt-5 border-2 border-[var(--rose)] px-4 py-3 text-sm text-[var(--rose)] uppercase tracking-wider font-bold">
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
          className="px-5 py-3 border-2 border-[var(--border-strong)] text-[var(--muted-foreground)] uppercase tracking-tighter font-bold text-sm hover:bg-[var(--foreground)] hover:text-[var(--background)] hover:border-[var(--foreground)] transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !roll || !name}
          className="px-6 py-3 bg-[var(--accent)] text-[var(--accent-foreground)] uppercase tracking-tighter font-bold text-sm hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
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
      <div className="flex items-center justify-between mb-2">
        <span className="eyebrow">
          {label}
          {required && <span className="text-[var(--accent)] ml-0.5">*</span>}
        </span>
        {hint && (
          <span className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
            {hint}
          </span>
        )}
      </div>
      {children}
    </label>
  );
}
