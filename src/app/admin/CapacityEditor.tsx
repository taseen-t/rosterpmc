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
    <tr className="hover:bg-slate-50/60">
      <td className="px-4 py-2.5 font-medium text-slate-800">{name}</td>
      <td className="px-4 py-2.5 text-center">
        {editing ? (
          <div className="inline-flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="w-20 rounded-md border border-slate-300 px-2 py-1 text-center font-mono text-sm"
            />
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
                setValue(capacity);
              }}
              className="px-2 py-1 rounded-md text-slate-500 hover:bg-slate-100 text-xs"
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
            className={`inline-flex items-center justify-center w-16 h-7 rounded-md font-mono text-sm ring-1 ${
              overridden
                ? "bg-amber-50 ring-amber-200 text-amber-800"
                : "bg-slate-50 ring-slate-200 text-slate-700"
            } hover:bg-slate-100`}
          >
            {capacity}
          </button>
        )}
      </td>
      <td className="px-4 py-2.5 text-center text-slate-400 font-mono text-sm">
        {original}
      </td>
      <td className="px-4 py-2.5 text-right">
        {overridden && !editing && (
          <button
            type="button"
            onClick={clearOverride}
            disabled={pending}
            className="text-xs text-slate-500 hover:text-rose-600 disabled:opacity-50"
          >
            Reset to original
          </button>
        )}
      </td>
    </tr>
  );
}
