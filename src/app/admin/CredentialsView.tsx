"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminUpdateCredential, adminDeleteCredential } from "@/app/actions";
import { formatCnic } from "@/lib/cnic";

type Row = {
  roll_no: string;
  cnic: string;
  display_name: string | null;
  registered_at: string;
  last_seen_at: string;
};

export function CredentialsView({ rows }: { rows: Row[] }) {
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return rows;
    return rows.filter(
      (r) =>
        r.roll_no.includes(f) ||
        r.cnic.toLowerCase().includes(f) ||
        (r.display_name?.toLowerCase().includes(f) ?? false),
    );
  }, [rows, filter]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-200">
        <div className="text-xs text-slate-500">
          {rows.length} student{rows.length === 1 ? "" : "s"} registered
        </div>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by roll, CNIC, name…"
          className="ml-auto w-full sm:w-64 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
        />
      </div>
      <div className="scrollx">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-3 py-3 font-medium">Roll</th>
              <th className="text-left px-3 py-3 font-medium">Display name</th>
              <th className="text-left px-3 py-3 font-medium">CNIC</th>
              <th className="text-left px-3 py-3 font-medium">Registered</th>
              <th className="text-left px-3 py-3 font-medium">Last seen</th>
              <th className="text-right px-3 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((r) => (
              <CredentialRow key={r.roll_no} row={r} />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-sm text-slate-400"
                >
                  {rows.length === 0
                    ? "No students have registered yet. Rows show up here as students sign up via /login."
                    : "No matches for that filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CredentialRow({ row }: { row: Row }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(row.display_name ?? "");
  const [cnic, setCnic] = useState(row.cnic);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function save() {
    const patch: Parameters<typeof adminUpdateCredential>[0] = {
      roll_no: row.roll_no,
    };
    if (name !== (row.display_name ?? "")) patch.display_name = name;
    if (cnic !== row.cnic) patch.cnic = cnic;
    if (Object.keys(patch).length === 1) {
      setEditing(false);
      return;
    }
    setError(null);
    start(async () => {
      const r = await adminUpdateCredential(patch);
      if (r?.error) {
        setError(r.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  function remove() {
    if (
      !confirm(
        `Delete the credential for ${row.display_name || row.roll_no}? They'll be able to register again with any CNIC. Their existing rotation picks (if any) are kept.`,
      )
    )
      return;
    start(async () => {
      await adminDeleteCredential(row.roll_no);
      router.refresh();
    });
  }

  function copyCnic() {
    navigator.clipboard?.writeText(row.cnic).catch(() => {});
  }

  return (
    <>
      <tr className="hover:bg-slate-50/60">
        <td className="px-3 py-2.5 font-mono text-slate-700">{row.roll_no}</td>
        <td className="px-3 py-2.5">
          {editing ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            />
          ) : (
            <span className="text-slate-900">
              {row.display_name ?? <span className="text-slate-400">—</span>}
            </span>
          )}
        </td>
        <td className="px-3 py-2.5">
          {editing ? (
            <input
              type="text"
              inputMode="numeric"
              value={cnic}
              onChange={(e) => setCnic(formatCnic(e.target.value))}
              maxLength={15}
              className="w-40 rounded-md border border-slate-300 px-2 py-1 text-sm font-mono"
            />
          ) : (
            <button
              type="button"
              onClick={copyCnic}
              className="font-mono text-slate-700 hover:text-teal-700 hover:underline"
              title="Click to copy"
            >
              {row.cnic}
            </button>
          )}
        </td>
        <td className="px-3 py-2.5 text-xs text-slate-500 font-mono">
          {new Date(row.registered_at).toLocaleString()}
        </td>
        <td className="px-3 py-2.5 text-xs text-slate-500 font-mono">
          {new Date(row.last_seen_at).toLocaleString()}
        </td>
        <td className="px-3 py-2.5 text-right space-x-2">
          {editing ? (
            <>
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="px-2 py-1 rounded-md bg-teal-600 hover:bg-teal-700 text-white text-xs disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setName(row.display_name ?? "");
                  setCnic(row.cnic);
                  setError(null);
                }}
                className="px-2 py-1 rounded-md text-slate-500 hover:bg-slate-100 text-xs"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="px-2 py-1 rounded-md text-slate-600 hover:bg-slate-100 text-xs"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={pending}
                className="px-2 py-1 rounded-md text-rose-600 hover:bg-rose-50 text-xs disabled:opacity-50"
                title="Delete this credential — student can re-register"
              >
                Delete
              </button>
            </>
          )}
        </td>
      </tr>
      {error && (
        <tr>
          <td colSpan={6} className="px-3 pb-2 pt-0">
            <div className="rounded-md bg-rose-50 ring-1 ring-rose-100 px-3 py-1.5 text-xs text-rose-700">
              {error}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
