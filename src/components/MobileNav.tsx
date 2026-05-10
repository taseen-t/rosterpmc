"use client";

import { useState, useEffect, useRef } from "react";
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (
        !panelRef.current?.contains(t) &&
        !buttonRef.current?.contains(t)
      ) {
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
        className="inline-flex items-center justify-center h-10 w-10 rounded-lg text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
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

      {/* Dropdown panel */}
      <div
        ref={panelRef}
        className={`absolute right-0 top-12 w-72 origin-top-right rounded-2xl border border-slate-200 bg-white shadow-[0_24px_48px_-20px_rgba(11,62,79,0.25)] overflow-hidden transition-all duration-150 ${
          open
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <nav className="flex flex-col p-2 text-[15px]">
          <NavLink href="/" icon="grid">
            Roster
          </NavLink>
          <NavLink
            href="/contact"
            icon="message"
            highlight
            description="Wrong info? Reach out."
          >
            Contact Support
          </NavLink>

          {signedIn ? (
            <>
              <Divider />
              {rollNo && (
                <div className="flex items-center gap-2 px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-slate-400">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-teal-500" />
                  Roll <span className="font-mono text-slate-600">{rollNo}</span>
                </div>
              )}
              <NavLink href="/select" icon="check">
                My Selection
              </NavLink>
              <ActionButton
                onClick={async () => {
                  await logout();
                  router.refresh();
                }}
                tone="rose"
                icon="logout"
              >
                Log out
              </ActionButton>
            </>
          ) : (
            <>
              <Divider />
              <NavLink href="/login" icon="login" primary>
                Login
              </NavLink>
            </>
          )}

          <Divider />
          {isAdmin ? (
            <>
              <NavLink href="/admin" icon="shield">
                Admin panel
              </NavLink>
              <ActionButton
                onClick={async () => {
                  await logoutAdmin();
                  router.refresh();
                }}
                tone="slate"
                icon="logout"
              >
                Admin sign out
              </ActionButton>
            </>
          ) : (
            <NavLink href="/admin/login" icon="shield" subtle>
              Admin login
            </NavLink>
          )}
        </nav>
      </div>
    </div>
  );
}

function NavLink({
  href,
  icon,
  children,
  description,
  highlight,
  primary,
  subtle,
}: {
  href: string;
  icon: IconName;
  children: React.ReactNode;
  description?: string;
  highlight?: boolean;
  primary?: boolean;
  subtle?: boolean;
}) {
  let cls = "text-slate-800 hover:bg-slate-50";
  if (highlight) cls = "bg-teal-50 text-teal-800 hover:bg-teal-100 ring-1 ring-teal-100";
  else if (primary) cls = "bg-slate-900 text-white hover:bg-slate-800";
  else if (subtle) cls = "text-slate-500 hover:bg-slate-50";
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg my-0.5 transition-colors ${cls}`}
    >
      <NavIcon name={icon} />
      <span className="flex-1 leading-tight">
        <span className="block font-medium">{children}</span>
        {description && (
          <span className="block text-[11px] text-slate-500 mt-0.5 font-normal">
            {description}
          </span>
        )}
      </span>
    </Link>
  );
}

function ActionButton({
  onClick,
  children,
  tone,
  icon,
}: {
  onClick: () => void;
  children: React.ReactNode;
  tone: "rose" | "slate";
  icon: IconName;
}) {
  const cls =
    tone === "rose"
      ? "text-rose-600 hover:bg-rose-50"
      : "text-slate-500 hover:bg-slate-50";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg my-0.5 text-left transition-colors ${cls}`}
    >
      <NavIcon name={icon} />
      <span className="font-medium">{children}</span>
    </button>
  );
}

function Divider() {
  return <div className="my-1 mx-3 h-px bg-slate-100" />;
}

type IconName =
  | "grid"
  | "message"
  | "check"
  | "login"
  | "logout"
  | "shield";

function NavIcon({ name }: { name: IconName }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-4 w-4 shrink-0 opacity-80",
  };
  switch (name) {
    case "grid":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "message":
      return (
        <svg {...common}>
          <path d="M21 11.5a8.38 8.38 0 0 1-9 8.49 8.5 8.5 0 0 1-7.6-3.46L3 21l1.5-3.4A8.5 8.5 0 0 1 21 11.5z" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="M9 11l3 3 8-8" />
          <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
        </svg>
      );
    case "login":
      return (
        <svg {...common}>
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" y1="12" x2="3" y2="12" />
        </svg>
      );
    case "logout":
      return (
        <svg {...common}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 2L4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z" />
        </svg>
      );
  }
}
