"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import MovieCard from "@/components/MovieCard";
import Poster3DStrip from "@/components/Poster3DStrip";
import { media, titleHref, type MediaItem } from "@/lib/media";
import { useApp } from "@/context/AppContext";
import { computePersonalRecs } from "@/lib/recommendations";

export default function HomePage() {
  const { watched, watchlist } = useApp();
  const [searchKey, setSearchKey] = useState(0);
  const [initialQuery, setInitialQuery] = useState("");
  const [trending, setTrending] = useState<MediaItem[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [recs, setRecs] = useState<MediaItem[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsSufficient, setRecsSufficient] = useState(false);

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroBgY = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const heroFgY = useTransform(scrollYProgress, [0, 1], ["0%", "-15%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.4]);

  const seedSignature = useMemo(() => {
    const w = watched.slice(-20).map((m) => `${m.mediaType ?? "movie"}:${m.imdbID}`).join(",");
    const l = watchlist.map((m) => `${m.mediaType ?? "movie"}:${m.imdbID}`).join(",");
    return `${w}||${l}`;
  }, [watched, watchlist]);

  useEffect(() => {
    media.getTrendingAll("week")
      .then((results) => setTrending(results.slice(0, 16)))
      .catch(() => {})
      .finally(() => setTrendingLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setRecsLoading(true);
      try {
        const result = await computePersonalRecs(watched, watchlist);
        if (cancelled) return;
        setRecs(result.items);
        setRecsSufficient(result.sufficient);
      } finally {
        if (!cancelled) setRecsLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedSignature]);

  const handleChipClick = (title: string) => {
    setInitialQuery(title);
    setSearchKey((k) => k + 1);
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16">
        <section ref={heroRef} className="relative pt-20 pb-10 px-4 overflow-hidden">
          {/* Parallax backdrop blobs */}
          <motion.div
            style={{ y: heroBgY, opacity: heroOpacity }}
            className="absolute inset-0 overflow-hidden pointer-events-none"
            aria-hidden
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-cinema-purple/20 rounded-full blur-[120px]" />
            <div className="absolute top-32 right-0 w-[400px] h-[400px] bg-cinema-magenta/15 rounded-full blur-[100px]" />
            <div className="absolute top-10 left-0 w-[300px] h-[300px] bg-cinema-purple/10 rounded-full blur-[80px]" />
          </motion.div>

          {/* Foreground */}
          <motion.div style={{ y: heroFgY }} className="relative max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold font-[family-name:var(--font-display)] leading-tight">
                Discover &{" "}
                <span className="text-gradient-purple">Track</span>
                <br />
                Movies & Shows
              </h1>
              <p className="text-cinema-muted text-lg max-w-lg mx-auto">
                Search movies, TV series, and actors. Watch trailers. Build your personal watchlist.
              </p>
            </div>

            <SearchBar key={searchKey} initialQuery={initialQuery} />

            <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="text-cinema-muted">Try:</span>
              {["Inception", "Breaking Bad", "3 Idiots", "Succession", "Dangal", "Shah Rukh Khan"].map((title) => (
                <button
                  key={title}
                  onClick={() => handleChipClick(title)}
                  className="px-3 py-1.5 rounded-full bg-cinema-surface/80 backdrop-blur-sm border border-cinema-border/50 text-cinema-muted hover:text-cinema-text hover:border-cinema-purple/50 hover:bg-cinema-purple/10 transition-all cursor-pointer"
                >
                  {title}
                </button>
              ))}
            </div>
          </motion.div>
        </section>

        {/* 3D trending poster carousel */}
        <section className="pb-12">
          <Poster3DStrip items={trending} />
        </section>

        {recsSufficient && recs.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 pb-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl sm:text-2xl font-bold font-[family-name:var(--font-display)] flex items-center gap-2">
                <span>✨</span> For You
              </h2>
              <span className="text-xs text-cinema-muted">Based on your watchlist &amp; watched</span>
            </div>

            {recsLoading && recs.length === 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="aspect-[2/3] rounded-xl skeleton" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {recs.slice(0, 15).map((item, index) => (
                  <div key={`${item.mediaType}-${item.id}`} className="animate-fade-in" style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}>
                    <MovieCard movie={media.toMovie(item)} href={titleHref(item.mediaType, item.id)} />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="max-w-6xl mx-auto px-4 pb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-bold font-[family-name:var(--font-display)] flex items-center gap-2">
              <span>🔥</span> Trending This Week
            </h2>
            {!recsSufficient && (watched.length + watchlist.length) > 0 && (
              <span className="text-xs text-cinema-muted">
                Add {Math.max(5 - (watched.length + watchlist.length), 0)} more titles to unlock &ldquo;For You&rdquo;
              </span>
            )}
          </div>

          {trendingLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] rounded-xl skeleton" />
              ))}
            </div>
          ) : trending.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {trending.slice(0, 12).map((item, index) => (
                <div key={`${item.mediaType}-${item.id}`} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                  <MovieCard movie={media.toMovie(item)} href={titleHref(item.mediaType, item.id)} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-cinema-muted text-sm text-center py-8">Could not load trending content.</p>
          )}
        </section>
      </main>
    </>
  );
}
