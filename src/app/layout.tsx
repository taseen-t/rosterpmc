import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { isAdmin } from "@/lib/auth";
import { MobileNav } from "@/components/MobileNav";
import { LogoMark } from "@/components/Logo";

export const dynamic = "force-dynamic";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const SITE_NAME = "ROSTER · FMU";
const SITE_DESC =
  "Independent allocation roster for FMU House Officers, 2026 to 2027. Four three-month rotations, assigned by merit, published live.";

export const metadata: Metadata = {
  metadataBase: new URL("https://rosterpmc.vercel.app"),
  title: {
    default: `${SITE_NAME} · 2026/27`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  manifest: "/manifest.webmanifest",
  keywords: [
    "FMU",
    "Faisalabad Medical University",
    "PMC",
    "Punjab Medical College",
    "House Officer",
    "House Job",
    "Roster",
    "Allied Hospital",
  ],
  // Next 16 auto-discovers /icon.svg, /apple-icon.svg, /icon-*.png in the
  // app root for the relevant <link rel> tags. We declare explicit overrides
  // for the legacy /favicon.ico and the apple-touch-icon size so older
  // crawlers and iOS pin-to-home both pick it up.
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: ["/icon.svg"],
    apple: [
      { url: "/apple-icon.svg", sizes: "180x180", type: "image/svg+xml" },
    ],
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} · 2026/27`,
    description: SITE_DESC,
    locale: "en_PK",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} · 2026/27`,
    description: SITE_DESC,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#09090B" },
    { media: "(prefers-color-scheme: light)", color: "#09090B" },
  ],
  colorScheme: "dark",
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
      className={`${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        {/* Subtle print-grain overlay across the whole page. */}
        <svg className="noise-overlay" aria-hidden>
          <title>noise</title>
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>

        <header className="relative z-10 border-b-2 border-[var(--border)] bg-[var(--background)]">
          <div className="mx-auto max-w-[95vw] px-4 md:px-6 h-20 flex items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-3 group">
              <LogoMark size={28} className="shrink-0" />
              <span className="font-display text-2xl md:text-[28px] font-bold uppercase tracking-tighter text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors leading-none">
                Roster
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-2 text-sm uppercase tracking-wider font-bold">
              <Link
                href="/"
                className="px-3 py-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                Roster
              </Link>
              {admin ? (
                <Link
                  href="/admin"
                  className="ml-2 inline-flex items-center gap-2 px-5 py-3 bg-[var(--accent)] text-[var(--accent-foreground)] hover:scale-105 active:scale-95 transition-transform font-bold"
                >
                  Admin panel
                </Link>
              ) : (
                <Link
                  href="/admin/login"
                  className="ml-2 inline-flex items-center gap-2 px-5 py-3 border-2 border-[var(--foreground)] text-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-[var(--background)] transition-colors font-bold"
                >
                  Admin login
                </Link>
              )}
            </nav>

            <MobileNav isAdmin={admin} />
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="relative z-10 mt-32 border-t-2 border-[var(--border)]">
          <div className="mx-auto max-w-[95vw] px-4 md:px-6 py-16 grid sm:grid-cols-3 gap-12">
            <div>
              <div className="flex items-center gap-3">
                <LogoMark size={24} />
                <span className="font-display text-xl font-bold uppercase tracking-tighter">
                  Roster · FMU
                </span>
              </div>
              <p className="mt-5 text-[var(--muted-foreground)] leading-relaxed text-sm">
                Independent allocation portal for FMU House Officers, 2026 to
                2027. Maintained by the admin team. For corrections, contact
                your roster administrator directly.
              </p>
            </div>
            <div>
              <p className="eyebrow">Disclaimer</p>
              <p className="mt-3 text-[var(--foreground)] leading-relaxed text-sm">
                Independent, unofficial portal. Not affiliated with the hospital
                administration.
              </p>
            </div>
            <div>
              <p className="eyebrow">Session</p>
              <p className="mt-3 font-bold text-base uppercase tracking-tight text-[var(--foreground)]">
                01 Jun 2026 — 31 May 2027
              </p>
              <p className="text-[var(--muted-foreground)] text-xs mt-1 uppercase tracking-wider">
                Four rotations · three months each.
              </p>
            </div>
          </div>
          <div className="border-t-2 border-[var(--border)]">
            <div className="mx-auto max-w-[95vw] px-4 md:px-6 py-5 flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-widest text-[var(--muted-foreground)]">
              <span>© {new Date().getFullYear()} · Independent portal</span>
              <span>rosterpmc.vercel.app</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
