"use client";

import Navbar from "@/components/Navbar";
import MovieCard from "@/components/MovieCard";
import AuthGuard from "@/components/AuthGuard";
import { useApp } from "@/context/AppContext";
import Link from "next/link";

export default function WatchlistPage() {
  const { watchlist } = useApp();

  return (
    <AuthGuard>
      <Navbar />
      <main className="min-h-screen pt-16">
        <div className="max-w-6xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)] flex items-center gap-3">
                <span>📋</span>
                <span>My Watchlist</span>
              </h1>
              <p className="text-cinema-muted text-sm mt-1">
                {watchlist.length} {watchlist.length === 1 ? "movie" : "movies"} to watch
              </p>
            </div>
          </div>

          {watchlist.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {watchlist.map((movie, index) => (
                <div key={movie.imdbID} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                  <MovieCard movie={movie} variant="watchlist" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <span className="text-6xl">🍿</span>
              <p className="text-cinema-muted text-lg">Your watchlist is empty</p>
              <p className="text-cinema-muted/60 text-sm">Search for movies and add them here!</p>
              <Link
                href="/home"
                className="mt-4 px-6 py-3 rounded-xl font-semibold text-sm gradient-purple text-white hover:opacity-90 transition-all"
              >
                🔍 Search Movies
              </Link>
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
