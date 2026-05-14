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
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[var(--foreground)] text-[var(--background)] hover:bg-[var(--accent)] text-sm font-medium transition-colors"
      >
        <span className="text-base leading-none">+</span> Add new student
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <p className="eyebrow-accent">New entry</p>
          <h3 className="mt-1 font-display text-xl font-semibold text-[var(--foreground)]">
            Add a student
          </h3>
          <p className="text-xs text-[var(--muted-foreground)] mt-1 leading-relaxed">
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
          className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
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
            className="w-full rounded-md border border-[var(--border-strong)] px-3 py-2.5 text-sm font-mono-label focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 outline-none"
          />
        </Field>
        <Field label="Full name" required>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Hina Anwar"
            className="w-full rounded-md border border-[var(--border-strong)] px-3 py-2.5 text-sm focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 outline-none"
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
            className="w-full rounded-md border border-[var(--border-strong)] px-3 py-2.5 text-sm font-mono-label focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 outline-none"
          />
        </Field>
        <Field
          label="Medicine marks"
          hint="Used as tiebreaker. Optional."
        >
          <input
            type="number"
            min={0}
            max={500}
            value={med}
            onChange={(e) => setMed(e.target.value)}
            placeholder="380"
            className="w-full rounded-md border border-[var(--border-strong)] px-3 py-2.5 text-sm font-mono-label focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 outline-none"
          />
        </Field>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-[var(--rose-soft)] border border-[var(--rose)]/30 px-3 py-2 text-sm text-[var(--rose)]">
          {error}
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          disabled={pending}
          className="px-4 py-2 rounded-md border border-[var(--border-strong)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--foreground)] text-sm disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !roll || !name}
          className="px-5 py-2 rounded-md bg-[var(--foreground)] hover:bg-[var(--accent)] text-[var(--background)] text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
        <span className="eyebrow">
          {label}
          {required && <span className="text-[var(--rose)] ml-0.5">*</span>}
        </span>
        {hint && <span className="text-[10px] text-[var(--muted-foreground)]">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
