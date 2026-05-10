"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { linkRoll } from "@/app/actions";

/** Format a digit string into Pakistani CNIC layout: 5-7-1 (e.g. 33100-7303280-5). */
function formatCnic(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 13);
  if (d.length <= 5) return d;
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

export function LinkRollForm({
  defaultName,
}: {
  defaultName?: string;
}) {
  const [name, setName] = useState(defaultName ?? "");
  const [cnic, setCnic] = useState("");
  const [roll, setRoll] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const cnicDigits = cnic.replace(/\D/g, "").length;
  const ready =
    name.trim().length >= 2 && cnicDigits === 13 && /^\d{4,8}$/.test(roll.trim());

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await linkRoll({
            roll,
            displayName: name,
            cnic,
          });
          if (r?.error) setError(r.error);
          else router.refresh();
        });
      }}
      className="space-y-4"
    >
      <Field
        label="Your name"
        hint="As you'd like it to appear on the roster"
      >
        <input
          name="name"
          type="text"
          autoComplete="name"
          autoFocus
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Hina Anwar"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
        />
      </Field>

      <Field
        label="CNIC"
        hint={`${cnicDigits}/13 digits`}
      >
        <input
          name="cnic"
          inputMode="numeric"
          autoComplete="off"
          required
          maxLength={15}
          value={cnic}
          onChange={(e) => setCnic(formatCnic(e.target.value))}
          placeholder="33100-7303280-5"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 font-mono tabular-nums focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
        />
      </Field>

      <Field label="Roll number">
        <input
          name="roll"
          inputMode="numeric"
          autoComplete="off"
          required
          maxLength={8}
          value={roll}
          onChange={(e) => setRoll(e.target.value.replace(/\D/g, "").slice(0, 8))}
          placeholder="e.g. 255001"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 font-mono tabular-nums focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
        />
      </Field>

      {error && (
        <div className="rounded-lg bg-rose-50 ring-1 ring-rose-100 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending || !ready}
        className="w-full inline-flex justify-center items-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium px-4 py-2.5"
      >
        {pending ? "Linking…" : "Link account & continue"}
      </button>

      <p className="text-[11px] text-slate-400 leading-relaxed">
        This link is permanent. The Google account, name, CNIC, and roll number
        you submit here will be tied together. If something needs to change,
        contact Support.
      </p>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
