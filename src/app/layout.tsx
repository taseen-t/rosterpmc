import type { Metadata, Viewport } from "next";
import { Onest, Karma, IBM_Plex_Mono, Bree_Serif } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getStudentSession, isAdmin } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin"],
  display: "swap",
});

const karma = Karma({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const breeSerif = Bree_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const ibmMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
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
      className={`${onest.variable} ${ibmMono.variable} ${karma.variable} ${breeSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-ink-900">
        <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-paper/80 bg-paper border-b border-hairline">
          <div className="mx-auto max-w-6xl px-4 md:px-6 h-16 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3 group">
              <span aria-hidden className="relative inline-flex h-10 w-10 rounded-xl bg-ink-900 grid place-items-center ring-1 ring-inset ring-white/10">
                <svg viewBox="0 0 32 32" className="h-7 w-7 text-lime-300" aria-hidden>
                  <circle cx="16" cy="16" r="10" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.4" strokeDasharray="2 2.4" strokeLinecap="round"/>
                  <path d="M16 10v12 M10 16h12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/>
                </svg>
              </span>
              <div className="leading-tight">
                <div className="text-[15px] font-medium text-ink-900 tracking-tight">
                  Roster
                </div>
                <div className="label-overline mt-0.5 !text-ink-400 !text-[10px]">
                  Allied Hospital · Faisalabad
                </div>
              </div>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link href="/" className="px-3 py-1.5 rounded-lg text-ink-700 hover:bg-hairline transition-colors">
                Roster
              </Link>
              <Link href="/contact" className="hidden md:inline-block px-3 py-1.5 rounded-lg text-ink-700 hover:bg-hairline transition-colors">
                Support
              </Link>
              {session ? (
                <>
                  <Link href="/select" className="px-3 py-1.5 rounded-lg text-ink-700 hover:bg-hairline transition-colors">
                    My Selection
                  </Link>
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-hairline text-[11px] font-mono text-ink-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-lime-500" />
                    {session.roll}
                  </span>
                  <LogoutButton />
                </>
              ) : (
                <Link href="/login" className="px-3.5 py-1.5 rounded-lg bg-ink-900 hover:bg-ink-700 text-paper font-medium transition-colors">
                  Login
                </Link>
              )}
              <Link
                href={admin ? "/admin" : "/admin/login"}
                className="hidden sm:inline-block px-3 py-1.5 rounded-lg text-ink-400 hover:bg-hairline text-[11px] uppercase tracking-[0.12em] transition-colors"
              >
                {admin ? "Admin" : "Admin"}
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="mt-20 border-t border-hairline bg-paper">
          <div className="mx-auto max-w-6xl px-4 md:px-6 py-10 grid sm:grid-cols-4 gap-8">
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2">
                <span aria-hidden className="inline-flex h-7 w-7 rounded-lg bg-ink-900 grid place-items-center">
                  <svg viewBox="0 0 32 32" className="h-5 w-5 text-lime-300" aria-hidden>
                    <circle cx="16" cy="16" r="10" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.4" strokeDasharray="2 2.4" strokeLinecap="round"/>
                    <path d="M16 10v12 M10 16h12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/>
                  </svg>
                </span>
                <span className="font-medium text-ink-900">Roster · PMC</span>
              </div>
              <p className="mt-4 text-[15px] text-ink-700 leading-[1.55] max-w-md">
                The official seat-selection system for FMU graduates joining as House
                Officers at Allied Hospital, Faisalabad. Need a correction or can&apos;t
                log in? Use{" "}
                <Link href="/contact" className="underline decoration-lime-500 underline-offset-4 decoration-2 hover:decoration-ink-900 text-ink-900">
                  Contact Support
                </Link>
                .
              </p>
            </div>
            <div>
              <p className="label-overline">Office</p>
              <p className="mt-2 text-[15px] text-ink-700 leading-[1.55]">
                Office of the Medical Superintendent
                <br />
                Allied Hospital, Faisalabad
              </p>
            </div>
            <div>
              <p className="label-overline">Session</p>
              <p className="mt-2 text-[15px] font-mono text-ink-700">
                01 Jun 2026 → 31 May 2027
              </p>
              <p className="text-ink-400 text-[13px] mt-1">
                4 rotations · 3 months each
              </p>
            </div>
          </div>
          <div className="border-t border-hairline">
            <div className="mx-auto max-w-6xl px-4 md:px-6 py-5 flex flex-wrap items-center justify-between gap-3 text-[12px] text-ink-400">
              <span>© {new Date().getFullYear()} · Internal use only.</span>
              <p className="font-display text-[14px] text-ink-700">
                Built by{" "}
                <span className="text-ink-900 font-medium">Dr Rabiya Tariq</span>
                <span aria-hidden className="neon-x">×</span>
                <span className="text-ink-900 font-medium">Mohammad Taseen Tariq</span>
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
