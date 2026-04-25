import { ImageResponse } from "next/og";

export const alt = "CineTrack — track movies & TV with friends";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0a14 0%, #1a1a2e 60%, #2a1a3e 100%)",
          color: "#ebebf5",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Glow blobs */}
        <div style={{ position: "absolute", top: 80, left: 120, width: 480, height: 320, borderRadius: 9999, background: "rgba(99, 102, 241, 0.30)", filter: "blur(120px)" }} />
        <div style={{ position: "absolute", bottom: 60, right: 120, width: 360, height: 320, borderRadius: 9999, background: "rgba(236, 72, 153, 0.25)", filter: "blur(100px)" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 40 }}>
          <div style={{ fontSize: 56 }}>🎬</div>
          <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -1.5, background: "linear-gradient(135deg, #f5c518, #ff8c00)", backgroundClip: "text", color: "transparent", display: "flex" }}>
            CineTrack
          </div>
        </div>

        <div style={{ fontSize: 44, fontWeight: 700, textAlign: "center", lineHeight: 1.15, maxWidth: 900, display: "flex", color: "#ebebf5" }}>
          Track movies & TV.<br />Discover with friends.
        </div>

        <div style={{ fontSize: 22, color: "#8a8aab", marginTop: 28, display: "flex" }}>
          Free. No ads. Sync across devices.
        </div>
      </div>
    ),
    { ...size }
  );
}
