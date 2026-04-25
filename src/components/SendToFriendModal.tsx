"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useApp } from "@/context/AppContext";
import type { Movie } from "@/context/AppContext";
import { sendRec, type FriendEdge } from "@/lib/socialStore";

interface Props {
  open: boolean;
  onClose: () => void;
  movie: Movie;
}

export default function SendToFriendModal({ open, onClose, movie }: Props) {
  const { profile, friends } = useApp();
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const accepted: FriendEdge[] = friends.filter((f) => f.status === "accepted");

  useEffect(() => {
    if (!open) {
      setSelectedUid(null);
      setNote("");
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

  const send = async () => {
    if (!profile || !selectedUid) return;
    setStatus("sending");
    setError(null);
    try {
      await sendRec({ from: profile, toUid: selectedUid, movie, note });
      setStatus("sent");
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      console.error(err);
      setError("Could not send. Try again.");
      setStatus("error");
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl bg-cinema-card border border-cinema-border shadow-2xl shadow-black/50 p-6 animate-slide-down max-h-[85vh] flex flex-col"
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

        <div className="text-center space-y-1 mb-5">
          <span className="text-3xl inline-block mb-1">📨</span>
          <h2 className="text-lg font-bold font-[family-name:var(--font-display)]">Send to a friend</h2>
          <p className="text-cinema-muted text-xs truncate">&ldquo;{movie.Title}&rdquo;</p>
        </div>

        {status === "sent" ? (
          <div className="text-center py-8 space-y-2">
            <span className="text-4xl inline-block">✅</span>
            <p className="text-cinema-text font-semibold">Sent!</p>
            <p className="text-cinema-muted text-xs">They&apos;ll see it in their inbox.</p>
          </div>
        ) : (
          <>
            {accepted.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <span className="text-3xl inline-block">🤷</span>
                <p className="text-cinema-muted text-sm">No friends yet.</p>
                <p className="text-cinema-muted/70 text-xs">Add a friend by handle on the Friends page.</p>
              </div>
            ) : (
              <>
                <p className="text-xs uppercase tracking-wider text-cinema-muted mb-2">Choose friend</p>
                <div className="flex-1 overflow-y-auto space-y-1.5 mb-3 min-h-0">
                  {accepted.map((f) => {
                    const name = f.displayName || f.handle || "Friend";
                    const selected = selectedUid === f.uid;
                    return (
                      <button
                        key={f.uid}
                        onClick={() => setSelectedUid(f.uid)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                          selected
                            ? "bg-cinema-purple/15 border-cinema-purple/50"
                            : "bg-cinema-surface border-cinema-border/50 hover:border-cinema-purple/40"
                        }`}
                      >
                        <div className="relative w-9 h-9 rounded-full overflow-hidden bg-cinema-purple/30 flex items-center justify-center flex-shrink-0">
                          {f.photoURL ? (
                            <Image src={f.photoURL} alt={name} fill sizes="36px" className="object-cover" unoptimized />
                          ) : (
                            <span className="text-xs font-bold text-white">{name.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-semibold text-cinema-text truncate">{name}</p>
                          {f.handle && <p className="text-xs text-cinema-purple truncate">@{f.handle}</p>}
                        </div>
                        {selected && (
                          <svg className="w-5 h-5 text-cinema-purple flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-cinema-muted mb-2">Note (optional)</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, 280))}
                    placeholder="Why should they watch this?"
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl bg-cinema-surface border border-cinema-border text-cinema-text placeholder:text-cinema-muted/60 text-sm focus:outline-none focus:border-cinema-purple focus:ring-1 focus:ring-cinema-purple/50 resize-none"
                  />
                  <p className="text-[10px] text-cinema-muted text-right mt-1">{note.length}/280</p>
                </div>

                {error && <p className="text-cinema-red text-xs text-center mb-2">{error}</p>}

                <button
                  onClick={send}
                  disabled={!selectedUid || status === "sending"}
                  className="w-full py-3 rounded-xl font-semibold text-sm gradient-purple text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {status === "sending" ? "Sending..." : "Send recommendation"}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
