import { NextRequest, NextResponse } from "next/server";
import {
  consumeState,
  exchangeCode,
  getLinkedRoll,
  setGoogleSession,
  upsertGoogleProfile,
} from "@/lib/google";
import { setStudentSession } from "@/lib/auth";
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
    await setGoogleSession(profile);

    // If this Google account already has a roll linked AND that roll is a
    // valid passing student, log them in directly to /select.
    const linkedRoll = await getLinkedRoll(profile.email);
    if (linkedRoll) {
      const students = await getStudentsWithOverrides();
      const me = students.find((s) => s.roll_no === linkedRoll);
      if (me && me.overall === "Pass") {
        await setStudentSession(linkedRoll);
        await logAccess({
          roll_no: linkedRoll,
          actor: profile.email,
          action: "login_success",
        });
        return NextResponse.redirect(`${origin}/select`);
      }
      // Otherwise fall through to /link-roll so they can re-link.
    }
    return NextResponse.redirect(`${origin}/link-roll`);
  } catch (e) {
    console.error("Google callback error", e);
    return NextResponse.redirect(`${origin}/login?err=oauth_failed`);
  }
}
