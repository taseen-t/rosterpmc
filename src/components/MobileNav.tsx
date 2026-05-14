"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { logoutAdmin } from "@/app/actions";

type Props = {
  isAdmin: boolean;
};

export function MobileNav({ isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !buttonRef.current?.contains(t)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="md:hidden relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center h-11 w-11 rounded-md bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] transition-all duration-200"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          {open ? (
            <>
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </>
          ) : (
            <>
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </>
          )}
        </svg>
      </button>

      <div
        ref={panelRef}
        className={`absolute right-0 top-14 w-72 origin-top-right rounded-lg bg-[var(--background)] border border-[var(--border)] transition-all duration-200 ${
          open
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <nav className="flex flex-col p-3 text-sm font-medium">
          <Link
            href="/"
            className="px-3 py-3 rounded-md text-[var(--foreground)] hover:bg-[var(--muted)] transition-all duration-200"
          >
            Roster
          </Link>
          <div className="my-2 h-px bg-[var(--border)]" />
          {isAdmin ? (
            <>
              <Link
                href="/admin"
                className="px-3 py-3 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-strong)] hover:scale-[1.02] transition-all duration-200 font-semibold"
              >
                Admin panel
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await logoutAdmin();
                  router.refresh();
                }}
                className="mt-2 px-3 py-3 rounded-md text-left text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-all duration-200"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/admin/login"
              className="px-3 py-3 rounded-md border-4 border-[var(--primary)] text-[var(--primary)] text-center hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] transition-all duration-200 font-semibold"
            >
              Admin login
            </Link>
          )}
        </nav>
      </div>
    </div>
  );
}
