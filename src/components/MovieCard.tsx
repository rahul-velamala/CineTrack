"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Movie, useApp } from "@/context/AppContext";

interface MovieCardProps {
  movie: Movie;
  variant?: "watchlist" | "watched";
}

export default function MovieCard({ movie, variant }: MovieCardProps) {
  const { addToWatchlist, removeFromWatchlist, markAsWatched, removeFromWatched, isInWatchlist, isInWatched } = useApp();
  const router = useRouter();

  const posterSrc = movie.Poster && movie.Poster !== "N/A" ? movie.Poster : "/no-poster.svg";

  const handleCardClick = () => {
    router.push(`/movie/${movie.imdbID}`);
  };

  return (
    <div
      className="movie-card group relative rounded-xl overflow-hidden bg-cinema-card border border-cinema-border/50 cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] overflow-hidden bg-cinema-surface">
        <Image
          src={posterSrc}
          alt={movie.Title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized
        />
        {/* Rating badge */}
        {movie.imdbRating && movie.imdbRating !== "N/A" && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md glass text-xs font-bold">
            <span className="text-cinema-gold">★</span>
            <span>{movie.imdbRating}</span>
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-cinema-text group-hover:text-white transition-colors">
          {movie.Title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-cinema-muted">
          {movie.Year && <span>{movie.Year}</span>}
          {movie.Genre && movie.Genre !== "N/A" && (
            <>
              <span className="w-1 h-1 rounded-full bg-cinema-border" />
              <span className="truncate">{movie.Genre.split(",")[0]}</span>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 pt-1">
          {variant === "watchlist" && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); markAsWatched(movie); }}
                className="w-full py-1.5 px-3 rounded-lg text-xs font-medium bg-cinema-green/15 text-cinema-green hover:bg-cinema-green/25 transition-colors cursor-pointer"
              >
                ✅ Mark Watched
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); removeFromWatchlist(movie.imdbID); }}
                className="w-full py-1.5 px-3 rounded-lg text-xs font-medium bg-cinema-red/15 text-cinema-red hover:bg-cinema-red/25 transition-colors cursor-pointer"
              >
                ✕ Remove
              </button>
            </>
          )}
          {variant === "watched" && (
            <button
              onClick={(e) => { e.stopPropagation(); removeFromWatched(movie.imdbID); }}
              className="w-full py-1.5 px-3 rounded-lg text-xs font-medium bg-cinema-red/15 text-cinema-red hover:bg-cinema-red/25 transition-colors cursor-pointer"
            >
              ✕ Remove
            </button>
          )}
          {!variant && (
            <>
              {!isInWatchlist(movie.imdbID) && !isInWatched(movie.imdbID) && (
                <button
                  onClick={(e) => { e.stopPropagation(); addToWatchlist(movie); }}
                  className="w-full py-1.5 px-3 rounded-lg text-xs font-medium bg-cinema-purple/15 text-cinema-purple hover:bg-cinema-purple/25 transition-colors cursor-pointer"
                >
                  + Watchlist
                </button>
              )}
              {isInWatchlist(movie.imdbID) && (
                <span className="text-xs text-cinema-purple text-center py-1">📋 In Watchlist</span>
              )}
              {isInWatched(movie.imdbID) && (
                <span className="text-xs text-cinema-green text-center py-1">✅ Watched</span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
