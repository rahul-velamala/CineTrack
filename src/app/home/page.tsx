"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import MovieCard from "@/components/MovieCard";
import AuthGuard from "@/components/AuthGuard";
import { getTrending, tmdbToMovie, TMDBSearchResult } from "@/lib/tmdb";

export default function HomePage() {
  const [searchKey, setSearchKey] = useState(0);
  const [initialQuery, setInitialQuery] = useState("");
  const [trending, setTrending] = useState<TMDBSearchResult[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  useEffect(() => {
    getTrending("week")
      .then((results) => setTrending(results.slice(0, 10)))
      .catch(() => {})
      .finally(() => setTrendingLoading(false));
  }, []);

  const handleChipClick = (title: string) => {
    setInitialQuery(title);
    setSearchKey((k) => k + 1);
  };

  return (
    <AuthGuard>
      <Navbar />
      <main className="min-h-screen pt-16">
        {/* Hero Section */}
        <section className="relative pt-20 pb-16 px-4">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-cinema-purple/10 rounded-full blur-[120px]" />
          </div>

          <div className="relative max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold font-[family-name:var(--font-display)] leading-tight">
                Discover &{" "}
                <span className="text-gradient-gold">Track</span>
                <br />
                Your Movies
              </h1>
              <p className="text-cinema-muted text-lg max-w-lg mx-auto">
                Search any movie or actor, watch trailers, and manage your personal watchlist — all in one place.
              </p>
            </div>

            <SearchBar key={searchKey} initialQuery={initialQuery} />

            {/* Clickable suggestion chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="text-cinema-muted">Try:</span>
              {["Inception", "3 Idiots", "Interstellar", "Dangal", "Shah Rukh Khan", "Leonardo DiCaprio"].map((title) => (
                <button
                  key={title}
                  onClick={() => handleChipClick(title)}
                  className="px-3 py-1.5 rounded-full bg-cinema-surface border border-cinema-border/50 text-cinema-muted hover:text-cinema-text hover:border-cinema-purple/50 hover:bg-cinema-purple/10 transition-all cursor-pointer"
                >
                  {title}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Feature hints */}
        <section className="max-w-5xl mx-auto px-4 pb-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: "🔍", title: "Search", desc: "Find movies by title, actor, or even partial names" },
              { icon: "🎬", title: "Watch Trailers", desc: "Watch trailers right on the page" },
              { icon: "📋", title: "Track Movies", desc: "Save to watchlist or mark as watched" },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl bg-cinema-card/50 border border-cinema-border/30 hover:border-cinema-purple/30 transition-all"
              >
                <span className="text-2xl mb-3 block">{feature.icon}</span>
                <h3 className="font-semibold text-sm text-cinema-text mb-1">{feature.title}</h3>
                <p className="text-xs text-cinema-muted">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Trending Movies */}
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-bold font-[family-name:var(--font-display)] flex items-center gap-2">
              <span>🔥</span> Trending This Week
            </h2>
          </div>

          {trendingLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] rounded-xl skeleton" />
              ))}
            </div>
          ) : trending.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {trending.map((movie, index) => (
                <div key={movie.id} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                  <MovieCard movie={tmdbToMovie(movie)} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-cinema-muted text-sm text-center py-8">Could not load trending movies.</p>
          )}
        </section>
      </main>
    </AuthGuard>
  );
}
