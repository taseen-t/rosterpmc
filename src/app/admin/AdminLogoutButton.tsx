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
      className="px-5 py-2.5 rounded-md bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--dark)] hover:text-[var(--dark-foreground)] hover:scale-105 transition-all duration-200 font-semibold text-sm disabled:opacity-50"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
