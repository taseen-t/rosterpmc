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
    <tr className="hover:bg-[var(--muted)]/50 transition-colors">
      <td className="px-5 py-3.5 text-[var(--foreground)] font-medium">{name}</td>
      <td className="px-5 py-3.5 text-center">
        {editing ? (
          <div className="inline-flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="w-20 rounded-md bg-[var(--muted)] focus:bg-[var(--background)] border-2 border-transparent focus:border-[var(--primary)] px-2 py-1.5 text-center font-semibold tabular-nums outline-none transition-all duration-200"
            />
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="px-3 py-1.5 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-strong)] hover:scale-105 transition-all duration-200 font-semibold text-xs disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setValue(capacity);
              }}
              className="px-3 py-1.5 rounded-md text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-all duration-200 text-xs"
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
            className={`inline-flex items-center justify-center w-16 h-9 rounded-md font-semibold tabular-nums text-base transition-all duration-200 ${
              overridden
                ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                : "bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)]"
            } hover:scale-105`}
          >
            {capacity}
          </button>
        )}
      </td>
      <td className="px-5 py-3.5 text-center text-[var(--muted-foreground)] tabular-nums font-medium">
        {original}
      </td>
      <td className="px-5 py-3.5 text-right">
        {overridden && !editing && (
          <button
            type="button"
            onClick={clearOverride}
            disabled={pending}
            className="text-xs text-[var(--muted-foreground)] hover:text-[var(--danger)] font-semibold disabled:opacity-50 transition-colors"
          >
            Reset to original
          </button>
        )}
      </td>
    </tr>
  );
}
