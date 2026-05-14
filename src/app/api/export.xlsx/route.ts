import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { isAdmin } from "@/lib/auth";
import { getStudentsWithOverrides } from "@/lib/data";
import { getAllSelections, getSubmittedSet } from "@/lib/selections";

export const dynamic = "force-dynamic";

const ROTATION_LABELS: Record<number, string> = {
  1: "R1 (Jun-Aug)",
  2: "R2 (Sep-Nov)",
  3: "R3 (Dec-Feb)",
  4: "R4 (Mar-May)",
};

export async function GET() {
  if (!(await isAdmin())) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const [students, selections, submittedSet] = await Promise.all([
    getStudentsWithOverrides(),
    getAllSelections(),
    getSubmittedSet(),
  ]);

  // Build per-roll selection map
  const byRoll = new Map<string, Map<number, string>>();
  for (const s of selections) {
    if (!byRoll.has(s.roll_no)) byRoll.set(s.roll_no, new Map());
    byRoll.get(s.roll_no)!.set(s.rotation, s.department);
  }

  // Sort: passes ranked first, then fails by roll
  const passes = students
    .filter((s) => s.overall === "Pass" && s.rank != null)
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  const fails = students
    .filter((s) => s.overall !== "Pass")
    .sort((a, b) => Number(a.roll_no) - Number(b.roll_no));

  const headers = [
    "Rank",
    "Roll No",
    "Name",
    "Total /1500",
    "Result",
    "Finalized",
    "Source",
    ROTATION_LABELS[1],
    ROTATION_LABELS[2],
    ROTATION_LABELS[3],
    ROTATION_LABELS[4],
  ];

  type Row = (string | number | null)[];
  const rows: Row[] = [headers];

  for (const s of [...passes, ...fails]) {
    const picks = byRoll.get(s.roll_no);
    rows.push([
      s.rank ?? "",
      s.roll_no,
      s.name,
      s.total ?? "",
      s.overall,
      submittedSet.has(s.roll_no) ? "Yes" : "",
      s.manual ? "Manual" : "OCR",
      picks?.get(1) ?? "",
      picks?.get(2) ?? "",
      picks?.get(3) ?? "",
      picks?.get(4) ?? "",
    ]);
  }

  // Build workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  // Column widths
  ws["!cols"] = [
    { wch: 6 }, // Rank
    { wch: 9 }, // Roll
    { wch: 28 }, // Name
    { wch: 11 }, // Total
    { wch: 8 }, // Result
    { wch: 11 }, // Submitted
    { wch: 8 }, // Source
    { wch: 26 }, // R1
    { wch: 26 }, // R2
    { wch: 26 }, // R3
    { wch: 26 }, // R4
  ];
  // Freeze header row
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, ws, "Roster");

  // Second sheet: department totals
  const deptHeaders = ["Department", "Capacity (per rotation)", "R1 filled", "R2 filled", "R3 filled", "R4 filled"];
  const byDept = new Map<string, number[]>();
  for (const sel of selections) {
    if (!byDept.has(sel.department)) byDept.set(sel.department, [0, 0, 0, 0]);
    byDept.get(sel.department)![sel.rotation - 1]++;
  }
  const deptRows: Row[] = [deptHeaders];
  for (const [dept, counts] of byDept.entries()) {
    deptRows.push([dept, "", ...counts]);
  }
  const deptSheet = XLSX.utils.aoa_to_sheet(deptRows);
  deptSheet["!cols"] = [
    { wch: 30 },
    { wch: 22 },
    { wch: 11 },
    { wch: 11 },
    { wch: 11 },
    { wch: 11 },
  ];
  XLSX.utils.book_append_sheet(wb, deptSheet, "Departments");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `roster-${stamp}.xlsx`;

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
