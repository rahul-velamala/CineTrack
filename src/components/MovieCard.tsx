"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Tv, BookmarkPlus, BookmarkCheck, Check, X, Star, Eye } from "lucide-react";
import { Movie, useApp } from "@/context/AppContext";
import { titleHref } from "@/lib/media";
import { useToast } from "@/components/Toast";

interface MovieCardProps {
  movie: Movie;
  variant?: "watchlist" | "watched";
  href?: string;
}

export default function MovieCard({ movie, variant, href }: MovieCardProps) {
  const { addToWatchlist, removeFromWatchlist, markAsWatched, removeFromWatched, isInWatchlist, isInWatched } = useApp();
  const toast = useToast();
  const router = useRouter();

  const posterSrc = movie.Poster && movie.Poster !== "N/A" ? movie.Poster : "/no-poster.svg";
  const isTV = movie.mediaType === "tv";
  const destination = href ?? titleHref(movie.mediaType ?? "movie", movie.imdbID);

  // 3D tilt motion values
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const xSpring = useSpring(x, { stiffness: 200, damping: 20 });
  const ySpring = useSpring(y, { stiffness: 200, damping: 20 });
  const rotateX = useTransform(ySpring, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(xSpring, [-0.5, 0.5], [-8, 8]);
  const glareX = useTransform(xSpring, [-0.5, 0.5], ["80%", "20%"]);
  const glareY = useTransform(ySpring, [-0.5, 0.5], ["80%", "20%"]);
  const glareBg = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.18), transparent 55%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(px);
    y.set(py);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const handleCardClick = () => {
    router.push(destination);
  };

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div className="scene-3d">
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleCardClick}
        whileTap={{ scale: 0.98 }}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="group relative rounded-xl overflow-hidden bg-cinema-card border border-cinema-border/50 cursor-pointer hover:border-cinema-purple/50 transition-colors depth-1 hover:depth-2"
      >
        {/* Glare highlight */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: glareBg }}
        />

        <div className="relative aspect-[2/3] overflow-hidden bg-cinema-surface">
          <Image
            src={posterSrc}
            alt={movie.Title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.06]"
            unoptimized
          />
          {isTV && (
            <div className="absolute top-2 left-2 z-20 flex items-center gap-1 px-2 py-1 rounded-md bg-black/70 backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider text-white border border-white/10">
              <Tv className="w-3 h-3" />
              Series
            </div>
          )}
          {movie.imdbRating && movie.imdbRating !== "N/A" && (
            <div className="absolute top-2 right-2 z-20 flex items-center gap-1 px-2 py-1 rounded-md glass text-xs font-bold">
              <Star className="w-3 h-3 text-cinema-gold fill-cinema-gold" />
              <span>{movie.imdbRating}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

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

          <div className="flex flex-col gap-1.5 pt-1">
            {variant === "watchlist" && (
              <>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={(e) => { stop(e); markAsWatched(movie); toast.success(`Marked "${movie.Title}" as watched`); }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium bg-cinema-green/15 text-cinema-green hover:bg-cinema-green/25 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> Mark Watched
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={(e) => { stop(e); removeFromWatchlist(movie.imdbID); toast.info(`Removed "${movie.Title}"`); }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium bg-cinema-red/15 text-cinema-red hover:bg-cinema-red/25 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Remove
                </motion.button>
              </>
            )}
            {variant === "watched" && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={(e) => { stop(e); removeFromWatched(movie.imdbID); toast.info(`Removed "${movie.Title}"`); }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium bg-cinema-red/15 text-cinema-red hover:bg-cinema-red/25 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Remove
              </motion.button>
            )}
            {!variant && (
              <>
                {!isInWatchlist(movie.imdbID) && !isInWatched(movie.imdbID) && (
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={(e) => { stop(e); addToWatchlist(movie); toast.success(`Added "${movie.Title}" to watchlist`); }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium bg-cinema-purple/15 text-cinema-purple hover:bg-cinema-purple/25 transition-colors cursor-pointer"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" /> Watchlist
                  </motion.button>
                )}
                {isInWatchlist(movie.imdbID) && (
                  <span className="flex items-center justify-center gap-1.5 text-xs text-cinema-purple py-1">
                    <BookmarkCheck className="w-3.5 h-3.5" /> In Watchlist
                  </span>
                )}
                {isInWatched(movie.imdbID) && (
                  <span className="flex items-center justify-center gap-1.5 text-xs text-cinema-green py-1">
                    <Check className="w-3.5 h-3.5" /> Watched
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
