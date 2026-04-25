import { ImageResponse } from "next/og";
import { getUserProfileByHandle } from "@/lib/userStore";

export const alt = "CineTrack profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface PageParams {
  params: Promise<{ handle: string }>;
}

export default async function ProfileOG({ params }: PageParams) {
  const { handle: rawHandle } = await params;
  const handle = rawHandle.replace(/^@/, "");

  let displayName = handle;
  let bio: string | undefined;
  let photoURL: string | undefined;
  let verified = false;

  try {
    const profile = await getUserProfileByHandle(handle);
    if (profile) {
      displayName = profile.displayName || handle;
      bio = profile.bio;
      photoURL = profile.photoURL;
      verified = !!profile.verified;
    }
  } catch {
    // fall through with defaults
  }

  const initials = (displayName || handle).slice(0, 2).toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0a0a14 0%, #1a1a2e 60%, #2a1a3e 100%)",
          color: "#ebebf5",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          padding: 80,
        }}
      >
        {/* Glow */}
        <div style={{ position: "absolute", top: 60, left: 80, width: 480, height: 320, borderRadius: 9999, background: "rgba(99, 102, 241, 0.30)", filter: "blur(120px)" }} />
        <div style={{ position: "absolute", bottom: 40, right: 80, width: 360, height: 320, borderRadius: 9999, background: "rgba(236, 72, 153, 0.25)", filter: "blur(100px)" }} />

        {/* Brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 32 }}>🎬</div>
          <div style={{ fontSize: 28, fontWeight: 700, background: "linear-gradient(135deg, #f5c518, #ff8c00)", backgroundClip: "text", color: "transparent", display: "flex" }}>
            CineTrack
          </div>
        </div>

        {/* Profile block */}
        <div style={{ display: "flex", alignItems: "center", gap: 32, marginTop: 80 }}>
          {photoURL ? (
            // Use plain img tag because next/og supports it
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoURL}
              alt={displayName}
              width={200}
              height={200}
              style={{ borderRadius: 9999, objectFit: "cover", border: "4px solid rgba(99, 102, 241, 0.4)" }}
            />
          ) : (
            <div
              style={{
                width: 200,
                height: 200,
                borderRadius: 9999,
                background: "linear-gradient(135deg, #6366f1, #ec4899)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 64,
                fontWeight: 800,
                color: "white",
                border: "4px solid rgba(99, 102, 241, 0.4)",
              }}
            >
              {initials}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ fontSize: 60, fontWeight: 800, letterSpacing: -1.5, color: "#ebebf5", display: "flex" }}>
                {displayName}
              </div>
              {verified && (
                <div style={{ display: "flex", padding: "8px 14px", borderRadius: 999, background: "rgba(99, 102, 241, 0.25)", color: "#a5a8ff", fontSize: 22, fontWeight: 700 }}>
                  ✓
                </div>
              )}
            </div>
            <div style={{ fontSize: 32, color: "#a5a8ff", marginTop: 6, display: "flex" }}>
              @{handle}
            </div>
            {bio && (
              <div style={{ fontSize: 24, color: "#8a8aab", marginTop: 16, display: "flex", maxWidth: 700, lineHeight: 1.3 }}>
                {bio.length > 110 ? bio.slice(0, 110) + "…" : bio}
              </div>
            )}
          </div>
        </div>

        {/* Footer CTA */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
          <div style={{ fontSize: 24, color: "#8a8aab", display: "flex" }}>
            Track movies & TV with friends.
          </div>
          <div style={{ display: "flex", padding: "16px 32px", borderRadius: 16, background: "linear-gradient(135deg, #6366f1, #ec4899)", fontSize: 24, fontWeight: 700, color: "white" }}>
            Add me on CineTrack
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
