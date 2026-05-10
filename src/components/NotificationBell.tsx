"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { markMyNotificationsRead } from "@/app/actions";

type Notification = {
  id: number;
  recipient: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

type Props = {
  initialItems: Notification[];
  initialUnread: number;
  /** "student" or "admin" — only affects styling. */
  variant?: "student" | "admin";
};

export function NotificationBell({
  initialItems,
  initialUnread,
  variant = "student",
}: Props) {
  const [items, setItems] = useState<Notification[]>(initialItems);
  const [unread, setUnread] = useState<number>(initialUnread);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Update local state if server sends new initial values on a refresh.
  useEffect(() => {
    setItems(initialItems);
    setUnread(initialUnread);
  }, [initialItems, initialUnread]);

  // Click outside / Escape to close
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

  function markAllRead() {
    start(async () => {
      const ids = items.filter((i) => !i.read).map((i) => i.id);
      if (ids.length === 0) return;
      await markMyNotificationsRead(ids);
      setItems((prev) => prev.map((i) => ({ ...i, read: true })));
      setUnread(0);
    });
  }

  function markOneRead(id: number) {
    if (items.find((i) => i.id === id)?.read) return;
    start(async () => {
      await markMyNotificationsRead([id]);
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, read: true } : i)),
      );
      setUnread((u) => Math.max(0, u - 1));
    });
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        onClick={() => {
          setOpen((v) => !v);
        }}
        className={`relative inline-flex items-center justify-center h-9 w-9 rounded-lg transition-colors ${
          variant === "admin"
            ? "text-slate-300 hover:bg-white/10"
            : "text-slate-700 hover:bg-slate-100"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[16px] h-[16px] rounded-full bg-rose-600 text-white text-[10px] font-medium px-1 ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-11 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white shadow-[0_24px_48px_-20px_rgba(11,62,79,0.25)] overflow-hidden z-40"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <span className="text-sm font-semibold text-slate-900">
              Notifications
            </span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                disabled={pending}
                className="text-xs text-teal-700 hover:text-teal-900 disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                No notifications yet.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((n) => (
                  <li key={n.id}>
                    <NotificationItem
                      n={n}
                      onClick={() => {
                        markOneRead(n.id);
                        if (n.link) {
                          setOpen(false);
                          router.push(n.link);
                        }
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationItem({
  n,
  onClick,
}: {
  n: Notification;
  onClick: () => void;
}) {
  const Wrapper = n.link ? "button" : "div";
  return (
    <Wrapper
      type={n.link ? "button" : undefined}
      onClick={n.link ? onClick : undefined}
      className={`w-full text-left px-4 py-3 transition-colors ${
        n.link ? "hover:bg-slate-50" : ""
      } ${!n.read ? "bg-teal-50/40" : ""}`}
    >
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden
          className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
            n.read ? "bg-slate-200" : "bg-teal-500"
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-slate-900 leading-snug">
            {n.title}
          </div>
          {n.body && (
            <div className="mt-0.5 text-xs text-slate-500 leading-relaxed line-clamp-2">
              {n.body}
            </div>
          )}
          <div className="mt-1 text-[11px] text-slate-400 font-mono">
            {timeAgo(n.created_at)}
          </div>
        </div>
      </div>
    </Wrapper>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// Use a normal Link for accessibility outside of clickable items if needed.
export const _PreviewLink = Link;
