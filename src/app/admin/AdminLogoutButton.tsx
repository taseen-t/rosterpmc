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
      className="px-3 py-1.5 rounded-md text-slate-500 hover:bg-slate-100 text-sm disabled:opacity-50"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
