"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, UserPlus } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/Toast";
import { getUserProfileByHandle, type UserProfile } from "@/lib/userStore";
import { readPendingInviteHandle } from "@/lib/inviteTracking";
import { sendFriendRequest } from "@/lib/socialStore";
import AuthModal from "./AuthModal";

const DISMISS_KEY = "cinetrack_invite_welcome_dismissed";

export default function InviteWelcome() {
  const { user, profile, friends } = useApp();
  const toast = useToast();

  const [inviter, setInviter] = useState<UserProfile | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Hydrate dismiss state
  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  // Resolve inviter: priority = profile.invitedByHandle (authed) > pending localStorage (guest)
  useEffect(() => {
    let cancelled = false;
    async function run() {
      let handle: string | null = null;
      const profileWithInvite = profile as (UserProfile & { invitedByHandle?: string }) | null;
      if (profileWithInvite?.invitedByHandle) handle = profileWithInvite.invitedByHandle;
      else handle = readPendingInviteHandle();
      if (!handle) { setInviter(null); return; }
      const p = await getUserProfileByHandle(handle);
      if (cancelled) return;
      // Skip if it's self
      if (p && user && p.uid === user.uid) { setInviter(null); return; }
      setInviter(p);
    }
    run();
    return () => { cancelled = true; };
  }, [profile, user]);

  if (!inviter || dismissed) return null;

  // Check if already friends or pending
  const existing = friends.find((f) => f.uid === inviter.uid);
  if (existing && (existing.status === "accepted" || existing.status === "pending_out")) {
    return null;
  }

  const dismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
    setDismissed(true);
  };

  const handleAddFriend = async () => {
    if (!user || !profile) {
      setAuthOpen(true);
      return;
    }
    if (!profile.handle) {
      toast.info("Pick a handle in Settings before adding friends.");
      return;
    }
    setBusy(true);
    try {
      const res = await sendFriendRequest(profile, inviter);
      if (res.ok) {
        toast.success(`Friend request sent to @${inviter.handle}`);
        dismiss();
      } else {
        toast.error(res.error);
      }
    } finally {
      setBusy(false);
    }
  };

  const initials = (inviter.displayName || inviter.handle || "?").slice(0, 2).toUpperCase();

  return (
    <>
      <AnimatePresence>
        {!dismissed && inviter && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="mx-auto max-w-3xl mt-4 px-4"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-cinema-purple/15 to-cinema-magenta/15 border border-cinema-purple/40 depth-2">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-cinema-purple/30 flex items-center justify-center flex-shrink-0">
                  {inviter.photoURL ? (
                    <Image src={inviter.photoURL} alt={inviter.displayName || inviter.handle || "avatar"} fill sizes="48px" className="object-cover" unoptimized />
                  ) : (
                    <span className="text-sm font-bold text-white">{initials}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-cinema-text">
                    <span className="inline-flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-cinema-gold" />
                      {inviter.handle ? (
                        <Link href={`/u/${inviter.handle}`} className="font-semibold hover:text-cinema-purple">
                          @{inviter.handle}
                        </Link>
                      ) : (
                        <span className="font-semibold">{inviter.displayName || "Someone"}</span>
                      )}
                      <span> invited you to CineTrack</span>
                    </span>
                  </p>
                  <p className="text-xs text-cinema-muted mt-0.5">
                    {user ? "Tap below to add them as a friend." : "Sign in, then send a friend request to start sharing."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-stretch sm:self-auto">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleAddFriend}
                  disabled={busy}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold gradient-purple text-white hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  <UserPlus className="w-4 h-4" />
                  {user ? "Add as friend" : "Sign in to add"}
                </motion.button>
                <button
                  onClick={dismiss}
                  aria-label="Dismiss"
                  className="p-2 rounded-lg text-cinema-muted hover:text-cinema-text hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
