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
        className="inline-flex items-center justify-center h-10 w-10 rounded-md border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
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
        className={`absolute right-0 top-12 w-72 origin-top-right rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-[0_24px_48px_-20px_rgba(26,26,26,0.18)] overflow-hidden transition-all duration-150 ${
          open
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <nav className="flex flex-col p-3 text-[15px]">
          <Link
            href="/"
            className="px-3 py-2.5 rounded-md text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            Roster
          </Link>
          <div className="my-2 h-px bg-[var(--border)]" />
          {isAdmin ? (
            <>
              <Link
                href="/admin"
                className="px-3 py-2.5 rounded-md bg-[var(--foreground)] text-[var(--background)] hover:bg-[var(--accent)] transition-colors font-medium"
              >
                Admin panel
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await logoutAdmin();
                  router.refresh();
                }}
                className="mt-1 px-3 py-2.5 rounded-md text-left text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/admin/login"
              className="px-3 py-2.5 rounded-md border border-[var(--foreground)] text-[var(--foreground)] text-center hover:bg-[var(--foreground)] hover:text-[var(--background)] transition-colors font-medium"
            >
              Admin login
            </Link>
          )}
        </nav>
      </div>
    </div>
  );
}
