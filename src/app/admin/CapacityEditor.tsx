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
    <tr className="hover:bg-[var(--muted)] transition-colors">
      <td className="px-5 py-3.5 text-[var(--foreground)] uppercase tracking-tight font-bold">
        {name}
      </td>
      <td className="px-5 py-3.5 text-center">
        {editing ? (
          <div className="inline-flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="w-20 border-2 border-[var(--border)] bg-transparent px-2 py-1.5 text-center font-bold tabular-nums focus:border-[var(--accent)] outline-none text-[var(--foreground)]"
            />
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="px-3 py-1.5 bg-[var(--accent)] text-[var(--accent-foreground)] uppercase tracking-tighter font-bold text-xs hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setValue(capacity);
              }}
              className="px-3 py-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] uppercase tracking-wider text-xs"
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
            className={`inline-flex items-center justify-center w-16 h-9 border-2 font-bold tabular-nums text-base transition-colors ${
              overridden
                ? "border-[var(--accent)] text-[var(--accent)] bg-transparent"
                : "border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-[var(--background)] hover:border-[var(--foreground)]"
            }`}
          >
            {capacity}
          </button>
        )}
      </td>
      <td className="px-5 py-3.5 text-center text-[var(--muted-foreground)] tabular-nums font-bold">
        {original}
      </td>
      <td className="px-5 py-3.5 text-right">
        {overridden && !editing && (
          <button
            type="button"
            onClick={clearOverride}
            disabled={pending}
            className="text-xs text-[var(--muted-foreground)] hover:text-[var(--rose)] uppercase tracking-widest disabled:opacity-50"
          >
            Reset
          </button>
        )}
      </td>
    </tr>
  );
}
