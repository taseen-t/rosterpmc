"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adminUpdateStudent,
  adminClearStudentOverride,
  adminResetStudent,
  adminSkipStudent,
  adminUnskipStudent,
  adminDeleteEntry,
  adminChangeRoll,
} from "@/app/actions";
import type { Student } from "@/lib/data";
import {
  RotationEditor,
  type DepartmentLoad,
  type RotationEditorStudent,
} from "./RotationEditor";

type StaticMap = Record<
  string,
  { name: string; total: number | null; overall: "Pass" | "Fail"; rank: number | null }
>;

type Props = {
  students: Student[];
  submittedRolls: string[];
  picksByRoll: Record<string, { rotation: number; department: string }[]>;
  departments: DepartmentLoad[];
  staticStudentMap: StaticMap;
};

type Tab = "all" | "pass" | "fail" | "finalized" | "skipped" | "added" | "issues";

export function StudentEditor({
  students,
  submittedRolls,
  picksByRoll,
  departments,
  staticStudentMap,
}: Props) {
  const [filter, setFilter] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const submitted = useMemo(() => new Set(submittedRolls), [submittedRolls]);

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return students.filter((s) => {
      if (tab === "pass" && s.overall !== "Pass") return false;
      if (tab === "fail" && s.overall !== "Fail") return false;
      if (tab === "finalized" && !submitted.has(s.roll_no)) return false;
      if (tab === "skipped" && !s.skipped) return false;
      if (tab === "added" && !s.manual) return false;
      if (tab === "issues") {
        const incomplete =
          !s.manual && (s.subjects.length < 4 || s.total == null);
        if (!incomplete) return false;
      }
      if (!f) return true;
      return (
        s.roll_no.includes(f) ||
        s.name.toLowerCase().includes(f) ||
        (s.reg_no?.toLowerCase().includes(f) ?? false)
      );
    });
  }, [students, filter, tab, submitted]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const ra = a.rank ?? 99999;
      const rb = b.rank ?? 99999;
      if (ra !== rb) return ra - rb;
      return Number(a.roll_no) - Number(b.roll_no);
    });
  }, [filtered]);

  const tabs: Array<[Tab, string]> = [
    ["all", "All"],
    ["pass", "Pass"],
    ["fail", "Fail"],
    ["finalized", "Finalized"],
    ["skipped", "Skipped"],
    ["added", "Manual"],
    ["issues", "Review"],
  ];

  return (
    <div className="rounded-lg bg-[var(--background)] border border-[var(--border)] overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 p-4 bg-[var(--muted)]">
        <div className="flex flex-wrap gap-2">
          {tabs.map(([t, label]) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                tab === t
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] hover:scale-105"
                  : "bg-[var(--background)] text-[var(--muted-foreground)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search roll, name, reg…"
          className="ml-auto w-full sm:w-72 rounded-md bg-[var(--background)] border-2 border-transparent focus:border-[var(--primary)] px-3 py-2 text-sm outline-none transition-all duration-200"
        />
      </div>
      <div className="scrollx">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--background)] border-b border-[var(--border)]">
            <tr>
              <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Rank</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Roll</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Name</th>
              <th className="text-right px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Total</th>
              <th className="text-center px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Result</th>
              <th className="text-center px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Locked</th>
              <th className="text-right px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {sorted.map((s) => (
              <StudentRow
                key={s.roll_no}
                student={s}
                submitted={submitted.has(s.roll_no)}
                picks={picksByRoll[s.roll_no] ?? []}
                departments={departments}
                original={staticStudentMap[s.roll_no]}
              />
            ))}
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-[var(--muted-foreground)] text-sm"
                >
                  No students match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StudentRow({
  student,
  submitted,
  picks,
  departments,
  original,
}: {
  student: Student;
  submitted: boolean;
  picks: { rotation: number; department: string }[];
  departments: DepartmentLoad[];
  original?: { name: string; total: number | null; overall: "Pass" | "Fail"; rank: number | null };
}) {
  const [editing, setEditing] = useState(false);
  const [rotOpen, setRotOpen] = useState(false);
  const [name, setName] = useState(student.name);
  const [total, setTotal] = useState<string>(student.total?.toString() ?? "");
  const [overall, setOverall] = useState<"Pass" | "Fail">(student.overall);
  const [rank, setRank] = useState<string>(student.rank?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const overridden =
    original != null &&
    (original.name !== student.name ||
      original.total !== student.total ||
      original.overall !== student.overall ||
      original.rank !== student.rank);
  const canRevert = overridden || student.manual;
  const incomplete = !student.manual && (student.subjects.length < 4 || student.total == null);

  const rotationStudent: RotationEditorStudent = {
    roll_no: student.roll_no,
    name: student.name,
    rank: student.rank,
    submitted,
    picks,
  };

  function save() {
    const totalNum = total === "" ? null : Number(total);
    const patch: Parameters<typeof adminUpdateStudent>[1] = {};
    if (name !== student.name) patch.name = name;
    if (totalNum !== student.total) patch.total = totalNum ?? undefined;
    if (overall !== student.overall) patch.overall = overall;
    if (rank === "" && student.rank != null) {
      patch.rank = null;
    } else if (rank !== "" && Number(rank) !== student.rank) {
      patch.rank = Number(rank);
    }
    setError(null);
    if (Object.keys(patch).length === 0) {
      setEditing(false);
      return;
    }
    start(async () => {
      const r = await adminUpdateStudent(student.roll_no, patch);
      if (r?.error) {
        setError(r.error);
        return;
      }
      setEditing(false);
      setError(null);
      router.refresh();
    });
  }

  function changeRoll() {
    const next = prompt(
      `Change roll number for ${student.name} (currently ${student.roll_no}).\n\nThis migrates their selections to the new roll. Cannot be undone.\n\nNew roll number:`,
      student.roll_no,
    );
    if (!next || next.trim() === student.roll_no) return;
    start(async () => {
      const r = await adminChangeRoll(student.roll_no, next.trim());
      if (r?.error) alert(r.error);
      else router.refresh();
    });
  }

  function deleteEntry() {
    if (
      !confirm(
        `Permanently delete ${student.name} (Roll ${student.roll_no})?\n\nThis removes them from the roster and clears their picks. Cannot be undone.`,
      )
    )
      return;
    start(async () => {
      await adminDeleteEntry(student.roll_no);
      router.refresh();
    });
  }

  function revert() {
    start(async () => {
      await adminClearStudentOverride(student.roll_no);
      router.refresh();
    });
  }

  function toggleSkip() {
    if (student.skipped) {
      start(async () => {
        await adminUnskipStudent(student.roll_no);
        router.refresh();
      });
      return;
    }
    const reason = prompt(
      `Mark ${student.name} (Roll ${student.roll_no}) as skipped?\n\nThey'll be passed over in any merit-ordered view.\n\nReason (optional):`,
    );
    if (reason === null) return;
    start(async () => {
      await adminSkipStudent(student.roll_no, reason);
      router.refresh();
    });
  }

  function clearPicks() {
    if (!confirm(`Clear all four rotations for ${student.name}?`)) return;
    start(async () => {
      await adminResetStudent(student.roll_no);
      router.refresh();
    });
  }

  const eligible = student.overall === "Pass";

  return (
    <>
      <tr className={incomplete ? "bg-amber-50" : "hover:bg-[var(--muted)]/50 transition-colors"}>
        <td className="px-4 py-3.5 font-semibold text-[var(--muted-foreground)] tabular-nums">
          {editing ? (
            <div className="flex flex-col gap-0.5">
              <input
                type="number"
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                placeholder="auto"
                className="w-16 rounded-md bg-[var(--muted)] focus:bg-[var(--background)] border-2 border-transparent focus:border-[var(--primary)] px-2 py-1 text-sm font-semibold outline-none transition-all duration-200"
                title="Leave blank to auto-rank by marks"
              />
              <span className="text-[9px] text-[var(--muted-foreground)]">blank = auto</span>
            </div>
          ) : (
            student.rank ?? "—"
          )}
        </td>
        <td className="px-4 py-3.5 font-semibold text-sm tabular-nums">{student.roll_no}</td>
        <td className="px-4 py-3.5">
          {editing ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md bg-[var(--muted)] focus:bg-[var(--background)] border-2 border-transparent focus:border-[var(--primary)] px-2 py-1 text-sm outline-none transition-all duration-200"
            />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[var(--foreground)]">{student.name}</span>
              {student.manual && <Pill tone="primary">Manual</Pill>}
              {student.skipped && <Pill tone="muted">Skipped</Pill>}
              {overridden && <Pill tone="amber">Edited</Pill>}
              {incomplete && <Pill tone="rose">Review</Pill>}
            </div>
          )}
        </td>
        <td className="px-4 py-3.5 text-right tabular-nums font-semibold">
          {editing ? (
            <input
              type="number"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className="w-20 rounded-md bg-[var(--muted)] focus:bg-[var(--background)] border-2 border-transparent focus:border-[var(--primary)] px-2 py-1 text-sm text-right font-semibold outline-none transition-all duration-200"
            />
          ) : (
            student.total ?? "—"
          )}
        </td>
        <td className="px-4 py-3.5 text-center">
          {editing ? (
            <select
              value={overall}
              onChange={(e) => setOverall(e.target.value as "Pass" | "Fail")}
              className="rounded-md bg-[var(--muted)] focus:bg-[var(--background)] border-2 border-transparent focus:border-[var(--primary)] px-2 py-1 text-sm font-semibold text-[var(--foreground)] outline-none transition-all duration-200"
            >
              <option value="Pass">Pass</option>
              <option value="Fail">Fail</option>
            </select>
          ) : (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                student.overall === "Pass"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {student.overall}
            </span>
          )}
        </td>
        <td className="px-4 py-3.5 text-center">
          {submitted ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              Locked
            </span>
          ) : (
            <span className="text-[var(--muted-foreground)] text-xs">—</span>
          )}
        </td>
        <td className="px-4 py-3.5 text-right whitespace-nowrap">
          {editing ? (
            <div className="inline-flex gap-1.5">
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
                  setName(student.name);
                  setTotal(student.total?.toString() ?? "");
                  setOverall(student.overall);
                  setRank(student.rank?.toString() ?? "");
                }}
                className="px-3 py-1.5 rounded-md text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-all duration-200 text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="inline-flex flex-wrap gap-1 justify-end">
              {eligible && (
                <button
                  type="button"
                  onClick={() => setRotOpen((v) => !v)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                    rotOpen
                      ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                      : "bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)]"
                  } hover:scale-105`}
                >
                  {rotOpen ? "Close" : "Rotations"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="px-3 py-1.5 rounded-md text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-all duration-200 font-semibold text-xs"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={changeRoll}
                disabled={pending}
                className="px-3 py-1.5 rounded-md text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-all duration-200 font-semibold text-xs disabled:opacity-50"
              >
                Roll
              </button>
              {eligible && !submitted && (
                <button
                  type="button"
                  onClick={toggleSkip}
                  disabled={pending}
                  className="px-3 py-1.5 rounded-md text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-all duration-200 font-semibold text-xs disabled:opacity-50"
                >
                  {student.skipped ? "Unskip" : "Skip"}
                </button>
              )}
              {canRevert && (
                <button
                  type="button"
                  onClick={revert}
                  disabled={pending}
                  className="px-3 py-1.5 rounded-md text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-all duration-200 font-semibold text-xs disabled:opacity-50"
                  title="Revert edits"
                >
                  Revert
                </button>
              )}
              {(submitted || picks.length > 0) && (
                <button
                  type="button"
                  onClick={clearPicks}
                  disabled={pending}
                  className="px-3 py-1.5 rounded-md text-amber-700 hover:bg-amber-50 transition-all duration-200 font-semibold text-xs disabled:opacity-50"
                  title="Clear all picks and unlock"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={deleteEntry}
                disabled={pending}
                className="px-3 py-1.5 rounded-md text-[var(--danger)] hover:bg-red-50 transition-all duration-200 font-semibold text-xs disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          )}
        </td>
      </tr>
      {error && (
        <tr>
          <td colSpan={7} className="px-4 pb-2 pt-0">
            <div className="rounded-md bg-red-50 text-red-700 px-3 py-1.5 text-xs font-medium">
              {error}
            </div>
          </td>
        </tr>
      )}
      {rotOpen && eligible && (
        <RotationEditor student={rotationStudent} departments={departments} />
      )}
    </>
  );
}

function Pill({
  tone,
  children,
}: {
  tone: "primary" | "muted" | "amber" | "rose";
  children: React.ReactNode;
}) {
  const cls = {
    primary: "bg-blue-50 text-blue-700",
    muted: "bg-gray-100 text-gray-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
  }[tone];
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${cls}`}>
      {children}
    </span>
  );
}
