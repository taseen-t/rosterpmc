import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { isAdmin } from "@/lib/auth";
import { MobileNav } from "@/components/MobileNav";
import { LogoMark } from "@/components/Logo";

export const dynamic = "force-dynamic";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const SITE_NAME = "Roster · FMU House Job";
const SITE_DESC =
  "Independent allocation roster for FMU House Officers, 2026 to 2027. Four three-month rotations, assigned by merit, published transparently.";

export const metadata: Metadata = {
  metadataBase: new URL("https://rosterpmc.vercel.app"),
  title: {
    default: `${SITE_NAME} · 2026-27`,
    template: `%s · Roster · FMU`,
  },
  description: SITE_DESC,
  applicationName: "Roster",
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
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: ["/icon.svg"],
    apple: [
      { url: "/apple-icon.svg", sizes: "180x180", type: "image/svg+xml" },
    ],
  },
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
  themeColor: "#FFFFFF",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const admin = await isAdmin();

  return (
    <html lang="en" className={`${outfit.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <header className="sticky top-0 z-30 bg-[var(--background)] border-b border-[var(--border)]">
          <div className="mx-auto max-w-7xl px-4 md:px-6 h-16 md:h-20 flex items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-3 group">
              <LogoMark size={32} className="shrink-0" />
              <span className="font-display text-xl md:text-2xl font-bold text-[var(--foreground)] tracking-tight leading-none">
                Roster
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-2 text-sm font-medium">
              <Link
                href="/"
                className="px-3 py-2 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-all duration-200"
              >
                Roster
              </Link>
              {admin ? (
                <Link
                  href="/admin"
                  className="ml-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-strong)] hover:scale-105 transition-all duration-200 font-semibold"
                >
                  Admin panel
                </Link>
              ) : (
                <Link
                  href="/admin/login"
                  className="ml-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-md border-4 border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] transition-all duration-200 font-semibold"
                >
                  Admin login
                </Link>
              )}
            </nav>

            <MobileNav isAdmin={admin} />
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="mt-24 bg-[var(--dark)] text-[var(--dark-foreground)]">
          <div className="mx-auto max-w-7xl px-4 md:px-6 py-16 grid sm:grid-cols-3 gap-12">
            <div>
              <div className="flex items-center gap-3">
                <LogoMark size={28} tone="dark" />
                <span className="font-display text-xl font-bold tracking-tight">
                  Roster
                </span>
              </div>
              <p className="mt-5 text-[var(--dark-foreground)]/70 leading-relaxed text-sm">
                Independent allocation portal for FMU House Officers, 2026 to
                2027. Maintained by the admin team. For corrections, contact
                your roster administrator directly.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                Disclaimer
              </p>
              <p className="mt-3 text-[var(--dark-foreground)] leading-relaxed text-sm">
                Independent, unofficial portal. Not affiliated with the hospital
                administration.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                Session
              </p>
              <p className="mt-3 text-[var(--dark-foreground)] font-semibold">
                01 Jun 2026 — 31 May 2027
              </p>
              <p className="text-[var(--dark-foreground)]/60 text-xs mt-1">
                Four rotations · three months each.
              </p>
            </div>
          </div>
          <div className="border-t border-[var(--dark-muted)]">
            <div className="mx-auto max-w-7xl px-4 md:px-6 py-5 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--dark-foreground)]/60">
              <span>© {new Date().getFullYear()} · Independent portal · Not officially affiliated.</span>
              <span>rosterpmc.vercel.app</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
