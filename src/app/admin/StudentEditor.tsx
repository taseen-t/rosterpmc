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
    ["added", "Manually added"],
    ["issues", "Needs review"],
  ];

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-[var(--border)]">
        <div className="flex flex-wrap gap-1">
          {tabs.map(([t, label]) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs tracking-wide transition-colors border ${
                tab === t
                  ? "bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]"
                  : "bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:text-[var(--foreground)] hover:border-[var(--foreground)]"
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
          className="ml-auto w-full sm:w-72 rounded-md border border-[var(--border-strong)] px-3 py-1.5 text-sm focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 outline-none"
        />
      </div>
      <div className="scrollx">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--muted)] text-[var(--muted-foreground)] eyebrow">
            <tr>
              <th className="text-left px-4 py-3 font-normal">Rank</th>
              <th className="text-left px-4 py-3 font-normal">Roll</th>
              <th className="text-left px-4 py-3 font-normal">Name</th>
              <th className="text-right px-4 py-3 font-normal">Total</th>
              <th className="text-center px-4 py-3 font-normal">Result</th>
              <th className="text-center px-4 py-3 font-normal">Finalized</th>
              <th className="text-right px-4 py-3 font-normal">Actions</th>
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
                  className="px-4 py-8 text-center text-[var(--muted-foreground)] text-sm"
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
      <tr className={incomplete ? "bg-[var(--amber-soft)]/60" : "hover:bg-[var(--muted)]/40 transition-colors"}>
        <td className="px-4 py-3 font-mono-label text-[var(--muted-foreground)] text-sm tabular-nums">
          {editing ? (
            <div className="flex flex-col gap-0.5">
              <input
                type="number"
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                placeholder="auto"
                className="w-16 rounded-md border border-[var(--border-strong)] px-2 py-1 text-sm font-mono-label focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 outline-none"
                title="Leave blank to auto-rank by marks"
              />
              <span className="text-[9px] text-[var(--muted-foreground)]">blank = auto</span>
            </div>
          ) : (
            student.rank ?? "—"
          )}
        </td>
        <td className="px-4 py-3 font-mono-label text-sm">{student.roll_no}</td>
        <td className="px-4 py-3">
          {editing ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-[var(--border-strong)] px-2 py-1 text-sm focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 outline-none"
            />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[var(--foreground)]">{student.name}</span>
              {student.manual && <Pill tone="accent">Manual</Pill>}
              {student.skipped && <Pill tone="muted">Skipped</Pill>}
              {overridden && <Pill tone="amber">Edited</Pill>}
              {incomplete && <Pill tone="rose">Review</Pill>}
            </div>
          )}
        </td>
        <td className="px-4 py-3 text-right tabular-nums font-mono-label text-sm">
          {editing ? (
            <input
              type="number"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className="w-20 rounded-md border border-[var(--border-strong)] px-2 py-1 text-sm text-right font-mono-label focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 outline-none"
            />
          ) : (
            student.total ?? "—"
          )}
        </td>
        <td className="px-4 py-3 text-center">
          {editing ? (
            <select
              value={overall}
              onChange={(e) => setOverall(e.target.value as "Pass" | "Fail")}
              className="rounded-md border border-[var(--border-strong)] px-2 py-1 text-sm"
            >
              <option value="Pass">Pass</option>
              <option value="Fail">Fail</option>
            </select>
          ) : (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs border ${
                student.overall === "Pass"
                  ? "bg-[var(--emerald-soft)] border-[var(--emerald)]/30 text-[var(--emerald)]"
                  : "bg-[var(--rose-soft)] border-[var(--rose)]/30 text-[var(--rose)]"
              }`}
            >
              {student.overall}
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-center">
          {submitted ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs border border-[var(--accent)]/40 bg-[var(--accent-muted)]/30 text-[var(--accent)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              Locked
            </span>
          ) : (
            <span className="text-[var(--muted-foreground)] text-xs">—</span>
          )}
        </td>
        <td className="px-4 py-3 text-right whitespace-nowrap">
          {editing ? (
            <div className="inline-flex gap-1">
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
                  setName(student.name);
                  setTotal(student.total?.toString() ?? "");
                  setOverall(student.overall);
                  setRank(student.rank?.toString() ?? "");
                }}
                className="px-3 py-1 rounded-md text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-xs"
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
                  className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
                    rotOpen
                      ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-muted)]/30"
                      : "border-[var(--foreground)] text-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-[var(--background)]"
                  }`}
                >
                  {rotOpen ? "Close rotations" : "Set rotations"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="px-3 py-1 rounded-md text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] text-xs"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={changeRoll}
                disabled={pending}
                className="px-3 py-1 rounded-md text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] text-xs disabled:opacity-50"
              >
                Change roll
              </button>
              {eligible && !submitted && (
                <button
                  type="button"
                  onClick={toggleSkip}
                  disabled={pending}
                  className="px-3 py-1 rounded-md text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] text-xs disabled:opacity-50"
                >
                  {student.skipped ? "Unskip" : "Skip"}
                </button>
              )}
              {canRevert && (
                <button
                  type="button"
                  onClick={revert}
                  disabled={pending}
                  className="px-3 py-1 rounded-md text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] text-xs disabled:opacity-50"
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
                  className="px-3 py-1 rounded-md text-[var(--amber)] hover:bg-[var(--amber-soft)] text-xs disabled:opacity-50"
                  title="Clear all picks and unlock"
                >
                  Clear picks
                </button>
              )}
              <button
                type="button"
                onClick={deleteEntry}
                disabled={pending}
                className="px-3 py-1 rounded-md text-[var(--rose)] hover:bg-[var(--rose-soft)] text-xs disabled:opacity-50"
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
            <div className="rounded-md bg-[var(--rose-soft)] border border-[var(--rose)]/30 px-3 py-1.5 text-xs text-[var(--rose)]">
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
  tone: "accent" | "muted" | "amber" | "rose";
  children: React.ReactNode;
}) {
  const cls = {
    accent: "bg-[var(--accent-muted)]/40 border-[var(--accent)]/40 text-[var(--accent)]",
    muted: "bg-[var(--muted)] border-[var(--border-strong)] text-[var(--muted-foreground)]",
    amber: "bg-[var(--amber-soft)] border-[var(--amber)]/30 text-[var(--amber)]",
    rose: "bg-[var(--rose-soft)] border-[var(--rose)]/30 text-[var(--rose)]",
  }[tone];
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] border tracking-wide ${cls}`}>
      {children}
    </span>
  );
}
