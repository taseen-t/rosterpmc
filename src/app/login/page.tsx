import { redirect } from "next/navigation";
import Link from "next/link";
import { getStudentSession } from "@/lib/auth";
import { getGoogleSession, googleConfigured } from "@/lib/google";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

const ERR_MESSAGES: Record<string, string> = {
  google_not_configured:
    "Google sign-in isn't set up on this deployment. Contact Support.",
  state_mismatch: "Sign-in expired or was tampered with. Try again.",
  missing_code: "Sign-in didn't return properly. Try again.",
  oauth_failed: "Sign-in failed. Please try again.",
  access_denied: "You denied the Google sign-in.",
  session_expired:
    "Your sign-in expired. Sign in with Google again to continue.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}) {
  const [student, google, qs] = await Promise.all([
    getStudentSession(),
    getGoogleSession(),
    searchParams,
  ]);

  if (student) redirect("/select");
  if (google) redirect("/link-roll");

  const enabled = googleConfigured();
  const errorMsg = qs.err ? ERR_MESSAGES[qs.err] ?? null : null;

  return (
    <div className="mx-auto max-w-md px-4 md:px-6 py-12 md:py-20">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_30px_60px_-30px_rgba(11,62,79,0.18)] p-7 md:p-9">
        <div className="flex items-start gap-3 mb-7">
          <span aria-hidden className="h-12 w-12 rounded-xl bg-gradient-to-br from-teal-500 via-teal-600 to-navy-800 grid place-items-center shadow-sm ring-1 ring-inset ring-white/20 shrink-0">
            <svg viewBox="-2 -2 13 13" className="block h-7 w-7 text-white" aria-hidden preserveAspectRatio="xMidYMid meet">
              <path d="M 6.726 4.5 C 7.955 4.5 8.952 5.498 8.952 6.729 C 8.952 7.959 7.955 8.957 6.726 8.957 L 2.274 8.957 C 1.045 8.957 0.048 7.959 0.048 6.729 C 0.048 5.498 1.045 4.5 2.274 4.5 C 1.045 4.5 0.048 3.502 0.048 2.271 C 0.048 1.041 1.045 0.043 2.274 0.043 L 6.726 0.043 C 7.955 0.043 8.952 1.041 8.952 2.271 C 8.952 3.502 7.955 4.5 6.726 4.5 Z" fill="currentColor"/>
            </svg>
          </span>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-teal-700 font-semibold">
              Roster · Sign in
            </p>
            <h1 className="mt-1 font-display text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
              Continue to your roster
            </h1>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
              Verify with Google. New here? You&apos;ll set your name, CNIC, and
              roll number on the next step.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-lg bg-rose-50 ring-1 ring-rose-100 px-3 py-2 text-sm text-rose-700">
            {errorMsg}
          </div>
        )}

        <a
          href={enabled ? "/api/auth/google" : "#"}
          aria-disabled={!enabled}
          className={`flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-[15px] font-medium text-slate-900 transition-colors shadow-sm ${
            enabled
              ? "hover:bg-slate-50"
              : "opacity-50 cursor-not-allowed pointer-events-none"
          }`}
        >
          <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16.1 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C40.6 36 44 30.5 44 24c0-1.3-.1-2.3-.4-3.5z"/>
          </svg>
          Sign in or sign up with Google
        </a>

        <hr className="my-6 border-0 h-px bg-slate-100" />

        <ul className="space-y-1.5 text-xs text-slate-500 leading-relaxed">
          <li className="flex gap-2">
            <span className="text-teal-600">•</span>
            <span>
              Only candidates marked as{" "}
              <span className="font-medium text-slate-700">Passed</span> in the
              Final Professional MBBS Annual 2025 result can sign in.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-teal-600">•</span>
            <span>
              Future logins go straight to your selection page. The Google account
              you use here will be locked to your roll number.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-teal-600">•</span>
            <span>
              Roll number wrong or can&apos;t sign in?{" "}
              <Link href="/contact" className="text-teal-700 hover:underline">
                Contact Support
              </Link>
              .
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
