import Link from "next/link";
import { getStudentSession } from "@/lib/auth";
import { ContactForm } from "./ContactForm";

export const metadata = { title: "Contact Support" };
export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const session = await getStudentSession();

  return (
    <div className="mx-auto max-w-2xl px-4 md:px-6 py-12 md:py-16">
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-teal-700/80 font-semibold">
          Need help?
        </p>
        <h1 className="mt-1.5 font-display text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">
          Contact Support
        </h1>
        <p className="text-sm text-slate-500 mt-2 max-w-xl leading-relaxed">
          Wrong roll number, misspelled name, missing from the roster, marks need
          correction, can&apos;t log in — drop us a note and an admin will follow up.
          All requests are visible to the admin team.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 md:p-8">
        <ContactForm defaultRoll={session?.roll ?? ""} />
      </div>

      <div className="mt-6 text-center text-xs text-slate-500">
        <Link href="/" className="text-teal-700 hover:underline">
          ← Back to roster
        </Link>
      </div>
    </div>
  );
}
