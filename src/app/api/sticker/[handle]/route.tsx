import { ImageResponse } from "next/og";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getUserProfileByHandle } from "@/lib/userStore";
import type { Movie } from "@/context/AppContext";

interface RouteContext {
  params: Promise<{ handle: string }>;
}

export async function GET(_request: Request, ctx: RouteContext) {
  const { handle: rawHandle } = await ctx.params;
  const handle = rawHandle.replace(/^@/, "");

  let displayName = handle;
  let photoURL: string | undefined;
  let bio: string | undefined;
  let posters: string[] = [];

  try {
    const profile = await getUserProfileByHandle(handle);
    if (profile) {
      displayName = profile.displayName || handle;
      photoURL = profile.photoURL;
      bio = profile.bio;
      // Fetch user doc to get watchlist for top picks
      const snap = await getDoc(doc(db, "users", profile.uid));
      if (snap.exists()) {
        const data = snap.data() as { watchlist?: Movie[]; watchlistPublic?: boolean; profileVisibility?: string };
        const watchlistPublic = (data.watchlistPublic ?? true) && data.profileVisibility !== "private";
        if (watchlistPublic && Array.isArray(data.watchlist)) {
          posters = data.watchlist
            .slice(-5)
            .reverse()
            .map((m) => m.Poster)
            .filter((p): p is string => typeof p === "string" && p !== "N/A");
        }
      }
    }
  } catch {
    // fall through
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
          background: "linear-gradient(180deg, #0a0a14 0%, #1a1a2e 50%, #2a1a3e 100%)",
          color: "#ebebf5",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          padding: "80px 60px",
        }}
      >
        {/* Glow blobs */}
        <div style={{ position: "absolute", top: 100, left: -120, width: 540, height: 540, borderRadius: 9999, background: "rgba(99, 102, 241, 0.30)", filter: "blur(160px)" }} />
        <div style={{ position: "absolute", bottom: 200, right: -120, width: 460, height: 460, borderRadius: 9999, background: "rgba(236, 72, 153, 0.28)", filter: "blur(140px)" }} />

        {/* Brand top */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 40 }}>
          <div style={{ fontSize: 44 }}>🎬</div>
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1, background: "linear-gradient(135deg, #f5c518, #ff8c00)", backgroundClip: "text", color: "transparent", display: "flex" }}>
            CineTrack
          </div>
        </div>

        {/* Profile block */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, marginBottom: 50 }}>
          {photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoURL}
              alt={displayName}
              width={220}
              height={220}
              style={{ borderRadius: 9999, objectFit: "cover", border: "6px solid rgba(99, 102, 241, 0.55)" }}
            />
          ) : (
            <div
              style={{
                width: 220,
                height: 220,
                borderRadius: 9999,
                background: "linear-gradient(135deg, #6366f1, #ec4899)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 80,
                fontWeight: 800,
                color: "white",
                border: "6px solid rgba(99, 102, 241, 0.55)",
              }}
            >
              {initials}
            </div>
          )}
          <div style={{ fontSize: 70, fontWeight: 800, letterSpacing: -1.5, color: "#ebebf5", textAlign: "center", display: "flex" }}>
            {displayName}
          </div>
          <div style={{ fontSize: 38, color: "#a5a8ff", display: "flex" }}>
            @{handle}
          </div>
          {bio && (
            <div style={{ fontSize: 26, color: "#8a8aab", textAlign: "center", maxWidth: 800, lineHeight: 1.3, display: "flex" }}>
              {bio.length > 90 ? bio.slice(0, 90) + "…" : bio}
            </div>
          )}
        </div>

        {/* Top picks header */}
        {posters.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 30 }}>
            <div style={{ fontSize: 24, color: "#8a8aab", textTransform: "uppercase", letterSpacing: 4, display: "flex" }}>
              Recently added
            </div>
          </div>
        )}

        {/* Poster grid */}
        {posters.length > 0 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 40 }}>
            {posters.slice(0, 4).map((p, idx) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={idx}
                src={p}
                alt=""
                width={210}
                height={315}
                style={{ borderRadius: 16, objectFit: "cover", border: "2px solid rgba(99, 102, 241, 0.3)" }}
              />
            ))}
          </div>
        )}

        {/* CTA at bottom */}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              padding: "24px 60px",
              borderRadius: 24,
              background: "linear-gradient(135deg, #6366f1, #ec4899)",
              fontSize: 36,
              fontWeight: 800,
              color: "white",
              boxShadow: "0 20px 60px rgba(99, 102, 241, 0.4)",
            }}
          >
            Add me on CineTrack
          </div>
          <div style={{ fontSize: 24, color: "#8a8aab", display: "flex" }}>
            cinetrack.vercel.app/add/{handle}
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1920 }
  );
}
