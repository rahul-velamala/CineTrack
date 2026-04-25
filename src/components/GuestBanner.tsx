"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CloudOff, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import AuthModal from "./AuthModal";

interface Props {
  variant?: "watchlist" | "watched";
}

const DISMISS_KEY = "cinetrack_guest_banner_dismissed";

export default function GuestBanner({ variant }: Props) {
  const { user, watchlist, watched } = useApp();
  const [authOpen, setAuthOpen] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  const dismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
    setDismissed(true);
  };

  if (user) return null;

  const list = variant === "watched" ? watched : watchlist;
  if (list.length === 0) return null;

  const which = variant === "watched" ? "watched list" : "watchlist";

  return (
    <>
      <AnimatePresence>
        {!dismissed && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-cinema-purple/15 to-cinema-magenta/10 border border-cinema-purple/30 depth-1"
          >
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 rounded-lg bg-cinema-purple/20 text-cinema-purple flex-shrink-0">
                <CloudOff className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-cinema-text">
                  Your {which} is saved on this device only
                </p>
                <p className="text-xs text-cinema-muted mt-0.5">
                  Sign in to sync across devices, send recs to friends, and never lose your data.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setAuthOpen(true)}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-lg text-sm font-semibold gradient-purple text-white hover:opacity-90 transition-all cursor-pointer whitespace-nowrap"
              >
                Sign in to sync
              </motion.button>
              <button
                onClick={dismiss}
                aria-label="Dismiss"
                className="p-2 rounded-lg text-cinema-muted hover:text-cinema-text hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
