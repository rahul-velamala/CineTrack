"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export type MediaType = "movie" | "tv";

export interface Movie {
  imdbID: string;
  Title: string;
  Year: string;
  Poster: string;
  Genre?: string;
  imdbRating?: string;
  Plot?: string;
  Language?: string;
  Runtime?: string;
  Director?: string;
  Actors?: string;
  Type?: string;
  mediaType?: MediaType;
  Seasons?: number;
  Episodes?: number;
}

interface AppContextType {
  watchlist: Movie[];
  watched: Movie[];
  addToWatchlist: (movie: Movie) => void;
  removeFromWatchlist: (id: string) => void;
  markAsWatched: (movie: Movie) => void;
  removeFromWatched: (id: string) => void;
  isInWatchlist: (id: string) => boolean;
  isInWatched: (id: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const WATCHLIST_KEY = "cinetrack_watchlist";
const WATCHED_KEY = "cinetrack_watched";

function normalize(m: Movie): Movie {
  return { ...m, mediaType: m.mediaType ?? "movie" };
}

function loadList(key: string): Movie[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalize);
  } catch {
    return [];
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [watched, setWatched] = useState<Movie[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setWatchlist(loadList(WATCHLIST_KEY));
    setWatched(loadList(WATCHED_KEY));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
  }, [watchlist, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(WATCHED_KEY, JSON.stringify(watched));
  }, [watched, hydrated]);

  const addToWatchlist = useCallback((movie: Movie) => {
    const m = normalize(movie);
    setWatchlist((prev) => (prev.some((x) => x.imdbID === m.imdbID) ? prev : [...prev, m]));
  }, []);

  const removeFromWatchlist = useCallback((id: string) => {
    setWatchlist((prev) => prev.filter((m) => m.imdbID !== id));
  }, []);

  const markAsWatched = useCallback((movie: Movie) => {
    const m = normalize(movie);
    setWatchlist((prev) => prev.filter((x) => x.imdbID !== m.imdbID));
    setWatched((prev) => (prev.some((x) => x.imdbID === m.imdbID) ? prev : [...prev, m]));
  }, []);

  const removeFromWatched = useCallback((id: string) => {
    setWatched((prev) => prev.filter((m) => m.imdbID !== id));
  }, []);

  const isInWatchlist = useCallback((id: string) => watchlist.some((m) => m.imdbID === id), [watchlist]);
  const isInWatched = useCallback((id: string) => watched.some((m) => m.imdbID === id), [watched]);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[#08080f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppContext.Provider
      value={{
        watchlist,
        watched,
        addToWatchlist,
        removeFromWatchlist,
        markAsWatched,
        removeFromWatched,
        isInWatchlist,
        isInWatched,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
