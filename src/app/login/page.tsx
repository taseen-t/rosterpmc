import { redirect } from "next/navigation";
import Link from "next/link";
import { getStudentSession } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getStudentSession();
  if (session) redirect("/select");

  return (
    <div className="mx-auto max-w-md px-4 md:px-6 py-12 md:py-16">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-teal-50 grid place-items-center ring-1 ring-teal-100">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-teal-700"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Student login</h1>
            <p className="text-sm text-slate-500">Use your FMU roll number.</p>
          </div>
        </div>

        <LoginForm />

        <p className="mt-6 text-xs text-slate-500 leading-relaxed">
          Only candidates marked as <span className="font-medium text-slate-700">Passed</span>{" "}
          in the Final Professional MBBS Annual 2025 result can submit selections. If your
          roll number is wrong, please contact the office (admin can correct it).
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Looking for the public roster?{" "}
          <Link href="/" className="text-teal-700 hover:underline">
            Go to home
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
