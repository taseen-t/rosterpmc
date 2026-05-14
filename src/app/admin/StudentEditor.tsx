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
    <div className="border-2 border-[var(--border)]">
      <div className="flex flex-wrap items-center gap-3 p-4 border-b-2 border-[var(--border)]">
        <div className="flex flex-wrap gap-2">
          {tabs.map(([t, label]) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-xs uppercase tracking-tighter font-bold transition-colors border-2 ${
                tab === t
                  ? "bg-[var(--accent)] text-[var(--accent-foreground)] border-[var(--accent)]"
                  : "bg-transparent text-[var(--muted-foreground)] border-[var(--border)] hover:text-[var(--foreground)] hover:border-[var(--foreground)]"
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
          placeholder="SEARCH ROLL · NAME · REG"
          className="ml-auto w-full sm:w-72 border-2 border-[var(--border)] bg-transparent px-3 py-2 text-sm uppercase tracking-tighter font-bold text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)] outline-none"
        />
      </div>
      <div className="scrollx">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--muted)] eyebrow">
            <tr>
              <th className="text-left px-4 py-4 font-bold uppercase tracking-widest">Rank</th>
              <th className="text-left px-4 py-4 font-bold uppercase tracking-widest">Roll</th>
              <th className="text-left px-4 py-4 font-bold uppercase tracking-widest">Name</th>
              <th className="text-right px-4 py-4 font-bold uppercase tracking-widest">Total</th>
              <th className="text-center px-4 py-4 font-bold uppercase tracking-widest">Result</th>
              <th className="text-center px-4 py-4 font-bold uppercase tracking-widest">Locked</th>
              <th className="text-right px-4 py-4 font-bold uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-[var(--border)]">
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
                  className="px-4 py-12 text-center text-[var(--muted-foreground)] uppercase tracking-widest text-sm"
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
      <tr className={incomplete ? "bg-[var(--amber)]/10" : "hover:bg-[var(--muted)]/40 transition-colors"}>
        <td className="px-4 py-3.5 font-bold text-[var(--muted-foreground)] tabular-nums">
          {editing ? (
            <div className="flex flex-col gap-0.5">
              <input
                type="number"
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                placeholder="auto"
                className="w-16 border-2 border-[var(--border)] bg-transparent px-2 py-1 text-sm font-bold focus:border-[var(--accent)] outline-none"
                title="Leave blank to auto-rank by marks"
              />
              <span className="text-[9px] uppercase tracking-widest text-[var(--muted-foreground)]">blank = auto</span>
            </div>
          ) : (
            student.rank ?? "—"
          )}
        </td>
        <td className="px-4 py-3.5 font-bold text-sm tabular-nums">{student.roll_no}</td>
        <td className="px-4 py-3.5">
          {editing ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border-2 border-[var(--border)] bg-transparent px-2 py-1 text-sm focus:border-[var(--accent)] outline-none text-[var(--foreground)]"
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
        <td className="px-4 py-3.5 text-right tabular-nums font-bold">
          {editing ? (
            <input
              type="number"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className="w-20 border-2 border-[var(--border)] bg-transparent px-2 py-1 text-sm text-right font-bold focus:border-[var(--accent)] outline-none"
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
              className="border-2 border-[var(--border)] bg-transparent px-2 py-1 text-sm uppercase tracking-tight font-bold text-[var(--foreground)] focus:border-[var(--accent)] outline-none"
            >
              <option value="Pass">Pass</option>
              <option value="Fail">Fail</option>
            </select>
          ) : (
            <span
              className={`inline-flex items-center px-2 py-0.5 text-[10px] uppercase tracking-widest font-bold border-2 ${
                student.overall === "Pass"
                  ? "border-[var(--emerald)] text-[var(--emerald)]"
                  : "border-[var(--rose)] text-[var(--rose)]"
              }`}
            >
              {student.overall}
            </span>
          )}
        </td>
        <td className="px-4 py-3.5 text-center">
          {submitted ? (
            <span className="inline-flex items-center px-2 py-0.5 bg-[var(--accent)] text-[var(--accent-foreground)] text-[10px] uppercase tracking-widest font-bold">
              Locked
            </span>
          ) : (
            <span className="text-[var(--muted-foreground)] text-xs">—</span>
          )}
        </td>
        <td className="px-4 py-3.5 text-right whitespace-nowrap">
          {editing ? (
            <div className="inline-flex gap-1">
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
                  setName(student.name);
                  setTotal(student.total?.toString() ?? "");
                  setOverall(student.overall);
                  setRank(student.rank?.toString() ?? "");
                }}
                className="px-3 py-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] uppercase tracking-wider text-xs"
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
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-tighter border-2 transition-colors ${
                    rotOpen
                      ? "border-[var(--accent)] text-[var(--accent)] bg-transparent"
                      : "border-[var(--foreground)] text-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-[var(--background)]"
                  }`}
                >
                  {rotOpen ? "Close" : "Rotations"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="px-3 py-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] uppercase tracking-wider font-bold text-xs"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={changeRoll}
                disabled={pending}
                className="px-3 py-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] uppercase tracking-wider font-bold text-xs disabled:opacity-50"
              >
                Roll
              </button>
              {eligible && !submitted && (
                <button
                  type="button"
                  onClick={toggleSkip}
                  disabled={pending}
                  className="px-3 py-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] uppercase tracking-wider font-bold text-xs disabled:opacity-50"
                >
                  {student.skipped ? "Unskip" : "Skip"}
                </button>
              )}
              {canRevert && (
                <button
                  type="button"
                  onClick={revert}
                  disabled={pending}
                  className="px-3 py-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] uppercase tracking-wider font-bold text-xs disabled:opacity-50"
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
                  className="px-3 py-1.5 text-[var(--amber)] uppercase tracking-wider font-bold text-xs hover:text-[var(--foreground)] disabled:opacity-50"
                  title="Clear all picks and unlock"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={deleteEntry}
                disabled={pending}
                className="px-3 py-1.5 text-[var(--rose)] uppercase tracking-wider font-bold text-xs hover:text-[var(--foreground)] disabled:opacity-50"
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
            <div className="border-2 border-[var(--rose)] px-3 py-1.5 text-xs text-[var(--rose)] uppercase tracking-wider font-bold">
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
    accent: "border-[var(--accent)] text-[var(--accent)]",
    muted: "border-[var(--border-strong)] text-[var(--muted-foreground)]",
    amber: "border-[var(--amber)] text-[var(--amber)]",
    rose: "border-[var(--rose)] text-[var(--rose)]",
  }[tone];
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 text-[9px] uppercase tracking-widest border-2 font-bold ${cls}`}>
      {children}
    </span>
  );
}
