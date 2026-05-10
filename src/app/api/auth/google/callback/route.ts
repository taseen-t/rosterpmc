import { NextRequest, NextResponse } from "next/server";
import {
  consumeState,
  exchangeCode,
  getLinkedRoll,
  upsertGoogleProfile,
  mintGoogleToken,
  googleCookieOptions,
  GOOGLE_COOKIE_NAME,
} from "@/lib/google";
import {
  mintStudentToken,
  studentCookieOptions,
  STUDENT_COOKIE_NAME,
} from "@/lib/auth";
import { getStudentsWithOverrides } from "@/lib/data";
import { logAccess } from "@/lib/access";

export const dynamic = "force-dynamic";

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

    // If this Google account already has a roll linked AND that roll is a
    // valid passing student, log them in directly to /select.
    const linkedRoll = await getLinkedRoll(profile.email);
    if (linkedRoll) {
      const students = await getStudentsWithOverrides();
      const me = students.find((s) => s.roll_no === linkedRoll);
      if (me && me.overall === "Pass") {
        const studentToken = await mintStudentToken(linkedRoll);
        await logAccess({
          roll_no: linkedRoll,
          actor: profile.email,
          action: "login_success",
        });
        const res = NextResponse.redirect(`${origin}/select`);
        // Set cookies *on the response* — the cookies() helper from
        // next/headers can drop Set-Cookie on redirect responses, which is
        // why some users were getting "session expired" on the very first
        // form submit. Setting on NextResponse.cookies is bulletproof.
        res.cookies.set(GOOGLE_COOKIE_NAME, googleToken, googleCookieOptions());
        res.cookies.set(STUDENT_COOKIE_NAME, studentToken, studentCookieOptions());
        return res;
      }
    }

    const res = NextResponse.redirect(`${origin}/link-roll`);
    res.cookies.set(GOOGLE_COOKIE_NAME, googleToken, googleCookieOptions());
    return res;
  } catch (e) {
    console.error("Google callback error", e);
    return NextResponse.redirect(`${origin}/login?err=oauth_failed`);
  }
}
