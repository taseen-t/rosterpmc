import { NextResponse } from "next/server";

// We serve the manifest as a route handler instead of a static file so it
// stays in lockstep with the rest of the app's branding without having to
// touch /public. Next 16 picks up `manifest: "/manifest.webmanifest"` from
// the metadata and adds the <link rel="manifest"> tag automatically.

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json({
    name: "Roster · FMU House Job",
    short_name: "Roster",
    description:
      "Independent allocation roster for FMU House Officers, 2026 to 2027.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090B",
    theme_color: "#09090B",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon.svg",
        sizes: "180x180",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  });
}
