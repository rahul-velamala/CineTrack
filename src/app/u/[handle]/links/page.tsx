"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, UserPlus, Film, Bookmark, ArrowUpRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import { getUserProfileByHandle, type UserProfile } from "@/lib/userStore";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Movie } from "@/context/AppContext";
import { titleHref } from "@/lib/media";

interface PublicData {
  profile: UserProfile;
  watchlist: Movie[];
  watched: Movie[];
}

export default function BioLinksPage() {
  const params = useParams();
  const rawHandle = (params.handle as string).replace(/^@/, "");

  const [data, setData] = useState<PublicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;
    async function run() {
      const initial = await getUserProfileByHandle(rawHandle);
      if (cancelled) return;
      if (!initial) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      unsub = onSnapshot(doc(db, "users", initial.uid), (snap) => {
        if (!snap.exists()) { setNotFound(true); return; }
        const d = snap.data() as { watchlist?: Movie[]; watched?: Movie[] } & Omit<UserProfile, "uid">;
        setData({
          profile: { uid: initial.uid, ...d },
          watchlist: Array.isArray(d.watchlist) ? d.watchlist : [],
          watched: Array.isArray(d.watched) ? d.watched : [],
        });
        setLoading(false);
      });
    }
    run();
    return () => { cancelled = true; if (unsub) unsub(); };
  }, [rawHandle]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-20 px-4 flex justify-center">
          <div className="w-full max-w-md space-y-3">
            <div className="h-32 rounded-2xl skeleton" />
            <div className="h-12 rounded-xl skeleton" />
            <div className="h-12 rounded-xl skeleton" />
            <div className="h-40 rounded-2xl skeleton" />
          </div>
        </main>
      </>
    );
  }

  if (notFound || !data) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-16 flex flex-col items-center justify-center gap-4 text-center px-4">
          <span className="text-5xl">😕</span>
          <p className="text-cinema-muted">No user with handle @{rawHandle.toLowerCase()}</p>
          <Link href="/home" className="text-cinema-purple hover:underline text-sm">Try CineTrack →</Link>
        </main>
      </>
    );
  }

  const p = data.profile;
  const initials = (p.displayName || p.handle || "?").slice(0, 2).toUpperCase();
  const watchlistPublic = (p.watchlistPublic ?? true) && p.profileVisibility !== "private";
  // Top picks: for now, last 5 from watchlist (most recently added)
  const topPicks = watchlistPublic ? data.watchlist.slice(-6).reverse() : [];

  const inviteUrl = `/add/${encodeURIComponent(p.handle ?? "")}`;

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16 pb-12">
        <div className="max-w-md mx-auto px-4 py-10 space-y-5">
          {/* Profile card */}
          <div className="text-center">
            <div className="relative w-24 h-24 mx-auto rounded-full overflow-hidden bg-cinema-purple/30 flex items-center justify-center depth-2 border-2 border-cinema-purple/40">
              {p.photoURL ? (
                <Image src={p.photoURL} alt={p.displayName || p.handle || "avatar"} fill sizes="96px" className="object-cover" unoptimized />
              ) : (
                <span className="text-2xl font-bold text-white">{initials}</span>
              )}
            </div>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-display)] mt-3 flex items-center justify-center gap-2">
              {p.displayName || p.handle}
              {p.verified && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cinema-purple/20 text-cinema-purple font-semibold">✓</span>
              )}
            </h1>
            {p.handle && <p className="text-cinema-purple text-sm">@{p.handle}</p>}
            {p.bio && p.profileVisibility !== "private" && (
              <p className="text-sm text-cinema-text/80 mt-3 leading-relaxed">{p.bio}</p>
            )}
          </div>

          {/* Primary CTA */}
          <motion.a
            whileTap={{ scale: 0.98 }}
            href={inviteUrl}
            className="flex items-center justify-center gap-2 w-full px-5 py-4 rounded-2xl font-semibold text-sm gradient-purple text-white depth-2 hover:opacity-95 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Add me on CineTrack
          </motion.a>

          {/* Profile + watchlist links */}
          <div className="space-y-2.5">
            <BioLink href={`/u/${p.handle}`} icon={<Film className="w-4 h-4" />} label="View my profile" />
            {watchlistPublic && data.watchlist.length > 0 && (
              <BioLink href={`/u/${p.handle}`} icon={<Bookmark className="w-4 h-4" />} label={`My watchlist (${data.watchlist.length})`} />
            )}
            <BioLink href="/home" icon={<Sparkles className="w-4 h-4" />} label="Try CineTrack" />
          </div>

          {/* Top picks grid */}
          {topPicks.length > 0 && (
            <div className="pt-2">
              <p className="text-xs uppercase tracking-wider text-cinema-muted mb-3 text-center">Recently added</p>
              <div className="grid grid-cols-3 gap-2">
                {topPicks.map((m, i) => {
                  const poster = m.Poster && m.Poster !== "N/A" ? m.Poster : "/no-poster.svg";
                  return (
                    <Link
                      key={`${m.mediaType ?? "movie"}-${m.imdbID}-${i}`}
                      href={titleHref(m.mediaType ?? "movie", m.imdbID)}
                      className="relative aspect-[2/3] rounded-lg overflow-hidden bg-cinema-card border border-cinema-border/50 depth-1 hover:scale-[1.04] transition-transform"
                    >
                      <Image src={poster} alt={m.Title} fill sizes="120px" className="object-cover" unoptimized />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer brand */}
          <Link
            href="/home"
            className="block text-center text-[11px] text-cinema-muted/60 hover:text-cinema-muted pt-6"
          >
            Powered by <span className="text-gradient-gold font-semibold">CineTrack</span>
          </Link>
        </div>
      </main>
    </>
  );
}

function BioLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <motion.div whileTap={{ scale: 0.98 }}>
      <Link
        href={href}
        className="flex items-center justify-between gap-3 px-5 py-4 rounded-2xl bg-cinema-card border border-cinema-border/50 hover:border-cinema-purple/50 depth-1 transition-colors"
      >
        <span className="flex items-center gap-3 text-sm font-semibold text-cinema-text">
          <span className="text-cinema-purple">{icon}</span>
          {label}
        </span>
        <ArrowUpRight className="w-4 h-4 text-cinema-muted" />
      </Link>
    </motion.div>
  );
}
