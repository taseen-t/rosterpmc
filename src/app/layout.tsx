import type { Metadata, Viewport } from "next";
import { Playfair_Display, Source_Sans_3, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { isAdmin } from "@/lib/auth";
import { MobileNav } from "@/components/MobileNav";

export const dynamic = "force-dynamic";

const displaySerif = Playfair_Display({
  variable: "--font-display-serif",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const bodySans = Source_Sans_3({
  variable: "--font-sans-body",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600"],
});

const labelMono = IBM_Plex_Mono({
  variable: "--font-mono-label",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});

const SITE_NAME = "House Job Roster · FMU";
const SITE_DESC =
  "Independent allocation roster for FMU House Officers (2026-27). Four three-month rotations, assigned by merit, published transparently.";

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
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#FAFAF8" }],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const admin = await isAdmin();

  return (
    <html
      lang="en"
      className={`${displaySerif.variable} ${bodySans.variable} ${labelMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="relative z-20 border-b border-[var(--border)] bg-[var(--background)]/85 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/70">
          <div className="mx-auto max-w-5xl px-6 md:px-8 h-20 flex items-center justify-between gap-6">
            <Link href="/" className="group flex items-center gap-4">
              <span
                aria-hidden
                className="relative h-9 w-9 rounded-full border border-[var(--accent)]/60 grid place-items-center"
              >
                <span className="font-display text-[15px] text-[var(--accent)] leading-none">
                  R
                </span>
              </span>
              <span className="leading-tight">
                <span className="block font-display text-[19px] md:text-[20px] font-semibold tracking-tight text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">
                  Roster
                </span>
                <span className="eyebrow block mt-0.5 text-[10px]">
                  Allied Hospital · Faisalabad
                </span>
              </span>
            </Link>

            {/* Desktop nav — admin-only surface */}
            <nav className="hidden md:flex items-center gap-2 text-sm">
              <Link
                href="/"
                className="px-3 py-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                Roster
              </Link>
              {admin ? (
                <Link
                  href="/admin"
                  className="ml-2 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[var(--foreground)] text-[var(--background)] hover:bg-[var(--accent)] transition-colors font-medium"
                >
                  Admin panel
                </Link>
              ) : (
                <Link
                  href="/admin/login"
                  className="ml-2 inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[var(--foreground)] text-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-[var(--background)] transition-colors font-medium"
                >
                  Admin login
                </Link>
              )}
            </nav>

            <MobileNav isAdmin={admin} />
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="mt-32 border-t border-[var(--border)] bg-[var(--background)]">
          <div className="mx-auto max-w-5xl px-6 md:px-8 py-16 grid sm:grid-cols-3 gap-12 text-sm">
            <div>
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="h-7 w-7 rounded-full border border-[var(--accent)]/60 grid place-items-center"
                >
                  <span className="font-display text-[12px] text-[var(--accent)] leading-none">
                    R
                  </span>
                </span>
                <span className="font-display text-base font-semibold text-[var(--foreground)]">
                  Roster · FMU
                </span>
              </div>
              <p className="mt-5 text-[var(--muted-foreground)] leading-relaxed">
                Independent allocation portal for FMU House Officers, 2026 to 2027.
                Maintained by the admin team. For corrections, contact your roster
                administrator directly.
              </p>
            </div>
            <div>
              <p className="eyebrow">Disclaimer</p>
              <p className="mt-4 text-[var(--foreground)] leading-relaxed">
                Independent, unofficial portal. Not affiliated with the hospital
                administration.
              </p>
            </div>
            <div>
              <p className="eyebrow">Session</p>
              <p className="mt-4 font-mono-label text-[13px] text-[var(--foreground)]">
                01 Jun 2026 — 31 May 2027
              </p>
              <p className="text-[var(--muted-foreground)] text-xs mt-1">
                Four rotations · three months each.
              </p>
            </div>
          </div>
          <div className="border-t border-[var(--border)]">
            <div className="mx-auto max-w-5xl px-6 md:px-8 py-6 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--muted-foreground)]">
              <span>© {new Date().getFullYear()} · Independent portal · Not officially affiliated.</span>
              <span className="font-mono-label tracking-wide">rosterpmc.vercel.app</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
