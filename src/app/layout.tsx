import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getStudentSession, isAdmin } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "House Job Selection — Allied Hospital, Faisalabad",
  description: "Online seat selection portal for FMU House Officers (2026-27).",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [session, admin] = await Promise.all([getStudentSession(), isAdmin()]);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 md:px-6 h-16 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 grid place-items-center shadow-sm">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <div className="leading-tight">
                <div className="text-sm md:text-base font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">
                  House Job Portal
                </div>
                <div className="text-[11px] md:text-xs text-slate-500">
                  Allied Hospital, Faisalabad — FMU 2026-27
                </div>
              </div>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/"
                className="px-3 py-1.5 rounded-md text-slate-700 hover:bg-slate-100"
              >
                Roster
              </Link>
              {session ? (
                <>
                  <Link
                    href="/select"
                    className="px-3 py-1.5 rounded-md text-slate-700 hover:bg-slate-100"
                  >
                    My Selection
                  </Link>
                  <span className="hidden sm:inline px-2 text-xs text-slate-500">
                    Roll #{session.roll}
                  </span>
                  <LogoutButton />
                </>
              ) : (
                <Link
                  href="/login"
                  className="px-3 py-1.5 rounded-md bg-teal-600 text-white hover:bg-teal-700"
                >
                  Login
                </Link>
              )}
              <Link
                href={admin ? "/admin" : "/admin/login"}
                className="px-3 py-1.5 rounded-md text-slate-500 hover:bg-slate-100 text-xs"
              >
                {admin ? "Admin" : "Admin login"}
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 md:px-6 h-14 flex items-center justify-between text-xs text-slate-500">
            <span>Office of the Medical Superintendent · Allied Hospital, Faisalabad</span>
            <span className="hidden sm:inline">
              For technical support, contact the office.
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
