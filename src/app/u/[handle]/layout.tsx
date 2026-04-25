import type { Metadata } from "next";
import { getUserProfileByHandle } from "@/lib/userStore";

interface Params {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { handle: rawHandle } = await params;
  const handle = rawHandle.replace(/^@/, "");

  let displayName = handle;
  let description = `Track movies & TV with @${handle} on CineTrack.`;

  try {
    const profile = await getUserProfileByHandle(handle);
    if (profile) {
      displayName = profile.displayName || handle;
      if (profile.bio) {
        description = profile.bio.length > 160 ? profile.bio.slice(0, 160) + "…" : profile.bio;
      }
    }
  } catch {
    // fall through
  }

  const title = `${displayName} (@${handle}) — CineTrack`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
