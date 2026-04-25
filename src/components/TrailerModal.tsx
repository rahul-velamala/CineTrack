"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX } from "lucide-react";
import type { VideoItem } from "@/lib/media";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  videos: VideoItem[];
  initialKey?: string | null;
}

const TYPE_GROUPS = ["Trailer", "Teaser", "Clip", "Featurette", "Behind the Scenes", "Other"] as const;
type TypeGroup = typeof TYPE_GROUPS[number];

function groupFor(v: VideoItem): TypeGroup {
  const t = v.type;
  if (t === "Trailer" || t === "Teaser" || t === "Clip" || t === "Featurette") return t;
  if (t === "Behind the Scenes") return "Behind the Scenes";
  return "Other";
}

function languageLabel(code?: string): string {
  if (!code) return "Unknown";
  try {
    const dn = new Intl.DisplayNames(["en"], { type: "language" });
    const name = dn.of(code);
    return name ? `${name} (${code.toUpperCase()})` : code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

function postToIframe(iframe: HTMLIFrameElement | null, func: string, args: unknown[] = []) {
  if (!iframe || !iframe.contentWindow) return;
  try {
    iframe.contentWindow.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "*"
    );
  } catch {
    // ignore
  }
}

export default function TrailerModal({ open, onClose, title, videos, initialKey }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [group, setGroup] = useState<TypeGroup>("Trailer");
  const [lang, setLang] = useState<string>("all");
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const availableGroups = useMemo(() => {
    const set = new Set<TypeGroup>();
    for (const v of videos) set.add(groupFor(v));
    return TYPE_GROUPS.filter((g) => set.has(g));
  }, [videos]);

  const filtered = useMemo(() => {
    return videos
      .filter((v) => groupFor(v) === group)
      .filter((v) => lang === "all" || (v.language || "xx") === lang)
      .sort((a, b) => {
        if (a.official !== b.official) return a.official ? -1 : 1;
        const ad = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const bd = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return bd - ad;
      });
  }, [videos, group, lang]);

  const languages = useMemo(() => {
    const set = new Set<string>();
    for (const v of videos) if (groupFor(v) === group && v.language) set.add(v.language);
    return [...set].sort();
  }, [videos, group]);

  // Initialize selection when opening
  useEffect(() => {
    if (!open) return;
    if (initialKey) {
      const idx = videos.findIndex((v) => v.key === initialKey);
      if (idx >= 0) {
        const g = groupFor(videos[idx]);
        setGroup(g);
        setLang("all");
        // activeIndex needs to be within the filtered list for this group
        const withinGroup = videos.filter((v) => groupFor(v) === g).findIndex((v) => v.key === initialKey);
        setActiveIndex(Math.max(0, withinGroup));
        return;
      }
    }
    const firstGroup = availableGroups[0] || "Trailer";
    setGroup(firstGroup);
    setLang("all");
    setActiveIndex(0);
    setMuted(true);
    setPlaying(true);
  }, [open, initialKey, videos, availableGroups]);

  // Clamp activeIndex when filter changes
  useEffect(() => {
    if (activeIndex >= filtered.length) setActiveIndex(0);
  }, [filtered.length, activeIndex]);

  const current = filtered[activeIndex];

  const doPrev = () => setActiveIndex((i) => (i > 0 ? i - 1 : filtered.length - 1));
  const doNext = () => setActiveIndex((i) => (i < filtered.length - 1 ? i + 1 : 0));
  const toggleMute = () => {
    const next = !muted;
    postToIframe(iframeRef.current, next ? "mute" : "unMute");
    setMuted(next);
  };
  const togglePlay = () => {
    const next = !playing;
    postToIframe(iframeRef.current, next ? "playVideo" : "pauseVideo");
    setPlaying(next);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key === "ArrowLeft") { e.preventDefault(); doPrev(); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); doNext(); return; }
      if (e.key.toLowerCase() === "m") { e.preventDefault(); toggleMute(); return; }
      if (e.key === " ") { e.preventDefault(); togglePlay(); return; }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filtered.length, muted, playing]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!mounted) return null;

  const src = current
    ? `https://www.youtube.com/embed/${current.key}?autoplay=1&mute=1&rel=0&modestbranding=1&enablejsapi=1&controls=1&playsinline=1`
    : "";

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="trailer-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-[300] flex flex-col bg-black/90 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`${title} videos`}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="w-full h-full flex flex-col"
          >
        <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-white/10 bg-black/40">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-cinema-muted">Videos</p>
            <h2 className="text-base sm:text-lg font-semibold text-white truncate">{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[11px] text-cinema-muted px-2">
              ← / → switch &nbsp;·&nbsp; M mute &nbsp;·&nbsp; Space pause &nbsp;·&nbsp; Esc close
            </span>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-2 rounded-lg text-cinema-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2 px-4 sm:px-6 py-3 border-b border-white/10 bg-black/30">
          <div className="flex flex-wrap gap-1.5">
            {availableGroups.map((g) => (
              <button
                key={g}
                onClick={() => { setGroup(g); setLang("all"); setActiveIndex(0); }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  g === group
                    ? "bg-cinema-purple/30 text-cinema-purple border border-cinema-purple/50"
                    : "bg-white/5 text-cinema-muted border border-white/10 hover:text-white"
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {languages.length > 1 && (
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-[11px] text-cinema-muted">Lang:</span>
              <select
                value={lang}
                onChange={(e) => { setLang(e.target.value); setActiveIndex(0); }}
                className="px-2 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cinema-purple cursor-pointer"
              >
                <option value="all">All</option>
                {languages.map((code) => (
                  <option key={code} value={code}>{languageLabel(code)}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-black">
          {current ? (
            <div className="w-full max-w-6xl aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl relative">
              <iframe
                ref={iframeRef}
                key={current.key}
                src={src}
                title={current.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          ) : (
            <div className="text-center space-y-3 text-cinema-muted">
              <span className="text-5xl block">🎬</span>
              <p>No videos in this category.</p>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-white/10 bg-black/40">
          <div className="min-w-0 flex-1">
            {current && (
              <>
                <p className="text-sm text-white truncate">
                  {current.official && <span className="text-cinema-purple mr-2">Official</span>}
                  {current.name}
                </p>
                <p className="text-[11px] text-cinema-muted">
                  {filtered.length > 0 && `${activeIndex + 1} / ${filtered.length}`}
                  {current.language && <> &nbsp;·&nbsp; {languageLabel(current.language)}</>}
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={doPrev}
              disabled={filtered.length <= 1}
              aria-label="Previous"
              className="p-2 rounded-lg text-cinema-muted hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={togglePlay}
              aria-label={playing ? "Pause" : "Play"}
              className="p-2 rounded-lg text-cinema-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
              className="p-2 rounded-lg text-cinema-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <button
              onClick={doNext}
              disabled={filtered.length <= 1}
              aria-label="Next"
              className="p-2 rounded-lg text-cinema-muted hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
