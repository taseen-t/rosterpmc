import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getAccessLog, getAccessSummary } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const roll = req.nextUrl.searchParams.get("roll");
  if (!roll || !/^\d{4,8}$/.test(roll)) {
    return NextResponse.json({ error: "Invalid roll" }, { status: 400 });
  }
  const [rows, summary] = await Promise.all([
    getAccessLog(roll, 200),
    getAccessSummary(roll),
  ]);
  return NextResponse.json({ rows, summary });
}
