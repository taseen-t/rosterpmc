import { NextRequest, NextResponse } from "next/server";
import {
  consumeState,
  exchangeCode,
  getLinkedRoll,
  upsertGoogleProfile,
  mintGoogleToken,
  GOOGLE_COOKIE_NAME,
} from "@/lib/google";
import { mintStudentToken, STUDENT_COOKIE_NAME } from "@/lib/auth";
import { getStudentsWithOverrides } from "@/lib/data";
import { logAccess } from "@/lib/access";

export const dynamic = "force-dynamic";

/**
 * Build a fully-explicit Set-Cookie value. We do this by hand instead of
 * using NextResponse.cookies.set() / cookies().set() helpers because some
 * Next.js / Vercel edge layer setups have been seen to drop the Set-Cookie
 * header on redirect responses when going through those abstractions. The
 * raw header is the lowest-common-denominator that everything respects.
 */
function buildCookieHeader(name: string, value: string, maxAgeSeconds: number): string {
  const isProd = process.env.NODE_ENV === "production";
  const parts = [
    `${name}=${value}`,
    `Path=/`,
    `Max-Age=${maxAgeSeconds}`,
    `HttpOnly`,
    `SameSite=Lax`,
  ];
  if (isProd) parts.push(`Secure`);
  return parts.join("; ");
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const err = req.nextUrl.searchParams.get("error");
  const origin = req.nextUrl.origin;

  if (err) {
    return NextResponse.redirect(`${origin}/login?err=${encodeURIComponent(err)}`);
  }
  if (!code || !state) {
    return NextResponse.redirect(`${origin}/login?err=missing_code`);
  }
  if (!(await consumeState(state))) {
    return NextResponse.redirect(`${origin}/login?err=state_mismatch`);
  }

  try {
    const profile = await exchangeCode(code);
    await upsertGoogleProfile(profile);

    const googleToken = await mintGoogleToken(profile);
    const googleCookie = buildCookieHeader(
      GOOGLE_COOKIE_NAME,
      googleToken,
      60 * 60 * 24 * 30,
    );

    const linkedRoll = await getLinkedRoll(profile.email);
    if (linkedRoll) {
      const students = await getStudentsWithOverrides();
      const me = students.find((s) => s.roll_no === linkedRoll);
      if (me && me.overall === "Pass") {
        const studentToken = await mintStudentToken(linkedRoll);
        const studentCookie = buildCookieHeader(
          STUDENT_COOKIE_NAME,
          studentToken,
          60 * 60 * 24 * 7,
        );
        await logAccess({
          roll_no: linkedRoll,
          actor: profile.email,
          action: "login_success",
        });
        return new Response(null, {
          status: 303,
          headers: [
            ["Location", `${origin}/select`],
            ["Set-Cookie", googleCookie],
            ["Set-Cookie", studentCookie],
          ],
        });
      }
    }

    return new Response(null, {
      status: 303,
      headers: [
        ["Location", `${origin}/link-roll`],
        ["Set-Cookie", googleCookie],
      ],
    });
  } catch (e) {
    console.error("Google callback error", e);
    return NextResponse.redirect(`${origin}/login?err=oauth_failed`);
  }
}
