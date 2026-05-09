import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "House Job Selection Portal — Allied Hospital, Faisalabad";
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
          background:
            "linear-gradient(135deg, #0c6b5f 0%, #0e8c7e 35%, #0b3d4f 100%)",
          color: "white",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Subtle dot pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.07) 1.5px, transparent 1.5px)",
            backgroundSize: "32px 32px",
            display: "flex",
          }}
        />
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="44" height="44" viewBox="0 0 32 32">
              <circle
                cx="16"
                cy="16"
                r="10"
                fill="none"
                stroke="rgba(255,255,255,0.55)"
                strokeWidth="1.6"
                strokeDasharray="2 2.4"
                strokeLinecap="round"
              />
              <path
                d="M16 10v12 M10 16h12"
                stroke="white"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 20, opacity: 0.8, letterSpacing: 1.5 }}>
              ALLIED HOSPITAL · FAISALABAD
            </span>
            <span style={{ fontSize: 28, fontWeight: 600 }}>House Job Portal</span>
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "auto",
          }}
        >
          <span
            style={{
              fontSize: 22,
              opacity: 0.85,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            Office of the Medical Superintendent
          </span>
          <span
            style={{
              marginTop: 18,
              fontSize: 84,
              fontWeight: 700,
              letterSpacing: -1.5,
              lineHeight: 1.05,
            }}
          >
            House Officer
            <br />
            Seat Selection
          </span>
          <span
            style={{
              marginTop: 14,
              fontSize: 28,
              opacity: 0.82,
              fontWeight: 500,
            }}
          >
            FMU 2026-27 · 1 June 2026 → 31 May 2027
          </span>
        </div>

        {/* Footer band */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 40,
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.15)",
            fontSize: 22,
            opacity: 0.85,
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
