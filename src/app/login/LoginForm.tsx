"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginStudent } from "@/app/actions";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const r = await loginStudent(fd);
          if (r?.error) setError(r.error);
          else router.refresh();
        });
      }}
      className="space-y-4"
    >
      <div>
        <label
          htmlFor="roll"
          className="block text-sm font-medium text-slate-700 mb-1.5"
        >
          Roll number
        </label>
        <input
          id="roll"
          name="roll"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          maxLength={6}
          pattern="\d{6}"
          placeholder="e.g. 255001"
          required
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 font-mono tabular-nums focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 ring-1 ring-rose-100 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex justify-center items-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium px-4 py-2.5 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Continue"}
      </button>
    </form>
  );
}
