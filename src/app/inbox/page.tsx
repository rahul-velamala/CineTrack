"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useApp } from "@/context/AppContext";
import { deleteInboxRec, type InboxRec } from "@/lib/socialStore";
import { titleHref } from "@/lib/media";
import type { Movie } from "@/context/AppContext";

export default function InboxPage() {
  const { user, authLoading, inbox, addToWatchlist } = useApp();

  if (authLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-16 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-cinema-purple border-t-transparent rounded-full animate-spin" />
        </main>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-16">
          <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
            <span className="text-5xl">📥</span>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">Sign in to see your inbox</h1>
            <p className="text-cinema-muted text-sm">Friends can send you movie & TV recommendations. You decide what lands on your watchlist.</p>
            <Link href="/home" className="inline-block mt-4 px-6 py-3 rounded-xl font-semibold text-sm gradient-purple text-white hover:opacity-90 transition-all">
              Back to home
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="mb-8">
            <Link href="/home" className="text-xs text-cinema-muted hover:text-cinema-text transition-colors">← Back to home</Link>
            <h1 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)] mt-2 flex items-center gap-3">
              <span>📥</span> Inbox
              {inbox.length > 0 && <span className="text-cinema-muted text-sm font-normal">({inbox.length})</span>}
            </h1>
            <p className="text-cinema-muted text-sm mt-1">Recommendations from your friends.</p>
          </div>

          {inbox.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <span className="text-5xl">📭</span>
              <p className="text-cinema-muted text-sm">No recs yet. Ask a friend to send you something!</p>
              <Link href="/friends" className="text-cinema-purple hover:underline text-sm">Find friends →</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {inbox.map((rec) => (
                <InboxRow key={rec.id} rec={rec} selfUid={user.uid} onAccept={addToWatchlist} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function InboxRow({
  rec,
  selfUid,
  onAccept,
}: {
  rec: InboxRec;
  selfUid: string;
  onAccept: (m: Movie) => void;
}) {
  const [busy, setBusy] = useState(false);
  const posterSrc = rec.posterUrl && rec.posterUrl !== "N/A" ? rec.posterUrl : "/no-poster.svg";
  const fromLabel = rec.fromHandle ? `@${rec.fromHandle}` : rec.fromName || "Friend";

  const accept = async () => {
    setBusy(true);
    try {
      onAccept({
        imdbID: rec.tmdbId,
        Title: rec.title,
        Year: rec.year,
        Poster: rec.posterUrl,
        mediaType: rec.mediaType,
        Type: rec.mediaType,
      });
      await deleteInboxRec(selfUid, rec.id);
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    setBusy(true);
    try {
      await deleteInboxRec(selfUid, rec.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-cinema-card/60 border border-cinema-border/40">
      <Link href={titleHref(rec.mediaType, rec.tmdbId)} className="flex-shrink-0 self-start">
        <div className="relative w-20 h-28 sm:w-24 sm:h-36 rounded-lg overflow-hidden bg-cinema-surface">
          <Image src={posterSrc} alt={rec.title} fill sizes="96px" className="object-cover" unoptimized />
          {rec.mediaType === "tv" && (
            <span className="absolute top-1 left-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-black/70 text-white border border-white/10">
              TV
            </span>
          )}
        </div>
      </Link>

      <div className="flex-1 min-w-0 space-y-2">
        <div>
          <Link href={titleHref(rec.mediaType, rec.tmdbId)} className="font-semibold text-cinema-text hover:text-cinema-purple transition-colors">
            {rec.title}
          </Link>
          {rec.year && <span className="text-cinema-muted text-sm ml-2">{rec.year}</span>}
        </div>
        <div className="flex items-center gap-2 text-xs">
          {rec.fromPhoto && (
            <div className="relative w-5 h-5 rounded-full overflow-hidden">
              <Image src={rec.fromPhoto} alt={fromLabel} fill sizes="20px" className="object-cover" unoptimized />
            </div>
          )}
          <span className="text-cinema-muted">Recommended by</span>
          <span className="text-cinema-purple font-medium">{fromLabel}</span>
        </div>
        {rec.note && (
          <p className="text-sm text-cinema-text/80 italic leading-relaxed">&ldquo;{rec.note}&rdquo;</p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={accept}
            disabled={busy}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-cinema-green/20 text-cinema-green border border-cinema-green/30 hover:bg-cinema-green/30 disabled:opacity-50 cursor-pointer"
          >
            ✅ Accept → Watchlist
          </button>
          <button
            onClick={reject}
            disabled={busy}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-cinema-red/15 text-cinema-red border border-cinema-red/30 hover:bg-cinema-red/25 disabled:opacity-50 cursor-pointer"
          >
            ✕ Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
