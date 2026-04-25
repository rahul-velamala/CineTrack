"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import Navbar from "@/components/Navbar";
import MovieCard from "@/components/MovieCard";
import TrailerModal from "@/components/TrailerModal";
import SendToFriendModal from "@/components/SendToFriendModal";
import { useApp } from "@/context/AppContext";
import { media, titleHref, type MediaDetail, type MediaItem, type MediaType, type VideoItem, type WatchProviderInfo } from "@/lib/media";

const PROVIDER_LINKS: Record<string, (q: string) => string> = {
  "Netflix":            (q) => `https://www.netflix.com/search?q=${encodeURIComponent(q)}`,
  "Amazon Prime Video": (q) => `https://www.primevideo.com/search?phrase=${encodeURIComponent(q)}`,
  "JioHotstar":         (q) => `https://www.jiohotstar.com/search?q=${encodeURIComponent(q)}`,
  "Hotstar":            (q) => `https://www.hotstar.com/in/search?q=${encodeURIComponent(q)}`,
  "Disney Plus":        (q) => `https://www.disneyplus.com/search?q=${encodeURIComponent(q)}`,
  "Google Play Movies": (q) => `https://play.google.com/store/search?q=${encodeURIComponent(q)}&c=movies`,
  "YouTube":            (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q + " full")}`,
  "Apple TV":           (q) => `https://tv.apple.com/search?term=${encodeURIComponent(q)}`,
  "Apple TV Plus":      (q) => `https://tv.apple.com/search?term=${encodeURIComponent(q)}`,
  "Zee5":               (q) => `https://www.zee5.com/search?q=${encodeURIComponent(q)}`,
  "SonyLIV":            (q) => `https://www.sonyliv.com/search?searchTerm=${encodeURIComponent(q)}`,
  "Jio Cinema":         (q) => `https://www.jiocinema.com/search/${encodeURIComponent(q)}`,
  "Voot":               (q) => `https://www.voot.com/search?q=${encodeURIComponent(q)}`,
  "MX Player":          (q) => `https://www.mxplayer.in/search?q=${encodeURIComponent(q)}`,
  "Lionsgate Play":     (q) => `https://www.lionsgateplay.com/search?q=${encodeURIComponent(q)}`,
  "Mubi":               (q) => `https://mubi.com/en/search?query=${encodeURIComponent(q)}`,
  "Hulu":               (q) => `https://www.hulu.com/search?q=${encodeURIComponent(q)}`,
  "HBO Max":            (q) => `https://play.max.com/search?q=${encodeURIComponent(q)}`,
  "Paramount Plus":     (q) => `https://www.paramountplus.com/search?q=${encodeURIComponent(q)}`,
  "Peacock":            (q) => `https://www.peacocktv.com/search?q=${encodeURIComponent(q)}`,
};

function getProviderLink(providerName: string, title: string): string {
  const builder = PROVIDER_LINKS[providerName];
  if (builder) return builder(title);
  return `https://www.google.com/search?q=${encodeURIComponent(`watch ${title} on ${providerName}`)}`;
}

interface Props {
  type: MediaType;
  id: string;
}

export default function TitleDetail({ type, id }: Props) {
  const [detail, setDetail] = useState<MediaDetail | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [trailerLoading, setTrailerLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<MediaItem[]>([]);
  const [providers, setProviders] = useState<WatchProviderInfo | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const { addToWatchlist, markAsWatched, isInWatchlist, isInWatched, removeFromWatchlist, removeFromWatched, user } = useApp();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const backdropY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const backdropScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.15]);

  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      setLoading(true);
      setTrailerLoading(true);
      setVideos([]);
      try {
        const [data, recs, prov, vids] = await Promise.all([
          media.getDetail(type, id),
          media.getRecommendations(type, id),
          media.getWatchProviders(type, id),
          media.getVideos(type, id),
        ]);
        if (cancelled) return;
        setDetail(data);
        setRecommendations(recs);
        setProviders(prov);
        setVideos(vids);

        const keyFromDetail = data?.trailerKey ?? null;
        if (keyFromDetail) {
          setTrailerKey(keyFromDetail);
        } else {
          // Derive from fetched videos (all-language list)
          const trailer = vids.find((v) => v.type === "Trailer") || vids.find((v) => v.type === "Teaser") || vids[0];
          setTrailerKey(trailer?.key ?? null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setTrailerLoading(false);
        }
      }
    }
    if (id) fetchAll();
    return () => { cancelled = true; };
  }, [type, id]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-16">
          <div className="max-w-6xl mx-auto px-4 py-12">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-80 aspect-[2/3] rounded-2xl skeleton" />
              <div className="flex-1 space-y-4">
                <div className="h-8 w-3/4 rounded-lg skeleton" />
                <div className="h-4 w-1/2 rounded skeleton" />
                <div className="h-32 rounded-xl skeleton" />
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!detail) {
    const label = type === "tv" ? "Show" : "Movie";
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-16 flex flex-col items-center justify-center gap-4">
          <span className="text-5xl">😕</span>
          <p className="text-cinema-muted">{label} not found</p>
          <Link href="/home" className="text-cinema-purple hover:underline text-sm">← Back to search</Link>
        </main>
      </>
    );
  }

  const movie = media.toMovieFromDetail(detail);
  const poster = detail.posterUrl;
  const backdrop = detail.backdropUrl;
  const inWatchlist = isInWatchlist(movie.imdbID);
  const inWatched = isInWatched(movie.imdbID);

  const releaseDate = detail.releaseDate ? new Date(detail.releaseDate) : null;
  const isReleased = releaseDate ? releaseDate <= new Date() : true;
  let releaseLabel: string;
  if (type === "tv") {
    if (detail.inProduction) releaseLabel = "Ongoing";
    else if (detail.status === "Ended") releaseLabel = "Ended";
    else if (!isReleased) releaseLabel = "Upcoming";
    else releaseLabel = detail.status || "Released";
  } else {
    releaseLabel = isReleased ? "Released" : "Upcoming";
  }
  const statusClass = releaseLabel === "Upcoming" || releaseLabel === "Ongoing"
    ? "bg-cinema-gold/15 text-cinema-gold"
    : "bg-cinema-green/15 text-cinema-green";

  const streamOn = providers?.streaming || [];
  const rentOn = providers?.rent || [];
  const buyOn = providers?.buy || [];
  const hasProviders = streamOn.length > 0 || rentOn.length > 0 || buyOn.length > 0;

  const typeBadge = type === "tv" ? "📺 Series" : "🎬 Movie";
  const creatorLabel = type === "tv" ? "Creator" : "Director";

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16">
        <div ref={heroRef} className="relative">
          {backdrop ? (
            <motion.div style={{ y: backdropY, scale: backdropScale }} className="absolute inset-0 overflow-hidden">
              <Image src={backdrop} alt="" fill className="object-cover blur-sm opacity-25" unoptimized />
              <div className="absolute inset-0 bg-gradient-to-b from-cinema-bg/55 via-cinema-bg/80 to-cinema-bg" />
            </motion.div>
          ) : (
            <motion.div style={{ y: backdropY, scale: backdropScale }} className="absolute inset-0 overflow-hidden">
              <Image src={poster} alt="" fill className="object-cover blur-3xl opacity-20" unoptimized />
              <div className="absolute inset-0 bg-gradient-to-b from-cinema-bg/50 via-cinema-bg/80 to-cinema-bg" />
            </motion.div>
          )}

          <div className="relative max-w-6xl mx-auto px-4 py-12">
            <Link href="/home" className="inline-flex items-center gap-1 text-cinema-muted hover:text-cinema-text text-sm mb-8 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to search
            </Link>

            <div className="flex flex-col md:flex-row gap-8 animate-fade-in">
              <div className="flex-shrink-0 w-full md:w-80">
                <div className="relative aspect-[2/3] rounded-2xl overflow-hidden depth-3 border border-cinema-border/30">
                  <Image src={poster} alt={movie.Title} fill sizes="(max-width: 768px) 100vw, 320px" className="object-cover" unoptimized priority />
                </div>
              </div>

              <div className="flex-1 space-y-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cinema-purple/15 text-cinema-purple">
                      {typeBadge}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusClass}`}>
                      {releaseLabel}
                    </span>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-display)] leading-tight">{movie.Title}</h1>
                  <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-cinema-muted">
                    {movie.Year && movie.Year !== "N/A" && <span>{movie.Year}</span>}
                    {movie.Runtime && (
                      <><span className="w-1 h-1 rounded-full bg-cinema-border" /><span>{movie.Runtime}</span></>
                    )}
                    {type === "tv" && detail.seasons !== undefined && (
                      <><span className="w-1 h-1 rounded-full bg-cinema-border" /><span>{detail.seasons} season{detail.seasons === 1 ? "" : "s"}</span></>
                    )}
                    {type === "tv" && detail.episodes !== undefined && (
                      <><span className="w-1 h-1 rounded-full bg-cinema-border" /><span>{detail.episodes} episodes</span></>
                    )}
                    {movie.Language && (
                      <><span className="w-1 h-1 rounded-full bg-cinema-border" /><span>{movie.Language}</span></>
                    )}
                  </div>
                </div>

                {movie.imdbRating && movie.imdbRating !== "N/A" && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass">
                    <span className="text-cinema-gold text-lg">★</span>
                    <span className="text-xl font-bold">{movie.imdbRating}</span>
                    <span className="text-cinema-muted text-sm">/ 10</span>
                  </div>
                )}

                {movie.Genre && (
                  <div className="flex flex-wrap gap-2">
                    {movie.Genre.split(",").map((g) => (
                      <span key={g.trim()} className="px-3 py-1 rounded-full text-xs font-medium bg-cinema-purple/15 text-cinema-purple border border-cinema-purple/20">
                        {g.trim()}
                      </span>
                    ))}
                  </div>
                )}

                {movie.Plot && (
                  <div>
                    <h2 className="text-sm font-semibold text-cinema-muted uppercase tracking-wider mb-2">Plot</h2>
                    <p className="text-cinema-text/80 leading-relaxed">{movie.Plot}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  {movie.Director && (
                    <div><span className="text-cinema-muted">{creatorLabel}</span><p className="text-cinema-text font-medium mt-0.5">{movie.Director}</p></div>
                  )}
                  {movie.Actors && (
                    <div><span className="text-cinema-muted">Cast</span><p className="text-cinema-text font-medium mt-0.5">{movie.Actors}</p></div>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  {!inWatchlist && !inWatched && (
                    <button onClick={() => addToWatchlist(movie)} className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm gradient-purple text-white hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer">
                      <span>📋</span> Add to Watchlist
                    </button>
                  )}
                  {inWatchlist && (
                    <button onClick={() => removeFromWatchlist(movie.imdbID)} className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-cinema-purple/20 text-cinema-purple border border-cinema-purple/30 hover:bg-cinema-purple/30 transition-all cursor-pointer">
                      <span>✓</span> In Watchlist — Remove
                    </button>
                  )}
                  {!inWatched && (
                    <button onClick={() => markAsWatched(movie)} className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-cinema-green/15 text-cinema-green border border-cinema-green/20 hover:bg-cinema-green/25 transition-all cursor-pointer">
                      <span>✅</span> Mark as Watched
                    </button>
                  )}
                  {inWatched && (
                    <button onClick={() => removeFromWatched(movie.imdbID)} className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-cinema-green/20 text-cinema-green border border-cinema-green/30 hover:bg-cinema-green/30 transition-all cursor-pointer">
                      <span>✓</span> Watched — Remove
                    </button>
                  )}
                  {user && (
                    <button onClick={() => setSendOpen(true)} className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-cinema-surface text-cinema-text border border-cinema-border hover:border-cinema-purple/50 transition-all cursor-pointer">
                      <span>📨</span> Send to friend
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold font-[family-name:var(--font-display)] flex items-center gap-2">
              <span>🎥</span> Videos
              {videos.length > 0 && <span className="text-cinema-muted text-sm font-normal">({videos.length})</span>}
            </h2>
            {videos.length > 0 && (
              <button
                onClick={() => setModalOpen(true)}
                className="text-xs text-cinema-purple hover:underline cursor-pointer"
              >
                See all →
              </button>
            )}
          </div>

          {trailerLoading ? (
            <div className="w-full aspect-video rounded-2xl skeleton" />
          ) : trailerKey ? (
            <button
              onClick={() => setModalOpen(true)}
              aria-label="Play trailer"
              className="group relative w-full aspect-video rounded-2xl overflow-hidden border border-cinema-border/30 shadow-2xl cursor-pointer block"
            >
              <Image
                src={`https://img.youtube.com/vi/${trailerKey}/maxresdefault.jpg`}
                alt={`${movie.Title} trailer thumbnail`}
                fill
                sizes="(max-width: 768px) 100vw, 1024px"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30 group-hover:from-black/60 transition-all" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-red-600/90 group-hover:bg-red-600 flex items-center justify-center shadow-2xl shadow-red-600/50 transition-all group-hover:scale-110">
                  <svg className="w-10 h-10 sm:w-12 sm:h-12 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                </div>
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                <p className="text-white text-sm sm:text-base font-semibold line-clamp-1">Watch trailer</p>
                <span className="text-[11px] uppercase tracking-wider text-white/70 bg-black/40 px-2 py-1 rounded backdrop-blur-sm hidden sm:inline">
                  Fullscreen · Multi-language
                </span>
              </div>
            </button>
          ) : (
            <div className="w-full aspect-video rounded-2xl bg-cinema-card border border-cinema-border/30 flex flex-col items-center justify-center gap-4">
              <span className="text-4xl">🎬</span>
              <p className="text-cinema-muted text-sm">No official trailer available</p>
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${movie.Title} ${movie.Year} official trailer`)}`}
                target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
              >
                ▶ Search on YouTube
              </a>
            </div>
          )}
        </section>

        <TrailerModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={movie.Title}
          videos={videos}
          initialKey={trailerKey}
        />

        <SendToFriendModal
          open={sendOpen}
          onClose={() => setSendOpen(false)}
          movie={movie}
        />

        <section className="max-w-6xl mx-auto px-4 pb-8">
          <h2 className="text-lg font-semibold font-[family-name:var(--font-display)] mb-4 flex items-center gap-2">
            <span>📺</span> Where to Watch
          </h2>
          {hasProviders ? (
            <div className="p-6 rounded-2xl bg-cinema-card border border-cinema-border/30 space-y-5">
              {streamOn.length > 0 && (
                <div>
                  <p className="text-xs text-cinema-muted uppercase tracking-wider mb-3">Stream</p>
                  <div className="flex flex-wrap gap-3">
                    {streamOn.map((p) => (
                      <a key={p.name} href={getProviderLink(p.name, movie.Title)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cinema-surface border border-cinema-border/30 hover:border-cinema-purple/40 hover:bg-cinema-purple/5 transition-all">
                        <Image src={p.logo} alt={p.name} width={28} height={28} className="rounded-md" unoptimized />
                        <span className="text-sm text-cinema-text">{p.name}</span>
                        <svg className="w-3.5 h-3.5 text-cinema-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {rentOn.length > 0 && (
                <div>
                  <p className="text-xs text-cinema-muted uppercase tracking-wider mb-3">Rent</p>
                  <div className="flex flex-wrap gap-3">
                    {rentOn.map((p) => (
                      <a key={p.name} href={getProviderLink(p.name, movie.Title)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cinema-surface border border-cinema-border/30 hover:border-cinema-purple/40 hover:bg-cinema-purple/5 transition-all">
                        <Image src={p.logo} alt={p.name} width={28} height={28} className="rounded-md" unoptimized />
                        <span className="text-sm text-cinema-text">{p.name}</span>
                        <svg className="w-3.5 h-3.5 text-cinema-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {buyOn.length > 0 && (
                <div>
                  <p className="text-xs text-cinema-muted uppercase tracking-wider mb-3">Buy</p>
                  <div className="flex flex-wrap gap-3">
                    {buyOn.map((p) => (
                      <a key={p.name} href={getProviderLink(p.name, movie.Title)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cinema-surface border border-cinema-border/30 hover:border-cinema-purple/40 hover:bg-cinema-purple/5 transition-all">
                        <Image src={p.logo} alt={p.name} width={28} height={28} className="rounded-md" unoptimized />
                        <span className="text-sm text-cinema-text">{p.name}</span>
                        <svg className="w-3.5 h-3.5 text-cinema-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {providers?.link && (
                <a href={providers.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-cinema-purple text-sm hover:underline mt-2">
                  View all options on TMDB →
                </a>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-cinema-card border border-cinema-border/30 flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1">
                <p className="text-cinema-text font-medium">Streaming info not available</p>
                <p className="text-cinema-muted text-sm mt-1">Check JustWatch for availability in your region.</p>
              </div>
              <a
                href={`https://www.justwatch.com/in/search?q=${encodeURIComponent(movie.Title)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm gradient-gold text-cinema-bg hover:opacity-90 active:scale-[0.98] transition-all whitespace-nowrap"
              >
                🔎 Search on JustWatch
              </a>
            </div>
          )}
        </section>

        {recommendations.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 pb-16">
            <h2 className="text-lg font-semibold font-[family-name:var(--font-display)] mb-4 flex items-center gap-2">
              <span>🍿</span> You Might Also Like
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {recommendations.map((rec, index) => (
                <div key={`${rec.mediaType}-${rec.id}`} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                  <MovieCard movie={media.toMovie(rec)} href={titleHref(rec.mediaType, rec.id)} />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
