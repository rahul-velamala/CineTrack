"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import MovieCard from "@/components/MovieCard";
import AuthGuard from "@/components/AuthGuard";
import { useApp } from "@/context/AppContext";
import {
  getMovieDetails, getMovieVideos, getRecommendations, getWatchProviders,
  tmdbDetailToMovie, tmdbToMovie, getTrailerKey, findTrailerKey,
  posterUrl, backdropUrl,
  TMDBMovieDetail, TMDBSearchResult, WatchProviderData,
} from "@/lib/tmdb";

export default function MovieDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [detail, setDetail] = useState<TMDBMovieDetail | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [trailerLoading, setTrailerLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<TMDBSearchResult[]>([]);
  const [providers, setProviders] = useState<WatchProviderData | null>(null);
  const { addToWatchlist, markAsWatched, isInWatchlist, isInWatched, removeFromWatchlist, removeFromWatched } = useApp();

  useEffect(() => {
    async function fetchAll() {
      try {
        const [data, recs, prov] = await Promise.all([
          getMovieDetails(id),
          getRecommendations(id),
          getWatchProviders(id),
        ]);
        setDetail(data);
        setRecommendations(recs);
        setProviders(prov);

        if (data) {
          let key = getTrailerKey(data);
          if (!key) {
            const allVideos = await getMovieVideos(id);
            key = findTrailerKey(allVideos);
          }
          setTrailerKey(key);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
        setTrailerLoading(false);
      }
    }
    if (id) fetchAll();
  }, [id]);

  if (loading) {
    return (
      <AuthGuard>
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
      </AuthGuard>
    );
  }

  if (!detail) {
    return (
      <AuthGuard>
        <Navbar />
        <main className="min-h-screen pt-16 flex flex-col items-center justify-center gap-4">
          <span className="text-5xl">😕</span>
          <p className="text-cinema-muted">Movie not found</p>
          <Link href="/home" className="text-cinema-purple hover:underline text-sm">← Back to search</Link>
        </main>
      </AuthGuard>
    );
  }

  const movie = tmdbDetailToMovie(detail);
  const poster = posterUrl(detail.poster_path, "w780");
  const backdrop = backdropUrl(detail.backdrop_path);
  const inWatchlist = isInWatchlist(movie.imdbID);
  const inWatched = isInWatched(movie.imdbID);
  const director = detail.credits?.crew?.find((c) => c.job === "Director");
  const cast = detail.credits?.cast?.slice(0, 5);

  // Release status
  const releaseDate = detail.release_date ? new Date(detail.release_date) : null;
  const isReleased = releaseDate ? releaseDate <= new Date() : true;
  const releaseLabel = isReleased ? "Released" : "Upcoming";

  // OTT providers
  const streamOn = providers?.flatrate || [];
  const rentOn = providers?.rent || [];
  const buyOn = providers?.buy || [];
  const hasProviders = streamOn.length > 0 || rentOn.length > 0 || buyOn.length > 0;

  return (
    <AuthGuard>
      <Navbar />
      <main className="min-h-screen pt-16">
        {/* Hero backdrop */}
        <div className="relative">
          {backdrop ? (
            <div className="absolute inset-0 overflow-hidden">
              <Image src={backdrop} alt="" fill className="object-cover blur-sm opacity-20 scale-105" unoptimized />
              <div className="absolute inset-0 bg-gradient-to-b from-cinema-bg/60 via-cinema-bg/80 to-cinema-bg" />
            </div>
          ) : (
            <div className="absolute inset-0 overflow-hidden">
              <Image src={poster} alt="" fill className="object-cover blur-3xl opacity-15 scale-110" unoptimized />
              <div className="absolute inset-0 bg-gradient-to-b from-cinema-bg/50 via-cinema-bg/80 to-cinema-bg" />
            </div>
          )}

          <div className="relative max-w-6xl mx-auto px-4 py-12">
            <Link href="/home" className="inline-flex items-center gap-1 text-cinema-muted hover:text-cinema-text text-sm mb-8 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to search
            </Link>

            <div className="flex flex-col md:flex-row gap-8 animate-fade-in">
              {/* Poster */}
              <div className="flex-shrink-0 w-full md:w-80">
                <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-cinema-border/30">
                  <Image src={poster} alt={movie.Title} fill sizes="(max-width: 768px) 100vw, 320px" className="object-cover" unoptimized priority />
                </div>
              </div>

              {/* Details */}
              <div className="flex-1 space-y-5">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${isReleased ? "bg-cinema-green/15 text-cinema-green" : "bg-cinema-gold/15 text-cinema-gold"}`}>
                      {releaseLabel}
                    </span>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-display)] leading-tight">{movie.Title}</h1>
                  <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-cinema-muted">
                    {movie.Year && movie.Year !== "N/A" && <span>{movie.Year}</span>}
                    {movie.Runtime && (
                      <><span className="w-1 h-1 rounded-full bg-cinema-border" /><span>{movie.Runtime}</span></>
                    )}
                    {movie.Language && (
                      <><span className="w-1 h-1 rounded-full bg-cinema-border" /><span>{movie.Language}</span></>
                    )}
                  </div>
                </div>

                {/* Rating */}
                {movie.imdbRating && movie.imdbRating !== "N/A" && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass">
                    <span className="text-cinema-gold text-lg">★</span>
                    <span className="text-xl font-bold">{movie.imdbRating}</span>
                    <span className="text-cinema-muted text-sm">/ 10</span>
                  </div>
                )}

                {/* Genre tags */}
                {movie.Genre && (
                  <div className="flex flex-wrap gap-2">
                    {movie.Genre.split(",").map((g) => (
                      <span key={g.trim()} className="px-3 py-1 rounded-full text-xs font-medium bg-cinema-purple/15 text-cinema-purple border border-cinema-purple/20">
                        {g.trim()}
                      </span>
                    ))}
                  </div>
                )}

                {/* Plot */}
                {movie.Plot && (
                  <div>
                    <h2 className="text-sm font-semibold text-cinema-muted uppercase tracking-wider mb-2">Plot</h2>
                    <p className="text-cinema-text/80 leading-relaxed">{movie.Plot}</p>
                  </div>
                )}

                {/* Credits */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  {director && (
                    <div><span className="text-cinema-muted">Director</span><p className="text-cinema-text font-medium mt-0.5">{director.name}</p></div>
                  )}
                  {cast && cast.length > 0 && (
                    <div><span className="text-cinema-muted">Cast</span><p className="text-cinema-text font-medium mt-0.5">{cast.map((c) => c.name).join(", ")}</p></div>
                  )}
                </div>

                {/* Action buttons */}
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
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trailer */}
        <section className="max-w-6xl mx-auto px-4 py-8">
          <h2 className="text-lg font-semibold font-[family-name:var(--font-display)] mb-4 flex items-center gap-2">
            <span>🎥</span> Trailer
          </h2>
          {trailerLoading ? (
            <div className="w-full aspect-video rounded-2xl skeleton" />
          ) : trailerKey ? (
            <div className="w-full aspect-video rounded-2xl overflow-hidden border border-cinema-border/30 shadow-2xl">
              <iframe
                src={`https://www.youtube.com/embed/${trailerKey}?rel=0&modestbranding=1`}
                title={`${movie.Title} Trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          ) : (
            <div className="w-full aspect-video rounded-2xl bg-cinema-card border border-cinema-border/30 flex flex-col items-center justify-center gap-4">
              <span className="text-4xl">🎬</span>
              <p className="text-cinema-muted text-sm">Trailer not available</p>
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

        {/* Where to Watch — OTT Providers */}
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
                      <div key={p.provider_id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cinema-surface border border-cinema-border/30">
                        <Image src={`https://image.tmdb.org/t/p/w45${p.logo_path}`} alt={p.provider_name} width={28} height={28} className="rounded-md" unoptimized />
                        <span className="text-sm text-cinema-text">{p.provider_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {rentOn.length > 0 && (
                <div>
                  <p className="text-xs text-cinema-muted uppercase tracking-wider mb-3">Rent</p>
                  <div className="flex flex-wrap gap-3">
                    {rentOn.map((p) => (
                      <div key={p.provider_id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cinema-surface border border-cinema-border/30">
                        <Image src={`https://image.tmdb.org/t/p/w45${p.logo_path}`} alt={p.provider_name} width={28} height={28} className="rounded-md" unoptimized />
                        <span className="text-sm text-cinema-text">{p.provider_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {buyOn.length > 0 && (
                <div>
                  <p className="text-xs text-cinema-muted uppercase tracking-wider mb-3">Buy</p>
                  <div className="flex flex-wrap gap-3">
                    {buyOn.map((p) => (
                      <div key={p.provider_id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cinema-surface border border-cinema-border/30">
                        <Image src={`https://image.tmdb.org/t/p/w45${p.logo_path}`} alt={p.provider_name} width={28} height={28} className="rounded-md" unoptimized />
                        <span className="text-sm text-cinema-text">{p.provider_name}</span>
                      </div>
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

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 pb-16">
            <h2 className="text-lg font-semibold font-[family-name:var(--font-display)] mb-4 flex items-center gap-2">
              <span>🍿</span> You Might Also Like
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {recommendations.map((rec, index) => (
                <div key={rec.id} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                  <MovieCard movie={tmdbToMovie(rec)} />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </AuthGuard>
  );
}
