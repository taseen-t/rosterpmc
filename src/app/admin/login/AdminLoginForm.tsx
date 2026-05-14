"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginAdmin } from "@/app/actions";

export function AdminLoginForm() {
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
          const r = await loginAdmin(fd);
          if (r?.error) setError(r.error);
          else router.refresh();
        });
      }}
      className="space-y-5"
    >
      <label className="block">
        <span className="eyebrow">Password</span>
        <input
          id="password"
          name="password"
          type="password"
          autoFocus
          required
          className="mt-2 w-full rounded-md border border-[var(--border-strong)] bg-[var(--card)] px-3.5 py-3 text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 outline-none"
        />
      </label>
      {error && (
        <div className="rounded-md bg-[var(--rose-soft)] border border-[var(--rose)]/30 px-3 py-2 text-sm text-[var(--rose)]">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex justify-center items-center gap-2 rounded-md bg-[var(--foreground)] hover:bg-[var(--accent)] text-[var(--background)] font-medium px-4 py-3 transition-colors disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
