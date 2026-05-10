import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "House Job Selection Portal - Allied Hospital, Faisalabad";
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
            <svg width="40" height="40" viewBox="0 0 9 9">
              <path
                d="M 6.726 4.5 C 7.955 4.5 8.952 5.498 8.952 6.729 C 8.952 7.959 7.955 8.957 6.726 8.957 L 2.274 8.957 C 1.045 8.957 0.048 7.959 0.048 6.729 C 0.048 5.498 1.045 4.5 2.274 4.5 C 1.045 4.5 0.048 3.502 0.048 2.271 C 0.048 1.041 1.045 0.043 2.274 0.043 L 6.726 0.043 C 7.955 0.043 8.952 1.041 8.952 2.271 C 8.952 3.502 7.955 4.5 6.726 4.5 Z"
                fill="white"
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
            FMU House Officers · 2026-27
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
