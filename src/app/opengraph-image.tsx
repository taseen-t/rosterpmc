import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "Roster · FMU House Job — assigned by merit, published transparently.";
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
          background: "#FFFFFF",
          color: "#111827",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Decorative shapes — flat, no shadows. */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -120,
            width: 480,
            height: 480,
            borderRadius: 9999,
            background: "#DBEAFE",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -80,
            left: -80,
            width: 320,
            height: 320,
            borderRadius: 32,
            background: "#D1FAE5",
            transform: "rotate(12deg)",
            display: "flex",
          }}
        />

        {/* Top mark + wordmark */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 16, position: "relative" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ width: 60, height: 8, background: "#3B82F6", borderRadius: 3 }} />
            <div style={{ width: 60, height: 8, background: "#9CA3AF", borderRadius: 3 }} />
            <div style={{ width: 60, height: 8, background: "#9CA3AF", borderRadius: 3 }} />
            <div style={{ width: 60, height: 8, background: "#9CA3AF", borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1.5, color: "#111827" }}>
            Roster
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 14,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#6B7280",
              fontWeight: 600,
            }}
          >
            Allied Hospital · Faisalabad
          </span>
        </div>

        {/* Centerpiece */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "auto",
            marginBottom: 16,
            position: "relative",
          }}
        >
          <span
            style={{
              fontSize: 14,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#3B82F6",
              fontWeight: 700,
            }}
          >
            House Officers · 2026 / 27
          </span>
          <span
            style={{
              marginTop: 24,
              fontSize: 108,
              fontWeight: 800,
              letterSpacing: -4,
              lineHeight: 1.02,
              color: "#111827",
            }}
          >
            The roster,
          </span>
          <span
            style={{
              marginTop: 4,
              fontSize: 108,
              fontWeight: 800,
              letterSpacing: -4,
              lineHeight: 1.02,
              color: "#3B82F6",
            }}
          >
            assigned by merit.
          </span>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 28,
            fontSize: 18,
            color: "#6B7280",
            letterSpacing: 2,
            textTransform: "uppercase",
            fontWeight: 600,
            position: "relative",
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
