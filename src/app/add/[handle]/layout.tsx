import type { Metadata } from "next";
import { getUserProfileByHandle } from "@/lib/userStore";

interface Params {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { handle: rawHandle } = await params;
  const handle = rawHandle.replace(/^@/, "").toLowerCase();

  let displayName = handle;
  let description = `@${handle} invited you to CineTrack — track movies & TV with friends.`;

  try {
    const profile = await getUserProfileByHandle(handle);
    if (profile) {
      displayName = profile.displayName || handle;
      if (profile.bio) {
        description = `@${handle} on CineTrack — ${profile.bio.length > 120 ? profile.bio.slice(0, 120) + "…" : profile.bio}`;
      }
    }
  } catch {
    // fall through
  }

  const title = `Add ${displayName} (@${handle}) on CineTrack`;
  // Reuse the profile OG image for preview
  const ogPath = `/u/${handle}/opengraph-image`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      images: [ogPath],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogPath],
    },
  };
}

export default function AddLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
