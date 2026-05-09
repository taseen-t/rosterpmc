import { redirect } from "next/navigation";
import Link from "next/link";
import { getStudentSession } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "Login",
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getStudentSession();
  if (session) redirect("/select");

  return (
    <div className="mx-auto max-w-md px-4 md:px-6 py-12 md:py-20">
      <div className="relative">
        <div className="absolute inset-0 -z-10 rounded-[28px] bg-gradient-to-br from-teal-100/60 via-white to-cream blur-2xl opacity-60" />
        <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_30px_60px_-30px_rgba(11,62,79,0.18)] p-7 md:p-9">
          <div className="flex items-start gap-3 mb-7">
            <span aria-hidden className="inline-flex h-11 w-11 rounded-xl bg-gradient-to-br from-teal-500 via-teal-600 to-navy-800 grid place-items-center shadow-sm ring-1 ring-inset ring-white/20">
              <svg viewBox="0 0 32 32" className="h-7 w-7 text-white" aria-hidden>
                <circle cx="16" cy="16" r="10" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.4" strokeDasharray="2 2.4" strokeLinecap="round" />
                <path d="M16 10v12 M10 16h12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-teal-700 font-semibold">
                Student Sign-in
              </p>
              <h1 className="mt-1 font-display text-2xl font-semibold text-slate-900 tracking-tight">
                Enter your roll number
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                We&apos;ll match it against this year&apos;s passing list.
              </p>
            </div>
          </div>

          <LoginForm />

          <hr className="my-6 border-0 h-px hr-fade" />

          <div className="space-y-2 text-xs text-slate-500 leading-relaxed">
            <p>
              Only candidates marked as{" "}
              <span className="font-medium text-slate-700">Passed</span> in the Final
              Professional MBBS Annual 2025 result can submit selections.
            </p>
            <p>
              Roll number wrong? The MS Office can correct it from the admin panel.
            </p>
          </div>

          <div className="mt-5 flex items-center justify-between text-xs">
            <Link href="/" className="text-teal-700 hover:text-teal-800 hover:underline">
              ← Back to roster
            </Link>
            <span className="text-slate-400 font-mono tracking-tight">
              Allied Hospital · Faisalabad
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
