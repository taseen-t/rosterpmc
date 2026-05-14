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
      className="space-y-6"
    >
      <label className="block">
        <span className="eyebrow">Password</span>
        <input
          id="password"
          name="password"
          type="password"
          autoFocus
          required
          className="mt-3 w-full border-b-2 border-[var(--border-strong)] bg-transparent px-0 py-3 text-3xl md:text-4xl font-bold uppercase tracking-tighter text-[var(--foreground)] focus:border-[var(--accent)] outline-none"
        />
      </label>
      {error && (
        <div className="border-2 border-[var(--rose)] px-4 py-3 text-sm text-[var(--rose)] uppercase tracking-wider font-bold">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex justify-center items-center px-4 py-4 bg-[var(--accent)] text-[var(--accent-foreground)] uppercase tracking-tighter font-bold text-base md:text-lg hover:scale-105 active:scale-95 transition-transform disabled:opacity-60 disabled:hover:scale-100"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
