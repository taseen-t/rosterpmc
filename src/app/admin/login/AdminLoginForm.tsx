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
        <span className="text-xs font-semibold text-[var(--foreground)]">Password</span>
        <input
          id="password"
          name="password"
          type="password"
          autoFocus
          required
          className="mt-2 w-full rounded-md bg-[var(--muted)] focus:bg-[var(--background)] border-2 border-transparent focus:border-[var(--primary)] px-3.5 py-3 text-[var(--foreground)] outline-none transition-all duration-200"
        />
      </label>
      {error && (
        <div className="rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm font-medium">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex justify-center items-center rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-strong)] hover:scale-105 transition-all duration-200 font-semibold px-4 py-3 disabled:opacity-60 disabled:hover:scale-100"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
