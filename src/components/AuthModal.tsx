"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AuthModal({ open, onClose }: Props) {
  const { signInGoogle, sendEmailLink } = useApp();
  const [mode, setMode] = useState<"choose" | "email">("choose");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setMode("choose");
      setEmail("");
      setStatus("idle");
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleGoogle = async () => {
    setError(null);
    setStatus("loading");
    try {
      await signInGoogle();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Google sign-in failed. Try again.");
    } finally {
      setStatus("idle");
    }
  };

  const handleSendLink = async () => {
    setError(null);
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a valid email.");
      return;
    }
    setStatus("loading");
    try {
      await sendEmailLink(trimmed);
      setStatus("sent");
    } catch (err) {
      console.error(err);
      setError("Could not send link. Check email or try again.");
      setStatus("idle");
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-3xl bg-cinema-card border border-cinema-border shadow-2xl shadow-black/50 p-6 animate-slide-down"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 p-2 rounded-lg text-cinema-muted hover:text-cinema-text hover:bg-white/5 transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl glass mb-2">
            <span className="text-3xl">🎬</span>
          </div>
          <h2 className="text-xl font-bold font-[family-name:var(--font-display)]">Sign in to CineTrack</h2>
          <p className="text-cinema-muted text-xs">Sync your watchlist across devices & unlock social features.</p>
        </div>

        {mode === "choose" && (
          <div className="space-y-3">
            <button
              onClick={handleGoogle}
              disabled={status === "loading"}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white text-[#1f1f1f] font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.8 32.3 29.3 35.5 24 35.5c-6.4 0-11.5-5.2-11.5-11.5S17.6 12.5 24 12.5c3 0 5.7 1.1 7.8 3l5.7-5.7C34 6.5 29.3 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.3-.1-2.6-.4-3.9z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8c1.8-4.4 6-7.5 10.9-7.5 3 0 5.7 1.1 7.8 3l5.7-5.7C34 6.5 29.3 4.5 24 4.5 16.3 4.5 9.6 8.9 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 43.5c5.2 0 9.9-1.9 13.4-5.1l-6.2-5.1c-2 1.5-4.5 2.4-7.2 2.4-5.3 0-9.8-3.2-11.3-7.5l-6.5 5C9.5 39 16.2 43.5 24 43.5z"/>
                <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.2 5.1c-.4.4 6.7-4.8 6.7-14.8 0-1.3-.1-2.6-.4-3.9z"/>
              </svg>
              {status === "loading" ? "Signing in..." : "Continue with Google"}
            </button>

            <button
              onClick={() => setMode("email")}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-cinema-surface border border-cinema-border text-cinema-text font-semibold text-sm hover:border-cinema-purple/50 transition-all cursor-pointer"
            >
              ✉️ Sign in with email link
            </button>

            {error && <p className="text-cinema-red text-xs text-center">{error}</p>}
            <p className="text-[11px] text-cinema-muted/60 text-center mt-2">No passwords. Free forever.</p>
          </div>
        )}

        {mode === "email" && status !== "sent" && (
          <div className="space-y-3">
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl bg-cinema-surface border border-cinema-border text-cinema-text placeholder:text-cinema-muted/60 text-sm focus:outline-none focus:border-cinema-purple focus:ring-1 focus:ring-cinema-purple/50"
            />
            <button
              onClick={handleSendLink}
              disabled={status === "loading"}
              className="w-full py-3 rounded-xl font-semibold text-sm gradient-gold text-cinema-bg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            >
              {status === "loading" ? "Sending..." : "Send magic link"}
            </button>
            <button
              onClick={() => setMode("choose")}
              className="w-full text-xs text-cinema-muted hover:text-cinema-text transition-colors cursor-pointer"
            >
              ← Back
            </button>
            {error && <p className="text-cinema-red text-xs text-center">{error}</p>}
          </div>
        )}

        {mode === "email" && status === "sent" && (
          <div className="space-y-3 text-center">
            <div className="text-4xl">📬</div>
            <p className="text-cinema-text font-semibold">Link sent!</p>
            <p className="text-cinema-muted text-xs">
              Check <span className="text-cinema-text">{email}</span> and click the link to finish signing in.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl font-semibold text-sm gradient-purple text-white hover:opacity-90 transition-all cursor-pointer"
            >
              Got it
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
