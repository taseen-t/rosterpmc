import { NextResponse } from "next/server";
import { clearGoogleSession } from "@/lib/google";
import { clearStudentSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  await clearGoogleSession();
  await clearStudentSession();
  return NextResponse.redirect(
    new URL(
      "/login",
      process.env.GOOGLE_REDIRECT_URI?.replace(/\/api.*/, "") ||
        "https://rosterpmc.vercel.app",
    ),
  );
}
