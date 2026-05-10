import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getStudentSession, isAdmin } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { MobileNav } from "@/components/MobileNav";
import { NotificationBell } from "@/components/NotificationBell";
import { ADMIN_RECIPIENT, getNotifications } from "@/lib/notifications";

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

const SITE_NAME = "House Job Roster · FMU";
const SITE_DESC =
  "Independent seat-selection portal for FMU House Officers (2026-27). Pick your four 3-month rotations live, by merit.";

export const metadata: Metadata = {
  metadataBase: new URL("https://rosterpmc.vercel.app"),
  title: {
    default: `${SITE_NAME} · 2026-27`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  keywords: [
    "FMU",
    "Faisalabad Medical University",
    "PMC",
    "Punjab Medical College",
    "House Officer",
    "House Job",
    "Seat Selection",
    "Roster",
  ],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} · 2026-27`,
    description: SITE_DESC,
    locale: "en_PK",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} · 2026-27`,
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

  // Load notifications best-effort. If the DB hiccups, the bell just doesn't
  // render — we don't want a header to crash the whole shell. Student and
  // admin notifications are tracked separately, so fetch each one when the
  // matching session is active.
  type Notifs = Awaited<ReturnType<typeof getNotifications>>;
  const safeFetch = async (recipient: string | null): Promise<Notifs | null> => {
    if (!recipient) return null;
    try {
      return await getNotifications(recipient);
    } catch {
      return null;
    }
  };
  const [studentNotifs, adminNotifs] = await Promise.all([
    safeFetch(session?.roll ?? null),
    safeFetch(admin ? ADMIN_RECIPIENT : null),
  ]);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream">
        <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-white/80 bg-white border-b border-slate-200/80">
          <div className="mx-auto max-w-6xl px-4 md:px-6 h-16 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3 group">
              <span aria-hidden className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 via-teal-600 to-navy-800 grid place-items-center shadow-[0_2px_10px_-2px_rgba(11,62,79,0.45)] ring-1 ring-inset ring-white/20 shrink-0">
                <svg viewBox="-2 -2 13 13" className="block h-6 w-6 text-white" aria-hidden preserveAspectRatio="xMidYMid meet">
                  <path d="M 6.726 4.5 C 7.955 4.5 8.952 5.498 8.952 6.729 C 8.952 7.959 7.955 8.957 6.726 8.957 L 2.274 8.957 C 1.045 8.957 0.048 7.959 0.048 6.729 C 0.048 5.498 1.045 4.5 2.274 4.5 C 1.045 4.5 0.048 3.502 0.048 2.271 C 0.048 1.041 1.045 0.043 2.274 0.043 L 6.726 0.043 C 7.955 0.043 8.952 1.041 8.952 2.271 C 8.952 3.502 7.955 4.5 6.726 4.5 Z" fill="currentColor"/>
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

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1 text-sm">
              <Link href="/" className="px-3 py-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors">
                Roster
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium transition-colors shadow-sm"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-9 8.49 8.5 8.5 0 0 1-7.6-3.46L3 21l1.5-3.4A8.5 8.5 0 0 1 21 11.5z" />
                </svg>
                Contact Support
              </Link>
              {session ? (
                <>
                  <Link href="/select" className="px-3 py-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors">
                    My Selection
                  </Link>
                  {studentNotifs && (
                    <NotificationBell
                      initialItems={studentNotifs.items}
                      initialUnread={studentNotifs.unread}
                      variant="student"
                    />
                  )}
                  <span className="hidden lg:inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 text-[11px] font-mono text-slate-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                    {session.roll}
                  </span>
                  <LogoutButton />
                </>
              ) : (
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors"
                >
                  Login
                </Link>
              )}
              {admin && adminNotifs && (
                <NotificationBell
                  initialItems={adminNotifs.items}
                  initialUnread={adminNotifs.unread}
                  variant="student"
                />
              )}
              <Link
                href={admin ? "/admin" : "/admin/login"}
                className="px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 text-[11px] uppercase tracking-wider transition-colors"
              >
                {admin ? "Admin" : "Admin"}
              </Link>
            </nav>

            <MobileNav
              signedIn={Boolean(session)}
              rollNo={session?.roll ?? null}
              isAdmin={admin}
            />
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="mt-16 border-t border-slate-200 bg-white/70">
          <div className="mx-auto max-w-6xl px-4 md:px-6 py-8 grid sm:grid-cols-3 gap-6 text-sm">
            <div>
              <div className="flex items-center gap-2">
                <span aria-hidden className="h-7 w-7 rounded-lg bg-gradient-to-br from-teal-500 via-teal-600 to-navy-800 grid place-items-center ring-1 ring-inset ring-white/15">
                  <svg viewBox="-1 -1 11 11" className="block h-3.5 w-3.5 text-white" aria-hidden>
                    <path d="M 6.726 4.5 C 7.955 4.5 8.952 5.498 8.952 6.729 C 8.952 7.959 7.955 8.957 6.726 8.957 L 2.274 8.957 C 1.045 8.957 0.048 7.959 0.048 6.729 C 0.048 5.498 1.045 4.5 2.274 4.5 C 1.045 4.5 0.048 3.502 0.048 2.271 C 0.048 1.041 1.045 0.043 2.274 0.043 L 6.726 0.043 C 7.955 0.043 8.952 1.041 8.952 2.271 C 8.952 3.502 7.955 4.5 6.726 4.5 Z" fill="currentColor"/>
                  </svg>
                </span>
                <span className="font-semibold text-slate-900">Roster · PMC</span>
              </div>
              <p className="mt-3 text-slate-600 leading-relaxed max-w-md">
                Independent, unofficial portal for FMU graduates. Need a correction or
                can&apos;t log in? Use{" "}
                <Link href="/contact" className="text-teal-700 hover:underline">
                  Contact Support
                </Link>
                .
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Disclaimer</p>
              <p className="mt-2 text-slate-700 leading-relaxed">
                Independent, unofficial portal.
                <br />
                Not affiliated with the hospital administration.
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Session</p>
              <p className="mt-2 text-slate-700 font-mono">
                01 Jun 2026 to 31 May 2027
              </p>
              <p className="text-slate-500 text-xs mt-1">
                4 rotations of 3 months each.
              </p>
            </div>
          </div>
          <div className="border-t border-slate-200/80">
            <div className="mx-auto max-w-6xl px-4 md:px-6 py-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>© {new Date().getFullYear()} · Independent portal · Not officially affiliated.</span>
              <span className="font-mono">rosterpmc.vercel.app</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
