"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Row = {
  id: number;
  roll_no: string;
  actor: string | null;
  action: string;
  ip: string | null;
  country: string | null;
  city: string | null;
  user_agent: string | null;
  created_at: string;
};

type Summary = {
  total: number;
  successes: number;
  failures: number;
  uniqueIps: number;
  lastAt: string | null;
};

const ACTION_STYLES: Record<string, string> = {
  login_success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  login_fail_unknown: "bg-rose-50 text-rose-700 ring-rose-100",
  login_fail_not_pass: "bg-rose-50 text-rose-700 ring-rose-100",
  view_select: "bg-slate-100 text-slate-700 ring-slate-200",
  view_select_blocked: "bg-amber-50 text-amber-800 ring-amber-100",
  submit: "bg-teal-50 text-teal-700 ring-teal-100",
};

const ACTION_LABELS: Record<string, string> = {
  login_success: "Login OK",
  login_fail_unknown: "Login fail · roll not found",
  login_fail_not_pass: "Login fail · not Pass",
  view_select: "Viewed selection",
  view_select_blocked: "Viewed (blocked)",
  submit: "Submitted picks",
};

export function AccessLogDialog({
  roll,
  name,
  onClose,
}: {
  roll: string;
  name: string;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/access?roll=${encodeURIComponent(roll)}`)
      .then((r) => r.json())
      .then((data: { rows: Row[]; summary: Summary }) => {
        if (cancelled) return;
        setRows(data.rows);
        setSummary(data.summary);
      })
      .catch(() => !cancelled && setError("Failed to load access log."));
    return () => {
      cancelled = true;
    };
  }, [roll]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[80vh] flex flex-col rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold">
              Access trail
            </p>
            <h3 className="mt-0.5 font-display text-xl font-semibold text-slate-900 tracking-tight">
              Roll {roll} · {name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {summary && (
          <div className="px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-slate-100">
            <Stat label="Total" value={summary.total.toString()} />
            <Stat label="Successes" value={summary.successes.toString()} tone="emerald" />
            <Stat label="Failures" value={summary.failures.toString()} tone="rose" />
            <Stat label="Unique IPs" value={summary.uniqueIps.toString()} />
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="m-6 rounded-lg bg-rose-50 ring-1 ring-rose-100 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}
          {rows == null && !error && (
            <div className="p-6 text-sm text-slate-400">Loading…</div>
          )}
          {rows && rows.length === 0 && (
            <div className="p-6 text-sm text-slate-400">
              No access events recorded yet for this roll number.
            </div>
          )}
          {rows && rows.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {rows.map((r) => (
                <li key={r.id} className="px-6 py-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md ring-1 ${
                        ACTION_STYLES[r.action] ?? "bg-slate-100 text-slate-700 ring-slate-200"
                      }`}
                    >
                      {ACTION_LABELS[r.action] ?? r.action}
                    </span>
                    <span className="text-slate-500 font-mono">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                    {r.ip && (
                      <span className="text-slate-500 font-mono">
                        · {r.ip}
                        {r.country ? ` (${[r.city, r.country].filter(Boolean).join(", ")})` : ""}
                      </span>
                    )}
                    {r.actor && r.actor !== r.roll_no && (
                      <span className="text-slate-500">
                        · actor: <span className="font-mono">{r.actor}</span>
                      </span>
                    )}
                  </div>
                  {r.user_agent && (
                    <div
                      className="mt-1 text-[11px] text-slate-400 font-mono truncate"
                      title={r.user_agent}
                    >
                      {r.user_agent}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "rose";
}) {
  const cls =
    tone === "emerald"
      ? "text-emerald-700"
      : tone === "rose"
        ? "text-rose-700"
        : "text-slate-700";
  return (
    <div className="px-3 py-2 rounded-lg bg-slate-50 ring-1 ring-slate-100">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className={`mt-0.5 text-lg font-semibold tabular-nums ${cls}`}>
        {value}
      </div>
    </div>
  );
}
