"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { UserPlus, Check, Hourglass, X, Lock } from "lucide-react";
// MessageSquare imported below alongside chatStore
import Navbar from "@/components/Navbar";
import MovieCard from "@/components/MovieCard";
import AuthModal from "@/components/AuthModal";
import InviteShareCard from "@/components/InviteShareCard";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/Toast";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { ensureChat, chatIdFor } from "@/lib/chatStore";
import { titleHref } from "@/lib/media";
import { getUserProfileByHandle, type UserProfile } from "@/lib/userStore";
import {
  acceptFriendRequest,
  cancelOutgoingRequest,
  sendFriendRequest,
  unfriend,
} from "@/lib/socialStore";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Movie } from "@/context/AppContext";

interface PublicData {
  profile: UserProfile;
  watchlist: Movie[];
  watched: Movie[];
}

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const rawHandle = (params.handle as string).replace(/^@/, "");
  const { user, profile: selfProfile, friends } = useApp();
  const toast = useToast();

  const [data, setData] = useState<PublicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Resolve handle -> uid -> live profile listener
  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;

    async function run() {
      setLoading(true);
      setNotFound(false);
      const initial = await getUserProfileByHandle(rawHandle);
      if (cancelled) return;
      if (!initial) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const uid = initial.uid;

      unsub = onSnapshot(doc(db, "users", uid), (snap) => {
        if (!snap.exists()) { setNotFound(true); return; }
        const d = snap.data() as { watchlist?: Movie[]; watched?: Movie[] } & Omit<UserProfile, "uid">;
        setData({
          profile: { uid, ...d },
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
        <main className="min-h-screen pt-16">
          <div className="max-w-4xl mx-auto px-4 py-12">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="w-32 h-32 rounded-full skeleton flex-shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="h-7 w-1/2 rounded skeleton" />
                <div className="h-4 w-1/3 rounded skeleton" />
                <div className="h-12 w-full rounded skeleton" />
              </div>
            </div>
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
          <Link href="/home" className="text-cinema-purple hover:underline text-sm">← Back to home</Link>
        </main>
      </>
    );
  }

  const p = data.profile;
  const isSelf = !!user && user.uid === p.uid;
  const visibility = p.profileVisibility ?? "basic";
  const watchlistPublic = p.watchlistPublic ?? true;

  const friendEdge = friends.find((f) => f.uid === p.uid);
  const friendStatus = friendEdge?.status; // pending_out | pending_in | accepted | blocked
  const isFriend = friendStatus === "accepted";

  // Visibility logic
  const canSeeFullProfile =
    isSelf
    || visibility === "basic"
    || (visibility === "friends" && isFriend);
  const profileHidden = !isSelf && visibility === "private";

  const watchlistVisible = !profileHidden && watchlistPublic && canSeeFullProfile;
  const watchedVisible = !profileHidden && watchlistPublic && canSeeFullProfile;

  const memberSince = (() => {
    const c = p.createdAt as { toDate?: () => Date } | undefined;
    if (c?.toDate) return c.toDate();
    if (p.createdAt instanceof Date) return p.createdAt;
    return null;
  })();

  const handleFriendAction = async () => {
    if (!user || !selfProfile) {
      setAuthOpen(true);
      return;
    }
    if (!selfProfile.handle) {
      toast.info("Pick a handle in Settings before adding friends.");
      return;
    }
    setBusy(true);
    try {
      if (!friendStatus) {
        const res = await sendFriendRequest(selfProfile, p);
        if (res.ok) toast.success(`Request sent to @${p.handle}`);
        else toast.error(res.error);
      } else if (friendStatus === "pending_out") {
        await cancelOutgoingRequest(user.uid, p.uid);
        toast.info("Request cancelled");
      } else if (friendStatus === "pending_in") {
        await acceptFriendRequest(user.uid, p.uid);
        toast.success(`Now friends with @${p.handle}`);
      } else if (friendStatus === "accepted") {
        await unfriend(user.uid, p.uid);
        toast.info(`Unfriended @${p.handle}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const friendButton = (() => {
    if (isSelf) return null;
    let label = "Add as friend";
    let Icon = UserPlus;
    let cls = "gradient-purple text-white";
    if (friendStatus === "pending_out") { label = "Request sent · cancel"; Icon = Hourglass; cls = "bg-cinema-surface border border-cinema-border text-cinema-muted"; }
    else if (friendStatus === "pending_in") { label = "Accept request"; Icon = Check; cls = "bg-cinema-green/20 text-cinema-green border border-cinema-green/40"; }
    else if (friendStatus === "accepted") { label = "Friends · unfriend"; Icon = X; cls = "bg-cinema-surface border border-cinema-border text-cinema-text"; }
    return (
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={handleFriendAction}
        disabled={busy}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer disabled:opacity-50 ${cls}`}
      >
        <Icon className="w-4 h-4" /> {label}
      </motion.button>
    );
  })();

  const initials = (p.displayName || p.handle || "?").slice(0, 2).toUpperCase();

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <Link href="/home" className="text-xs text-cinema-muted hover:text-cinema-text transition-colors">← Back to home</Link>

          {/* Header */}
          <div className="mt-6 flex flex-col sm:flex-row items-start gap-6 p-6 rounded-3xl bg-cinema-card/60 border border-cinema-border/40 depth-2">
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-cinema-purple/30 flex items-center justify-center flex-shrink-0 depth-1 border-2 border-cinema-purple/30">
              {p.photoURL ? (
                <Image src={p.photoURL} alt={p.displayName || p.handle || "avatar"} fill sizes="128px" className="object-cover" unoptimized />
              ) : (
                <span className="text-3xl font-bold text-white">{initials}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)]">
                  {p.displayName || p.handle || "User"}
                </h1>
                {p.verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cinema-purple/20 text-cinema-purple text-xs font-semibold">
                    ✓ Verified
                  </span>
                )}
              </div>
              {p.handle && (
                <p className="text-cinema-purple text-sm mt-0.5">@{p.handle}</p>
              )}
              {p.bio && canSeeFullProfile && (
                <p className="text-sm text-cinema-text/80 mt-3 leading-relaxed">{p.bio}</p>
              )}

              {/* Stats row */}
              <div className="flex flex-wrap gap-5 mt-4 text-xs">
                {watchlistVisible && (
                  <Stat label="Watchlist" value={data.watchlist.length} />
                )}
                {watchedVisible && (
                  <Stat label="Watched" value={data.watched.length} />
                )}
                {memberSince && (
                  <Stat label="Member since" value={memberSince.toLocaleDateString(undefined, { year: "numeric", month: "short" })} small />
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {friendButton}
                {isFriend && selfProfile && (
                  <button
                    onClick={async () => {
                      try {
                        await ensureChat(selfProfile, p);
                        router.push(`/chat/${chatIdFor(selfProfile.uid, p.uid)}`);
                      } catch (err) {
                        console.error(err);
                        toast.error("Could not open chat.");
                      }
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-cinema-purple/15 text-cinema-purple border border-cinema-purple/40 hover:bg-cinema-purple/25 transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" /> Message
                  </button>
                )}
                {isSelf && (
                  <Link
                    href="/settings"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-cinema-surface border border-cinema-border hover:border-cinema-purple/50 transition-all"
                  >
                    Edit profile
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Self-only: invite share card */}
          {isSelf && p.handle && (
            <div className="mt-6">
              <InviteShareCard handle={p.handle} />
            </div>
          )}

          {/* Visibility notice */}
          {profileHidden && (
            <div className="mt-8 p-6 rounded-2xl bg-cinema-card/60 border border-cinema-border/40 flex items-center gap-3">
              <Lock className="w-5 h-5 text-cinema-muted" />
              <p className="text-sm text-cinema-muted">This profile is private.</p>
            </div>
          )}
          {!profileHidden && !canSeeFullProfile && (
            <div className="mt-8 p-6 rounded-2xl bg-cinema-card/60 border border-cinema-border/40 flex items-center gap-3">
              <Lock className="w-5 h-5 text-cinema-gold" />
              <p className="text-sm text-cinema-muted">Full profile is friends-only. Send a friend request to see more.</p>
            </div>
          )}

          {/* Watchlist preview */}
          {watchlistVisible && data.watchlist.length > 0 && (
            <section className="mt-12">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold font-[family-name:var(--font-display)] flex items-center gap-2">
                  <span>📋</span> Watchlist
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {data.watchlist.slice(0, 10).map((m, i) => (
                  <div key={`${m.mediaType ?? "movie"}-${m.imdbID}-${i}`} className="animate-fade-in" style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}>
                    <MovieCard movie={m} href={titleHref(m.mediaType ?? "movie", m.imdbID)} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Watched preview */}
          {watchedVisible && data.watched.length > 0 && (
            <section className="mt-12">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold font-[family-name:var(--font-display)] flex items-center gap-2">
                  <span>✅</span> Recently Watched
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {data.watched.slice(-10).reverse().map((m, i) => (
                  <div key={`${m.mediaType ?? "movie"}-${m.imdbID}-${i}`} className="animate-fade-in" style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}>
                    <MovieCard movie={m} href={titleHref(m.mediaType ?? "movie", m.imdbID)} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}

function Stat({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div>
      <p className={`font-bold text-cinema-text ${small ? "text-sm" : "text-lg"}`}>{value}</p>
      <p className="text-cinema-muted text-[11px] uppercase tracking-wider">{label}</p>
    </div>
  );
}
