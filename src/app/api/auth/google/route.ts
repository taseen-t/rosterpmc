import { NextResponse } from "next/server";
import { buildGoogleAuthUrl, googleConfigured } from "@/lib/google";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!googleConfigured()) {
    return NextResponse.redirect(
      new URL(
        "/login?err=google_not_configured",
        process.env.GOOGLE_REDIRECT_URI?.replace(/\/api.*/, "") ||
          "https://rosterpmc.vercel.app",
      ),
    );
  }
  const url = await buildGoogleAuthUrl();
  return NextResponse.redirect(url);
}
