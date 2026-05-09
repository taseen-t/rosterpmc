"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminResolveSupport, adminDeleteSupport } from "@/app/actions";

type Row = {
  id: number;
  roll_no: string | null;
  contact: string | null;
  category: string | null;
  message: string;
  resolved: boolean;
  created_at: string;
};

export function SupportRequests({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-8 text-center">
        <div className="mx-auto h-10 w-10 rounded-full bg-slate-100 grid place-items-center mb-3">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-9 8.49 8.5 8.5 0 0 1-7.6-3.46L3 21l1.5-3.4A8.5 8.5 0 0 1 21 11.5z" />
          </svg>
        </div>
        <p className="text-sm text-slate-500">
          No support requests yet. They&apos;ll appear here when students submit through{" "}
          <code className="px-1 bg-slate-100 rounded">/contact</code>.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <SupportRow key={r.id} row={r} />
      ))}
    </ul>
  );
}

function SupportRow({ row }: { row: Row }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function toggle() {
    start(async () => {
      await adminResolveSupport(row.id, !row.resolved);
      router.refresh();
    });
  }

  function remove() {
    if (!confirm("Delete this request? This cannot be undone.")) return;
    start(async () => {
      await adminDeleteSupport(row.id);
      router.refresh();
    });
  }

  return (
    <li
      className={`rounded-xl border p-4 transition-colors ${
        row.resolved
          ? "border-slate-200 bg-slate-50/60 opacity-80"
          : "border-amber-200 bg-amber-50/40"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {row.resolved ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200">
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
              Resolved
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900 ring-1 ring-amber-300">
              Open
            </span>
          )}
          {row.category && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[11px] uppercase tracking-wider">
              {row.category}
            </span>
          )}
          {row.roll_no && (
            <span className="font-mono text-slate-600">Roll {row.roll_no}</span>
          )}
          {row.contact && <span className="text-slate-600">· {row.contact}</span>}
          <span className="text-slate-400">
            · {new Date(row.created_at).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggle}
            disabled={pending}
            className={`px-2.5 py-1 rounded-md text-xs disabled:opacity-50 ${
              row.resolved
                ? "text-slate-600 hover:bg-slate-200/60"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {row.resolved ? "Reopen" : "Mark resolved"}
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="px-2.5 py-1 rounded-md text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
        {row.message}
      </p>
    </li>
  );
}
