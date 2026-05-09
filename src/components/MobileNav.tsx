"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { logout, logoutAdmin } from "@/app/actions";

type Props = {
  signedIn: boolean;
  rollNo: string | null;
  isAdmin: boolean;
};

export function MobileNav({ signedIn, rollNo, isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Close on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock background scroll while open.
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-lg text-slate-700 hover:bg-slate-100"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-[82%] max-w-xs bg-white shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <span className="text-sm font-semibold text-slate-900">Menu</span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center h-9 w-9 rounded-md text-slate-500 hover:bg-slate-100"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <nav className="flex flex-col p-3 gap-1 text-[15px]">
              <NavLink href="/">Roster</NavLink>
              <Link
                href="/contact"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-9 8.49 8.5 8.5 0 0 1-7.6-3.46L3 21l1.5-3.4A8.5 8.5 0 0 1 21 11.5z" />
                </svg>
                Contact Support
              </Link>
              {signedIn ? (
                <>
                  <NavLink href="/select">My Selection</NavLink>
                  {rollNo && (
                    <div className="px-3 py-2 text-xs text-slate-500 font-mono">
                      Signed in: {rollNo}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      await logout();
                      router.refresh();
                    }}
                    className="text-left px-3 py-2.5 rounded-lg text-rose-600 hover:bg-rose-50"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <NavLink href="/login" highlight>
                  Login
                </NavLink>
              )}

              <div className="my-2 h-px hr-fade" />

              {isAdmin ? (
                <>
                  <NavLink href="/admin">Admin panel</NavLink>
                  <button
                    type="button"
                    onClick={async () => {
                      await logoutAdmin();
                      router.refresh();
                    }}
                    className="text-left px-3 py-2.5 rounded-lg text-rose-600 hover:bg-rose-50"
                  >
                    Admin sign out
                  </button>
                </>
              ) : (
                <NavLink href="/admin/login">Admin login</NavLink>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

function NavLink({
  href,
  children,
  highlight,
}: {
  href: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        highlight
          ? "px-3 py-2.5 rounded-lg bg-slate-900 text-white font-medium"
          : "px-3 py-2.5 rounded-lg text-slate-700 hover:bg-slate-100"
      }
    >
      {children}
    </Link>
  );
}
