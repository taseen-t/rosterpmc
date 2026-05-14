import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "House Job Roster · FMU — assigned by merit, published transparently";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "80px 96px",
          background: "#FAFAF8",
          color: "#1A1A1A",
          fontFamily: "Georgia, serif",
          position: "relative",
        }}
      >
        {/* Decorative paper grain — very subtle */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(rgba(26,26,26,0.04) 1px, transparent 1px)",
            backgroundSize: "3px 3px",
            display: "flex",
          }}
        />

        {/* Top mark */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 999,
              border: "1.5px solid #B8860B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#B8860B",
              fontSize: 28,
              fontFamily: "Georgia, serif",
            }}
          >
            R
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: 14,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: "#6B6B6B",
                fontFamily: "monospace",
              }}
            >
              Allied Hospital · Faisalabad
            </span>
            <span style={{ fontSize: 26, color: "#1A1A1A", marginTop: 2 }}>
              Roster · FMU
            </span>
          </div>
        </div>

        {/* Centerpiece */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "auto",
          }}
        >
          <span
            style={{
              fontSize: 14,
              letterSpacing: 5,
              textTransform: "uppercase",
              color: "#B8860B",
              fontFamily: "monospace",
            }}
          >
            House Officers · 2026 — 2027
          </span>
          <span
            style={{
              marginTop: 28,
              fontSize: 92,
              fontWeight: 400,
              letterSpacing: -2.4,
              lineHeight: 1.05,
              color: "#1A1A1A",
            }}
          >
            The roster,
            <br />
            <span style={{ fontStyle: "italic", color: "#B8860B" }}>
              composed
            </span>{" "}
            by merit.
          </span>
          <span
            style={{
              marginTop: 24,
              fontSize: 22,
              color: "#6B6B6B",
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
              lineHeight: 1.5,
            }}
          >
            Four three-month rotations, assigned and finalized by the
            <br />
            admin team, published transparently as they&apos;re confirmed.
          </span>
        </div>

        {/* Footer rule */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 56,
            paddingTop: 24,
            borderTop: "1px solid #E8E4DF",
            fontSize: 16,
            color: "#6B6B6B",
            fontFamily: "monospace",
            letterSpacing: 1.5,
          }}
        >
          <span>4 rotations · 39 departments</span>
          <span>rosterpmc.vercel.app</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
