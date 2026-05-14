import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "ROSTER · FMU House Job — Assigned by merit. Published live.";
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
          padding: "72px 80px",
          background: "#09090B",
          color: "#FAFAFA",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Top mark + wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Four bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ width: 56, height: 7, background: "#DFE104" }} />
            <div style={{ width: 56, height: 7, background: "#FAFAFA", opacity: 0.55 }} />
            <div style={{ width: 56, height: 7, background: "#FAFAFA", opacity: 0.55 }} />
            <div style={{ width: 56, height: 7, background: "#FAFAFA", opacity: 0.55 }} />
          </div>
          <span
            style={{
              fontSize: 30,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: -1.5,
            }}
          >
            Roster
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 14,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#A1A1AA",
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
            marginBottom: 24,
          }}
        >
          <span
            style={{
              fontSize: 14,
              letterSpacing: 5,
              textTransform: "uppercase",
              color: "#DFE104",
              fontWeight: 500,
            }}
          >
            House Officers · 2026 / 27
          </span>
          <span
            style={{
              marginTop: 28,
              fontSize: 144,
              fontWeight: 700,
              letterSpacing: -6,
              lineHeight: 0.85,
              textTransform: "uppercase",
              color: "#FAFAFA",
            }}
          >
            Roster.
          </span>
          <span
            style={{
              marginTop: 10,
              fontSize: 96,
              fontWeight: 700,
              letterSpacing: -4,
              lineHeight: 0.85,
              textTransform: "uppercase",
              color: "#DFE104",
            }}
          >
            By merit.
          </span>
        </div>

        {/* Footer band */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 24,
            borderTop: "2px solid #3F3F46",
            fontSize: 16,
            color: "#A1A1AA",
            letterSpacing: 3,
            textTransform: "uppercase",
            fontWeight: 500,
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
