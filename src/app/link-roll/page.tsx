import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getGoogleSession } from "@/lib/google";
import { getStudentSession } from "@/lib/auth";
import { LinkRollForm } from "./LinkRollForm";

export const metadata = { title: "Link your roll number" };
export const dynamic = "force-dynamic";

export default async function LinkRollPage() {
  const [google, student] = await Promise.all([
    getGoogleSession(),
    getStudentSession(),
  ]);

  if (!google) redirect("/login");
  if (student) redirect("/select");

  return (
    <div className="mx-auto max-w-md px-4 md:px-6 py-12 md:py-20">
      <div className="rounded-2xl border border-hairline bg-paper shadow-sm p-7 md:p-9">
        <div className="flex items-center gap-3 mb-6">
          {google.picture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={google.picture}
              alt={google.name}
              width={44}
              height={44}
              className="rounded-full ring-2 ring-lime-300"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-11 w-11 rounded-full bg-cream ring-2 ring-lime-300 grid place-items-center text-ink-700 font-medium">
              {google.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-400 font-medium">
              Welcome
            </p>
            <p className="truncate text-ink-900 font-medium">{google.name}</p>
            <p className="truncate text-xs text-ink-400 font-mono">{google.email}</p>
          </div>
        </div>

        <h1 className="font-display h2-title text-ink-900">
          Now enter your roll number
        </h1>
        <p className="mt-2 text-sm text-ink-600 leading-relaxed">
          We&apos;ll link this Google account to your FMU roll number so you can
          select rotations. This link is permanent - choose carefully.
        </p>

        <div className="mt-6">
          <LinkRollForm />
        </div>

        <div className="mt-6 flex items-center justify-between text-xs">
          <Link href="/" className="text-ink-400 hover:text-ink-700">
            ← Back to roster
          </Link>
          <Link href="/api/auth/google/logout" className="text-ink-400 hover:text-rose-700">
            Use a different Google account
          </Link>
        </div>
      </div>
    </div>
  );
}
