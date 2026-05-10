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
import { AccessLogDialog } from "./AccessLogDialog";

type StaticMap = Record<
  string,
  { name: string; total: number | null; overall: "Pass" | "Fail"; rank: number | null }
>;

export function StudentEditor({
  students,
  submittedRolls,
  staticStudentMap,
}: {
  students: Student[];
  submittedRolls: string[];
  staticStudentMap: StaticMap;
}) {
  const [filter, setFilter] = useState("");
  const [tab, setTab] = useState<
    "all" | "pass" | "fail" | "submitted" | "issues" | "skipped" | "added"
  >("all");
  const submitted = useMemo(() => new Set(submittedRolls), [submittedRolls]);

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return students.filter((s) => {
      if (tab === "pass" && s.overall !== "Pass") return false;
      if (tab === "fail" && s.overall !== "Fail") return false;
      if (tab === "submitted" && !submitted.has(s.roll_no)) return false;
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

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-200">
        <div className="flex flex-wrap gap-1">
          {(
            [
              "all",
              "pass",
              "fail",
              "submitted",
              "skipped",
              "added",
              "issues",
            ] as const
          ).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs ring-1 transition-colors ${
                tab === t
                  ? "bg-teal-600 text-white ring-teal-600"
                  : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {t === "all"
                ? "All"
                : t === "pass"
                  ? "Pass"
                  : t === "fail"
                    ? "Fail"
                    : t === "submitted"
                      ? "Submitted"
                      : t === "skipped"
                        ? "Skipped"
                        : t === "added"
                          ? "Manually added"
                          : "Needs review"}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search roll, name, reg…"
          className="ml-auto w-full sm:w-64 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
        />
      </div>
      <div className="scrollx">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-3 py-3 font-medium">Rank</th>
              <th className="text-left px-3 py-3 font-medium">Roll</th>
              <th className="text-left px-3 py-3 font-medium">Name</th>
              <th className="text-right px-3 py-3 font-medium">Total</th>
              <th className="text-center px-3 py-3 font-medium">Result</th>
              <th className="text-center px-3 py-3 font-medium">Submitted</th>
              <th className="text-right px-3 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((s) => (
              <StudentRow
                key={s.roll_no}
                student={s}
                submitted={submitted.has(s.roll_no)}
                original={staticStudentMap[s.roll_no]}
              />
            ))}
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-6 text-center text-slate-400 text-sm"
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
  original,
}: {
  student: Student;
  submitted: boolean;
  original?: { name: string; total: number | null; overall: "Pass" | "Fail"; rank: number | null };
}) {
  const [editing, setEditing] = useState(false);
  const [showAccess, setShowAccess] = useState(false);
  const [name, setName] = useState(student.name);
  const [total, setTotal] = useState<string>(student.total?.toString() ?? "");
  const [overall, setOverall] = useState<"Pass" | "Fail">(student.overall);
  const [rank, setRank] = useState<string>(student.rank?.toString() ?? "");
  const [pending, start] = useTransition();
  const router = useRouter();

  const overridden =
    original != null &&
    (original.name !== student.name ||
      original.total !== student.total ||
      original.overall !== student.overall ||
      original.rank !== student.rank);

  const incomplete = !student.manual && (student.subjects.length < 4 || student.total == null);

  function save() {
    start(async () => {
      const r = await adminUpdateStudent(student.roll_no, {
        name: name !== student.name ? name : undefined,
        total: total ? Number(total) : undefined,
        overall: overall !== student.overall ? overall : undefined,
        rank: rank ? Number(rank) : undefined,
      });
      if (!r?.error) {
        setEditing(false);
        router.refresh();
      }
    });
  }

  function allowResubmit() {
    if (
      !confirm(
        `Allow ${student.name} (Roll ${student.roll_no}) to submit again?\n\nTheir current four picks will be cleared. They can log back in and re-pick. (Their account, name, marks, and rank stay the same.)`,
      )
    )
      return;
    start(async () => {
      await adminResetStudent(student.roll_no);
      router.refresh();
    });
  }

  function changeRoll() {
    const next = prompt(
      `Change roll number for ${student.name} (currently ${student.roll_no}).\n\nThis will migrate their selections, Google link, support tickets, and access log to the new roll. Cannot be undone.\n\nNew roll number:`,
      student.roll_no,
    );
    if (!next || next.trim() === student.roll_no) return;
    start(async () => {
      const r = await adminChangeRoll(student.roll_no, next.trim());
      if (r?.error) {
        alert(r.error);
      } else {
        router.refresh();
      }
    });
  }

  function deleteEntry() {
    if (
      !confirm(
        `Permanently delete ${student.name} (Roll ${student.roll_no})?\n\nThis removes them from the roster, drops their picks, unlinks any Google account, and erases their access log. This cannot be undone.`,
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
      `Mark ${student.name} (Roll ${student.roll_no}) as skipped?\n\nThis lets students ranked below them proceed even if this person never submits.\n\nReason (optional):`,
    );
    if (reason === null) return;
    start(async () => {
      await adminSkipStudent(student.roll_no, reason);
      router.refresh();
    });
  }


  return (
    <>
    <tr className={incomplete ? "bg-amber-50/40" : "hover:bg-slate-50/60"}>
      <td className="px-3 py-2.5 font-mono text-slate-500">
        {editing ? (
          <input
            type="number"
            value={rank}
            onChange={(e) => setRank(e.target.value)}
            className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm font-mono"
          />
        ) : (
          student.rank ?? "-"
        )}
      </td>
      <td className="px-3 py-2.5 font-mono">{student.roll_no}</td>
      <td className="px-3 py-2.5">
        {editing ? (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
        ) : (
          <div>
            <span className="text-slate-900">{student.name}</span>
            {student.manual && (
              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-teal-100 text-teal-800 ring-1 ring-teal-200">
                manual
              </span>
            )}
            {student.skipped && (
              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-slate-200 text-slate-700 ring-1 ring-slate-300">
                skipped
              </span>
            )}
            {overridden && (
              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 ring-1 ring-amber-200">
                edited
              </span>
            )}
            {incomplete && (
              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-rose-100 text-rose-800 ring-1 ring-rose-200">
                review
              </span>
            )}
          </div>
        )}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums">
        {editing ? (
          <input
            type="number"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm text-right font-mono"
          />
        ) : (
          student.total ?? "-"
        )}
      </td>
      <td className="px-3 py-2.5 text-center">
        {editing ? (
          <select
            value={overall}
            onChange={(e) => setOverall(e.target.value as "Pass" | "Fail")}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          >
            <option value="Pass">Pass</option>
            <option value="Fail">Fail</option>
          </select>
        ) : (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs ring-1 ${
              student.overall === "Pass"
                ? "bg-emerald-50 ring-emerald-100 text-emerald-700"
                : "bg-rose-50 ring-rose-100 text-rose-700"
            }`}
          >
            {student.overall}
          </span>
        )}
      </td>
      <td className="px-3 py-2.5 text-center">
        {submitted ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-teal-50 text-teal-700 ring-1 ring-teal-100">
            Locked
          </span>
        ) : (
          <span className="text-slate-300 text-xs">-</span>
        )}
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
                setName(student.name);
                setTotal(student.total?.toString() ?? "");
                setOverall(student.overall);
                setRank(student.rank?.toString() ?? "");
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
              onClick={() => setShowAccess(true)}
              className="px-2 py-1 rounded-md text-slate-600 hover:bg-slate-100 text-xs"
              title="View access trail"
            >
              Access
            </button>
            <button
              type="button"
              onClick={changeRoll}
              disabled={pending}
              className="px-2 py-1 rounded-md text-slate-600 hover:bg-slate-100 text-xs disabled:opacity-50"
              title="Change this student's roll number (migrates picks, Google link, etc.)"
            >
              Change roll
            </button>
            {student.overall === "Pass" && !submitted && (
              <button
                type="button"
                onClick={toggleSkip}
                disabled={pending}
                className={`px-2 py-1 rounded-md text-xs disabled:opacity-50 ${
                  student.skipped
                    ? "text-teal-700 hover:bg-teal-50"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
                title={
                  student.skipped
                    ? "Reinstate this student into the rank queue"
                    : "Skip - let lower ranks proceed"
                }
              >
                {student.skipped ? "Unskip" : "Skip"}
              </button>
            )}
            {overridden && (
              <button
                type="button"
                onClick={revert}
                disabled={pending}
                className="px-2 py-1 rounded-md text-slate-500 hover:bg-slate-100 text-xs disabled:opacity-50"
                title="Revert any name/total/rank edits back to the imported values"
              >
                Revert
              </button>
            )}
            {submitted && (
              <button
                type="button"
                onClick={allowResubmit}
                disabled={pending}
                className="px-2 py-1 rounded-md text-amber-700 hover:bg-amber-50 text-xs disabled:opacity-50"
                title="Clear their four picks so they can log back in and pick again"
              >
                Allow re-submit
              </button>
            )}
            <button
              type="button"
              onClick={deleteEntry}
              disabled={pending}
              className="px-2 py-1 rounded-md text-rose-600 hover:bg-rose-50 text-xs disabled:opacity-50"
              title="Permanently delete this entry (removes from roster, picks, Google link, access log)"
            >
              Delete
            </button>
          </>
        )}
      </td>
    </tr>
    {showAccess && (
      <AccessLogDialog
        roll={student.roll_no}
        name={student.name}
        onClose={() => setShowAccess(false)}
      />
    )}
    </>
  );
}
