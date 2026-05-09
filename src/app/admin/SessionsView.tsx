"use client";

import { useMemo, useState } from "react";

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
  login_fail_unknown: "Login fail · unknown",
  login_fail_not_pass: "Login fail · not Pass",
  view_select: "Viewed selection",
  view_select_blocked: "Viewed (blocked)",
  submit: "Submitted picks",
};

function detectDevice(ua: string | null): string {
  if (!ua) return "-";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Macintosh/.test(ua)) return "macOS";
  if (/Windows/.test(ua)) return "Windows";
  if (/Linux/.test(ua)) return "Linux";
  return "Other";
}

function detectBrowser(ua: string | null): string {
  if (!ua) return "-";
  if (/Edg\//.test(ua)) return "Edge";
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "Safari";
  if (/Firefox\//.test(ua)) return "Firefox";
  return "Other";
}

export function SessionsView({ rows }: { rows: Row[] }) {
  const [filter, setFilter] = useState("");
  const [tab, setTab] = useState<"all" | "logins" | "fails" | "submits">("all");

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab === "logins" && r.action !== "login_success") return false;
      if (tab === "fails" && !r.action.startsWith("login_fail")) return false;
      if (tab === "submits" && r.action !== "submit") return false;
      if (!f) return true;
      return (
        r.roll_no.includes(f) ||
        (r.actor && r.actor.toLowerCase().includes(f)) ||
        (r.ip && r.ip.includes(f)) ||
        (r.country && r.country.toLowerCase().includes(f)) ||
        (r.city && r.city.toLowerCase().includes(f))
      );
    });
  }, [rows, filter, tab]);

  return (
    <div className="rounded-xl border border-hairline bg-paper">
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-hairline">
        <div className="flex flex-wrap gap-1">
          {(["all", "logins", "fails", "submits"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs ring-1 transition-colors ${
                tab === t
                  ? "bg-ink-900 text-paper ring-ink-900"
                  : "bg-paper text-ink-700 ring-hairline hover:bg-cream"
              }`}
            >
              {t === "all"
                ? "All events"
                : t === "logins"
                  ? "Successful logins"
                  : t === "fails"
                    ? "Failed attempts"
                    : "Submissions"}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by roll, email, IP, city, country…"
          className="ml-auto w-full sm:w-72 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-lime-500 focus:ring-2 focus:ring-lime-500/30 outline-none"
        />
      </div>

      <div className="scrollx">
        <table className="min-w-full text-[13px]">
          <thead className="bg-cream/50 text-ink-400">
            <tr>
              <th className="text-left px-3 py-3 font-medium label-overline !text-ink-400">When</th>
              <th className="text-left px-3 py-3 font-medium label-overline !text-ink-400">Roll</th>
              <th className="text-left px-3 py-3 font-medium label-overline !text-ink-400">Action</th>
              <th className="text-left px-3 py-3 font-medium label-overline !text-ink-400">From</th>
              <th className="text-left px-3 py-3 font-medium label-overline !text-ink-400">Actor</th>
              <th className="text-left px-3 py-3 font-medium label-overline !text-ink-400">Device</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-cream/40">
                <td className="px-3 py-2.5 text-ink-600 font-mono whitespace-nowrap">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="px-3 py-2.5 font-mono text-ink-900">{r.roll_no}</td>
                <td className="px-3 py-2.5">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] ring-1 ${
                      ACTION_STYLES[r.action] ?? "bg-slate-100 text-slate-700 ring-slate-200"
                    }`}
                  >
                    {ACTION_LABELS[r.action] ?? r.action}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-ink-700 font-mono">
                  {r.ip ? (
                    <span title={r.ip}>
                      {r.ip}
                      {(r.city || r.country) && (
                        <span className="text-ink-400">
                          {" "}
                          · {[r.city, r.country].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-ink-400">-</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-ink-700">
                  {r.actor ? (
                    <span className="font-mono text-[12px]">{r.actor}</span>
                  ) : (
                    <span className="text-ink-400">anonymous</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-ink-600">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-ink-900">{detectDevice(r.user_agent)}</span>
                    <span className="text-ink-400">·</span>
                    <span>{detectBrowser(r.user_agent)}</span>
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-ink-400 text-sm">
                  No events match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
