import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
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

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "WONK"],
});

const SITE_NAME = "Allied Hospital House Job Portal";
const SITE_DESC =
  "Online seat selection portal for FMU House Officers (2026-27) at Allied Hospital, Faisalabad. Pick your four 3-month rotations live, by merit.";

export const metadata: Metadata = {
  metadataBase: new URL("https://rosterpmc.vercel.app"),
  title: {
    default: `${SITE_NAME} · FMU 2026-27`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  keywords: [
    "Allied Hospital Faisalabad",
    "House Job",
    "FMU",
    "Faisalabad Medical University",
    "PMC",
    "Punjab Medical College",
    "House Officer",
    "Seat Selection",
    "Roster",
  ],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} · FMU 2026-27`,
    description: SITE_DESC,
    locale: "en_PK",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} · FMU 2026-27`,
    description: SITE_DESC,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0c6b5f" },
    { media: "(prefers-color-scheme: dark)", color: "#0b3d4f" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [session, admin] = await Promise.all([getStudentSession(), isAdmin()]);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream">
        <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-white/75 bg-white border-b border-slate-200/80">
          <div className="mx-auto max-w-6xl px-4 md:px-6 h-16 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3 group">
              <span aria-hidden className="relative inline-flex h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 via-teal-600 to-navy-800 grid place-items-center shadow-[0_2px_10px_-2px_rgba(11,62,79,0.45)] ring-1 ring-inset ring-white/20">
                <svg viewBox="0 0 32 32" className="h-7 w-7 text-white" aria-hidden>
                  <circle cx="16" cy="16" r="10" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.4" strokeDasharray="2 2.4" strokeLinecap="round"/>
                  <path d="M16 10v12 M10 16h12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/>
                </svg>
              </span>
              <div className="leading-tight">
                <div className="text-sm md:text-[15px] font-semibold text-slate-900 group-hover:text-teal-700 transition-colors tracking-tight">
                  Roster · House Job Portal
                </div>
                <div className="text-[10px] md:text-[11px] uppercase tracking-[0.14em] text-slate-500">
                  Allied Hospital · Faisalabad
                </div>
              </div>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link href="/" className="px-3 py-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors">
                Roster
              </Link>
              {session ? (
                <>
                  <Link href="/select" className="px-3 py-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors">
                    My Selection
                  </Link>
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 text-[11px] font-mono text-slate-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                    {session.roll}
                  </span>
                  <LogoutButton />
                </>
              ) : (
                <Link href="/login" className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium transition-colors shadow-sm">
                  Login
                </Link>
              )}
              <Link
                href={admin ? "/admin" : "/admin/login"}
                className="hidden sm:inline-block px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 text-[11px] uppercase tracking-wider transition-colors"
              >
                {admin ? "Admin" : "Admin"}
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="mt-16 border-t border-slate-200 bg-white/70">
          <div className="mx-auto max-w-6xl px-4 md:px-6 py-8 grid sm:grid-cols-3 gap-6 text-sm">
            <div>
              <div className="flex items-center gap-2">
                <span aria-hidden className="inline-flex h-7 w-7 rounded-lg bg-gradient-to-br from-teal-500 via-teal-600 to-navy-800 grid place-items-center ring-1 ring-inset ring-white/15">
                  <svg viewBox="0 0 32 32" className="h-5 w-5 text-white" aria-hidden>
                    <circle cx="16" cy="16" r="10" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.4" strokeDasharray="2 2.4" strokeLinecap="round"/>
                    <path d="M16 10v12 M10 16h12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/>
                  </svg>
                </span>
                <span className="font-semibold text-slate-900">Roster · PMC</span>
              </div>
              <p className="mt-3 text-slate-600 leading-relaxed">
                The official seat-selection system for FMU graduates joining as House
                Officers at Allied Hospital, Faisalabad.
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Office</p>
              <p className="mt-2 text-slate-700 leading-relaxed">
                Office of the Medical Superintendent
                <br />
                Allied Hospital, Faisalabad
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Session</p>
              <p className="mt-2 text-slate-700 font-mono">
                01 Jun 2026 → 31 May 2027
              </p>
              <p className="text-slate-500 text-xs mt-1">
                4 rotations of 3 months each.
              </p>
            </div>
          </div>
          <div className="border-t border-slate-200/80">
            <div className="mx-auto max-w-6xl px-4 md:px-6 py-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>© {new Date().getFullYear()} · For internal use of Allied Hospital, Faisalabad.</span>
              <span>Issues? Contact the MS Office.</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
