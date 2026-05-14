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
      className="px-4 py-2 rounded-md border border-[var(--border-strong)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--foreground)] text-sm font-medium transition-colors disabled:opacity-50"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
