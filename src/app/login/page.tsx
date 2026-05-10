import { redirect } from "next/navigation";
import Link from "next/link";
import { getStudentSession } from "@/lib/auth";
import { LoginForms } from "./LoginForms";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const student = await getStudentSession();
  if (student) redirect("/select");

  return (
    <div className="mx-auto max-w-md px-4 md:px-6 py-12 md:py-16">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_30px_60px_-30px_rgba(11,62,79,0.18)] p-7 md:p-9">
        <div className="flex items-start gap-3 mb-6">
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
              Already registered? Sign in with your CNIC. New here? Create
              your account first time only.
            </p>
          </div>
        </div>

        <LoginForms />

        <hr className="my-6 border-0 h-px bg-slate-100" />

        <ul className="space-y-1.5 text-xs text-slate-500 leading-relaxed">
          <li className="flex gap-2">
            <span className="text-teal-600">•</span>
            <span>
              Only candidates marked as{" "}
              <span className="font-medium text-slate-700">Passed</span> in the
              Final Professional MBBS Annual 2025 result can register.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-teal-600">•</span>
            <span>
              Your CNIC is the key. Future logins are just CNIC, no roll
              number needed.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-teal-600">•</span>
            <span>
              Trouble?{" "}
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
