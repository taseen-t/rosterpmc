import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Debug-only: returns what the server saw on the request — cookie names,
 * relevant headers, and detected user agent. Helps diagnose why a
 * Set-Cookie isn't sticking. Intentionally NOT admin-gated so you can hit
 * it before signing in. Doesn't expose cookie *values*, only their names.
 */
export async function GET(req: NextRequest) {
  const cookies = req.cookies.getAll().map((c) => c.name);
  return NextResponse.json({
    cookieNames: cookies,
    hasStudentSession: cookies.includes("ho_session"),
    hasAdminSession: cookies.includes("ho_admin"),
    userAgent: req.headers.get("user-agent"),
    referer: req.headers.get("referer"),
    origin: req.headers.get("origin"),
    host: req.headers.get("host"),
    vercelIp: req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for"),
    vercelGeo: {
      country: req.headers.get("x-vercel-ip-country"),
      city: req.headers.get("x-vercel-ip-city"),
    },
    timestamp: new Date().toISOString(),
  });
}
