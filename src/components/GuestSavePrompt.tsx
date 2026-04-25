"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cloud, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import AuthModal from "./AuthModal";

const THRESHOLD = 3;
const DISMISS_KEY = "cinetrack_guest_prompt_dismissed";
const SHOWN_KEY = "cinetrack_guest_prompt_shown_session";

export default function GuestSavePrompt() {
  const { user, guestAdds } = useApp();
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [permaDismissed, setPermaDismissed] = useState(true);

  // Init dismissed state once
  useEffect(() => {
    try {
      setPermaDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setPermaDismissed(false);
    }
  }, []);

  // Trigger when threshold crossed, unless permanently dismissed or shown this session
  useEffect(() => {
    if (user) { setOpen(false); return; }
    if (permaDismissed) return;
    if (guestAdds < THRESHOLD) return;

    let shownThisSession = false;
    try { shownThisSession = sessionStorage.getItem(SHOWN_KEY) === "1"; } catch { /* ignore */ }
    if (shownThisSession) return;

    setOpen(true);
    try { sessionStorage.setItem(SHOWN_KEY, "1"); } catch { /* ignore */ }
  }, [guestAdds, user, permaDismissed]);

  // Auto-hide after a while if user ignores
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setOpen(false), 12000);
    return () => clearTimeout(t);
  }, [open]);

  const dismiss = () => setOpen(false);
  const dismissForever = () => {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
    setPermaDismissed(true);
    setOpen(false);
  };

  return (
    <>
      <AnimatePresence>
        {open && !user && (
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-[350] pointer-events-auto"
          >
            <div className="rounded-2xl bg-cinema-card border border-cinema-purple/40 depth-3 p-4 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-cinema-purple/20 text-cinema-purple flex-shrink-0">
                <Cloud className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-cinema-text">Save your watchlist</p>
                <p className="text-xs text-cinema-muted mt-1">
                  Your data lives only on this device. Sign in to sync across devices, send recs to friends, and never lose it.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => { setAuthOpen(true); setOpen(false); }}
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold gradient-purple text-white hover:opacity-90 transition-all cursor-pointer"
                  >
                    Sign in
                  </motion.button>
                  <button
                    onClick={dismissForever}
                    className="text-xs text-cinema-muted hover:text-cinema-text transition-colors cursor-pointer"
                  >
                    Don&apos;t ask again
                  </button>
                </div>
              </div>
              <button
                onClick={dismiss}
                aria-label="Dismiss"
                className="p-1 -m-1 rounded text-cinema-muted hover:text-cinema-text transition-colors cursor-pointer flex-shrink-0"
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
