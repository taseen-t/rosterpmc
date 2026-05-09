"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/app/actions";

export function LogoutButton() {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() =>
        start(async () => {
          await logout();
          router.refresh();
        })
      }
      className="px-3 py-1.5 rounded-md text-slate-500 hover:bg-slate-100 text-xs disabled:opacity-50"
      disabled={pending}
    >
      {pending ? "Signing out…" : "Logout"}
    </button>
  );
}
