"use client";

import { useState, useTransition } from "react";
import { submitSupportRequest } from "@/app/actions";

const CATEGORIES = [
  { v: "wrong-roll", l: "Wrong roll number" },
  { v: "wrong-name", l: "Misspelled name" },
  { v: "missing", l: "Missing from roster" },
  { v: "wrong-marks", l: "Marks need correction" },
  { v: "cant-login", l: "Can't log in" },
  { v: "other", l: "Other" },
];

export function ContactForm({ defaultRoll }: { defaultRoll: string }) {
  const [roll, setRoll] = useState(defaultRoll);
  const [contact, setContact] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      const r = await submitSupportRequest({
        roll_no: roll,
        contact,
        category,
        message,
      });
      if (r?.error) setError(r.error);
      else {
        setDone(true);
        setMessage("");
      }
    });
  }

  if (done) {
    return (
      <div className="text-center py-6">
        <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 ring-1 ring-emerald-100 grid place-items-center mb-4">
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-emerald-700" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-display text-xl font-semibold text-slate-900">
          Request received
        </h2>
        <p className="mt-1.5 text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
          An admin will review and follow up. You can submit another request below if
          you have more issues.
        </p>
        <button
          type="button"
          onClick={() => setDone(false)}
          className="mt-5 inline-flex items-center rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-sm font-medium"
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-4"
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Roll number" hint="Optional, but helps us find you">
          <input
            type="text"
            inputMode="numeric"
            value={roll}
            onChange={(e) => setRoll(e.target.value)}
            placeholder="e.g. 255001"
            maxLength={8}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
          />
        </Field>
        <Field label="Phone or email" hint="So we can reach you">
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="+92… or you@example.com"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
          />
        </Field>
      </div>

      <Field label="Issue type">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
        >
          <option value="">Select…</option>
          {CATEGORIES.map((c) => (
            <option key={c.v} value={c.v}>
              {c.l}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Message" required>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          required
          maxLength={2000}
          placeholder="Describe the issue. Include your roll #, name as it should appear, and any other detail."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none resize-y"
        />
        <div className="mt-1 text-right text-[10px] text-slate-400 tabular-nums">
          {message.length}/2000
        </div>
      </Field>

      {error && (
        <div className="rounded-lg bg-rose-50 ring-1 ring-rose-100 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending || message.trim().length < 5}
        className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium px-4 py-2.5 text-sm shadow-sm"
      >
        {pending ? "Sending…" : "Send request"}
      </button>
    </form>
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
