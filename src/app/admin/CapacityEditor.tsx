"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminUpdateCapacity, adminClearCapacityOverride } from "@/app/actions";

export function CapacityEditor({
  name,
  capacity,
  original,
}: {
  name: string;
  capacity: number;
  original: number;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(capacity);
  const [pending, start] = useTransition();
  const router = useRouter();
  const overridden = capacity !== original;

  function save() {
    start(async () => {
      const r = await adminUpdateCapacity(name, value);
      if (!r?.error) {
        setEditing(false);
        router.refresh();
      }
    });
  }

  function clearOverride() {
    start(async () => {
      const r = await adminClearCapacityOverride(name);
      if (!r?.error) {
        router.refresh();
      }
    });
  }

  return (
    <tr className="hover:bg-[var(--muted)]/60 transition-colors">
      <td className="px-5 py-3 text-[var(--foreground)]">{name}</td>
      <td className="px-5 py-3 text-center">
        {editing ? (
          <div className="inline-flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="w-20 rounded-md border border-[var(--border-strong)] px-2 py-1 text-center font-mono-label text-sm focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 outline-none"
            />
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="px-3 py-1 rounded-md bg-[var(--foreground)] hover:bg-[var(--accent)] text-[var(--background)] text-xs font-medium transition-colors disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setValue(capacity);
              }}
              className="px-3 py-1 rounded-md text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-xs"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setValue(capacity);
            }}
            className={`inline-flex items-center justify-center w-16 h-7 rounded-md font-mono-label text-sm border transition-colors ${
              overridden
                ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-muted)]/40"
                : "border-[var(--border-strong)] text-[var(--foreground)] hover:bg-[var(--muted)]"
            }`}
          >
            {capacity}
          </button>
        )}
      </td>
      <td className="px-5 py-3 text-center text-[var(--muted-foreground)] font-mono-label text-sm">
        {original}
      </td>
      <td className="px-5 py-3 text-right">
        {overridden && !editing && (
          <button
            type="button"
            onClick={clearOverride}
            disabled={pending}
            className="text-xs text-[var(--muted-foreground)] hover:text-[var(--rose)] disabled:opacity-50"
          >
            Reset to original
          </button>
        )}
      </td>
    </tr>
  );
}
