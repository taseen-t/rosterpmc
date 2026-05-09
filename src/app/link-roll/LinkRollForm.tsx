"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { linkRoll } from "@/app/actions";

export function LinkRollForm() {
  const [roll, setRoll] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await linkRoll(roll);
          if (r?.error) setError(r.error);
          else router.refresh();
        });
      }}
      className="space-y-4"
    >
      <div>
        <label
          htmlFor="roll"
          className="block text-sm font-medium text-ink-700 mb-1.5"
        >
          Roll number
        </label>
        <input
          id="roll"
          name="roll"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          maxLength={8}
          value={roll}
          onChange={(e) => setRoll(e.target.value)}
          placeholder="e.g. 255001"
          required
          className="w-full rounded-lg border border-slate-300 bg-paper px-3 py-2.5 text-ink-900 font-mono tabular-nums focus:border-lime-500 focus:ring-2 focus:ring-lime-500/30 outline-none"
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
        className="w-full inline-flex justify-center items-center gap-2 rounded-lg bg-ink-900 hover:bg-ink-700 text-paper font-medium px-4 py-2.5 disabled:opacity-60"
      >
        {pending ? "Linking…" : "Link & continue"}
      </button>
    </form>
  );
}
