"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { logoutAdmin } from "@/app/actions";

export function AdminLogoutButton() {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() =>
        start(async () => {
          await logoutAdmin();
          router.refresh();
        })
      }
      disabled={pending}
      className="px-5 py-3 border-2 border-[var(--border-strong)] text-[var(--muted-foreground)] uppercase tracking-tighter font-bold text-sm hover:bg-[var(--foreground)] hover:text-[var(--background)] hover:border-[var(--foreground)] transition-colors disabled:opacity-50"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
