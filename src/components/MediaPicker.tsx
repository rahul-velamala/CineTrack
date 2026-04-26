"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { X, Search } from "lucide-react";
import { media, type MediaItem } from "@/lib/media";

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (item: MediaItem) => void;
}

export default function MediaPicker({ open, onClose, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await media.search(query.trim());
        setResults(res.slice(0, 12));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="picker-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 24, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className="relative w-full max-w-md rounded-3xl bg-cinema-card border border-cinema-border depth-3 max-h-[80vh] flex flex-col"
          >
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-cinema-border/30">
              <h2 className="text-sm font-semibold text-cinema-text">Send a movie or show</h2>
              <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg text-cinema-muted hover:text-cinema-text hover:bg-white/5 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 pt-4">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-cinema-muted">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search movies, TV shows..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-cinema-surface border border-cinema-border text-cinema-text placeholder:text-cinema-muted/60 text-sm focus:outline-none focus:border-cinema-purple focus:ring-1 focus:ring-cinema-purple/50"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-cinema-purple border-t-transparent rounded-full animate-spin" />
                </div>
              ) : results.length === 0 ? (
                <p className="text-cinema-muted text-sm text-center py-8">
                  {query.length < 2 ? "Type to search" : "No results"}
                </p>
              ) : (
                <div className="space-y-2">
                  {results.map((item) => {
                    const poster = item.posterUrl && item.posterUrl !== "N/A" ? item.posterUrl : "/no-poster.svg";
                    return (
                      <button
                        key={`${item.mediaType}-${item.id}`}
                        onClick={() => { onPick(item); onClose(); }}
                        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-left"
                      >
                        <div className="relative w-12 h-16 rounded-md overflow-hidden bg-cinema-surface flex-shrink-0">
                          <Image src={poster} alt={item.title} fill sizes="48px" className="object-cover" unoptimized />
                          {item.mediaType === "tv" && (
                            <span className="absolute top-0.5 left-0.5 text-[8px] font-bold uppercase px-1 py-0.5 rounded bg-black/70 text-white">TV</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-cinema-text truncate">{item.title}</p>
                          <p className="text-xs text-cinema-muted">
                            {item.year}
                            {item.rating && <> · ★ {item.rating}</>}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
