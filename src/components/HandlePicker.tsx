"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { validateHandle } from "@/lib/userStore";

export default function HandlePicker() {
  const { needsHandle, claimHandle, signOut } = useApp();
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const v = validateHandle(raw);
  const handlePreview = v.ok ? v.handle : raw.trim().toLowerCase().replace(/^@/, "");
  const canSubmit = v.ok && !loading;

  const submit = async () => {
    setError(null);
    if (!v.ok) {
      setError(v.error);
      return;
    }
    setLoading(true);
    const res = await claimHandle(v.handle);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
    }
  };

  return (
    <AnimatePresence>
      {needsHandle && (
        <motion.div
          key="handle-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        >
          <motion.div
            initial={{ y: 24, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className="w-full max-w-sm rounded-3xl bg-cinema-card border border-cinema-border depth-3 p-6"
          >
        <div className="text-center space-y-2 mb-5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl glass mb-2">
            <span className="text-3xl">🏷️</span>
          </div>
          <h2 className="text-xl font-bold font-[family-name:var(--font-display)]">Pick your handle</h2>
          <p className="text-cinema-muted text-xs">Used by friends to find you. 3-20 chars. Letters, digits, underscores.</p>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-cinema-muted">@</span>
            <input
              autoFocus
              type="text"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && canSubmit) submit(); }}
              placeholder="yourhandle"
              maxLength={20}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-cinema-surface border border-cinema-border text-cinema-text placeholder:text-cinema-muted/60 text-sm focus:outline-none focus:border-cinema-purple focus:ring-1 focus:ring-cinema-purple/50"
            />
          </div>

          {handlePreview && (
            <p className="text-xs text-cinema-muted text-center">
              Friends will find you as <span className="text-cinema-purple">@{handlePreview}</span>
            </p>
          )}

          {error && <p className="text-cinema-red text-xs text-center">{error}</p>}

          <button
            onClick={submit}
            disabled={!canSubmit}
            className="w-full py-3 rounded-xl font-semibold text-sm gradient-gold text-cinema-bg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Claiming..." : "Claim handle"}
          </button>

          <button
            onClick={() => signOut()}
            className="w-full text-xs text-cinema-muted hover:text-cinema-text transition-colors cursor-pointer"
          >
            Cancel & sign out
          </button>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
