"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { UserPlus, Check, Hourglass, Lock, MessageSquare, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import AuthModal from "@/components/AuthModal";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/Toast";
import { getUserProfileByHandle, type UserProfile } from "@/lib/userStore";
import {
  acceptFriendRequest,
  cancelOutgoingRequest,
  sendFriendRequest,
  unfriend,
  computeMutuals,
} from "@/lib/socialStore";
import { capturePendingInvite } from "@/lib/inviteTracking";

export default function AddFriendPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const rawHandle = (params.handle as string).replace(/^@/, "").toLowerCase();
  const { user, profile, friends, authLoading } = useApp();

  const [target, setTarget] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mutuals, setMutuals] = useState<string[]>([]);

  // Capture invite immediately so that even if user signs out and re-enters,
  // it'll attach. Only stores while guest-side.
  useEffect(() => {
    if (rawHandle) capturePendingInvite(rawHandle);
  }, [rawHandle]);

  // Resolve handle
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      const p = await getUserProfileByHandle(rawHandle);
      if (cancelled) return;
      if (!p) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setTarget(p);
      setLoading(false);
    }
    run();
    return () => { cancelled = true; };
  }, [rawHandle]);

  // Compute mutuals when both target + friends ready
  useEffect(() => {
    if (!target || !user) return;
    let cancelled = false;
    computeMutuals(friends, target.uid).then((m) => {
      if (!cancelled) setMutuals(m);
    });
    return () => { cancelled = true; };
  }, [target, user, friends]);

  // Auto-redirect if user is on their own page
  useEffect(() => {
    if (!target || !user) return;
    if (target.uid === user.uid) {
      toast.info("That's you. Share this link with friends instead.");
      const t = setTimeout(() => router.replace(`/u/${rawHandle}`), 800);
      return () => clearTimeout(t);
    }
  }, [target, user, rawHandle, router, toast]);

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-16">
          <div className="max-w-md mx-auto px-4 py-16">
            <div className="space-y-4">
              <div className="w-28 h-28 mx-auto rounded-full skeleton" />
              <div className="h-7 w-2/3 mx-auto rounded skeleton" />
              <div className="h-4 w-1/3 mx-auto rounded skeleton" />
              <div className="h-12 w-full rounded-xl skeleton" />
            </div>
          </div>
        </main>
      </>
    );
  }

  if (notFound || !target) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-16 flex flex-col items-center justify-center gap-4 text-center px-4">
          <span className="text-5xl">😕</span>
          <p className="text-cinema-muted">No user with handle @{rawHandle}</p>
          <Link href="/home" className="text-cinema-purple hover:underline text-sm">← Back to CineTrack</Link>
        </main>
      </>
    );
  }

  const isSelf = !!user && user.uid === target.uid;
  const friendEdge = friends.find((f) => f.uid === target.uid);
  const status = friendEdge?.status;
  const isPrivate = target.profileVisibility === "private";

  const handleAdd = async () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (!profile) {
      toast.error("Profile loading. Try again in a moment.");
      return;
    }
    if (!profile.handle) {
      toast.info("Pick a handle in Settings before adding friends.");
      router.push("/settings");
      return;
    }
    setBusy(true);
    try {
      const res = await sendFriendRequest(profile, target);
      if (res.ok) {
        toast.success(`Request sent to @${target.handle}`);
      } else {
        toast.error(res.error);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await cancelOutgoingRequest(user.uid, target.uid);
      toast.info("Request cancelled");
    } finally {
      setBusy(false);
    }
  };

  const handleAccept = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await acceptFriendRequest(user.uid, target.uid);
      toast.success(`Now friends with @${target.handle}`);
    } finally {
      setBusy(false);
    }
  };

  const handleUnfriend = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await unfriend(user.uid, target.uid);
      toast.info(`Unfriended @${target.handle}`);
    } finally {
      setBusy(false);
    }
  };

  const initials = (target.displayName || target.handle || "?").slice(0, 2).toUpperCase();
  const mutualHandles = mutuals.slice(0, 3).map((uid) => {
    const f = friends.find((fe) => fe.uid === uid);
    return f?.handle ? `@${f.handle}` : null;
  }).filter(Boolean) as string[];

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16">
        <div className="max-w-md mx-auto px-4 py-12">
          <div className="rounded-3xl bg-cinema-card/70 border border-cinema-border/50 depth-3 p-6 sm:p-8 text-center">
            {/* Avatar */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="relative w-28 h-28 mx-auto rounded-full overflow-hidden bg-cinema-purple/30 flex items-center justify-center depth-2 border-2 border-cinema-purple/40 mb-4"
            >
              {target.photoURL ? (
                <Image src={target.photoURL} alt={target.displayName || target.handle || "avatar"} fill sizes="112px" className="object-cover" unoptimized />
              ) : (
                <span className="text-3xl font-bold text-white">{initials}</span>
              )}
            </motion.div>

            {/* Name + handle */}
            <h1 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)] flex items-center justify-center gap-2">
              {target.displayName || target.handle}
              {target.verified && (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-cinema-purple/20 text-cinema-purple text-xs font-bold">✓</span>
              )}
            </h1>
            {target.handle && (
              <p className="text-cinema-purple text-sm mt-0.5">@{target.handle}</p>
            )}

            {/* Bio */}
            {target.bio && !isPrivate && (
              <p className="text-sm text-cinema-text/80 mt-4 leading-relaxed max-w-xs mx-auto">
                {target.bio.length > 160 ? target.bio.slice(0, 160) + "…" : target.bio}
              </p>
            )}

            {/* Mutuals badge */}
            {user && mutuals.length > 0 && (
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cinema-purple/15 border border-cinema-purple/30 text-cinema-purple text-xs">
                <span>{mutuals.length} mutual{mutuals.length === 1 ? "" : "s"}</span>
                {mutualHandles.length > 0 && (
                  <>
                    <span className="opacity-60">·</span>
                    <span className="opacity-90 truncate max-w-[180px]">{mutualHandles.join(", ")}</span>
                  </>
                )}
              </div>
            )}

            {/* Action area */}
            <div className="mt-6 space-y-3">
              {isSelf ? (
                <Link href={`/u/${rawHandle}`} className="inline-block px-6 py-3 rounded-xl font-semibold text-sm bg-cinema-surface border border-cinema-border text-cinema-text">
                  Go to your profile
                </Link>
              ) : !user ? (
                <>
                  <p className="text-sm text-cinema-muted">
                    Sign in to add <span className="text-cinema-text">@{target.handle}</span> as a friend.
                  </p>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setAuthOpen(true)}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm gradient-purple text-white hover:opacity-90 transition-all cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    Sign in to add as friend
                  </motion.button>
                  <p className="text-[11px] text-cinema-muted/70">No password — Google or email link.</p>
                </>
              ) : status === "accepted" ? (
                <>
                  <p className="text-sm text-cinema-green inline-flex items-center gap-1.5">
                    <Check className="w-4 h-4" />
                    You&apos;re already friends with @{target.handle}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Link
                      href={`/u/${target.handle}`}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-cinema-surface border border-cinema-border hover:border-cinema-purple/50 transition-all"
                    >
                      View profile
                    </Link>
                    <Link
                      href={`/u/${target.handle}`}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-cinema-purple/15 text-cinema-purple border border-cinema-purple/40 hover:bg-cinema-purple/25 transition-all"
                    >
                      <MessageSquare className="w-4 h-4" /> Send a rec
                    </Link>
                  </div>
                  <button
                    onClick={handleUnfriend}
                    disabled={busy}
                    className="text-xs text-cinema-muted hover:text-cinema-red transition-colors mt-3"
                  >
                    Unfriend @{target.handle}
                  </button>
                </>
              ) : status === "pending_out" ? (
                <>
                  <p className="text-sm text-cinema-muted inline-flex items-center gap-1.5">
                    <Hourglass className="w-4 h-4" />
                    Friend request sent. Waiting for them to accept.
                  </p>
                  <button
                    onClick={handleCancel}
                    disabled={busy}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-cinema-red/15 text-cinema-red border border-cinema-red/30 hover:bg-cinema-red/25 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    Cancel request
                  </button>
                </>
              ) : status === "pending_in" ? (
                <>
                  <p className="text-sm text-cinema-text">
                    @{target.handle} sent you a friend request.
                  </p>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleAccept}
                    disabled={busy}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-cinema-green/20 text-cinema-green border border-cinema-green/40 hover:bg-cinema-green/30 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Accept friend request
                  </motion.button>
                </>
              ) : status === "blocked" ? (
                <p className="text-sm text-cinema-muted inline-flex items-center gap-1.5">
                  <Lock className="w-4 h-4" />
                  This connection is blocked.
                </p>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleAdd}
                  disabled={busy}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm gradient-purple text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  {busy ? "Sending..." : `Add @${target.handle} as friend`}
                </motion.button>
              )}
            </div>

            {/* Secondary link */}
            {!isSelf && target.handle && (
              <Link
                href={`/u/${target.handle}`}
                className="block mt-5 text-xs text-cinema-muted hover:text-cinema-text transition-colors"
              >
                View profile first →
              </Link>
            )}
          </div>

          <p className="text-center text-[11px] text-cinema-muted/70 mt-6">
            Powered by <Link href="/home" className="text-gradient-gold font-semibold">CineTrack</Link>
          </p>
        </div>
      </main>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
