"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

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
}

interface AppContextType {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
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

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [watched, setWatched] = useState<Movie[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from storage on mount
  useEffect(() => {
    const auth = sessionStorage.getItem("cinetrack_auth");
    if (auth === "true") setIsAuthenticated(true);

    const savedWatchlist = localStorage.getItem("cinetrack_watchlist");
    if (savedWatchlist) {
      try { setWatchlist(JSON.parse(savedWatchlist)); } catch { /* ignore */ }
    }

    const savedWatched = localStorage.getItem("cinetrack_watched");
    if (savedWatched) {
      try { setWatched(JSON.parse(savedWatched)); } catch { /* ignore */ }
    }

    setHydrated(true);
  }, []);

  // Persist watchlist
  useEffect(() => {
    if (hydrated) localStorage.setItem("cinetrack_watchlist", JSON.stringify(watchlist));
  }, [watchlist, hydrated]);

  // Persist watched
  useEffect(() => {
    if (hydrated) localStorage.setItem("cinetrack_watched", JSON.stringify(watched));
  }, [watched, hydrated]);

  const login = useCallback(() => {
    setIsAuthenticated(true);
    sessionStorage.setItem("cinetrack_auth", "true");
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("cinetrack_auth");
  }, []);

  const addToWatchlist = useCallback((movie: Movie) => {
    setWatchlist((prev) => {
      if (prev.some((m) => m.imdbID === movie.imdbID)) return prev;
      return [...prev, movie];
    });
  }, []);

  const removeFromWatchlist = useCallback((id: string) => {
    setWatchlist((prev) => prev.filter((m) => m.imdbID !== id));
  }, []);

  const markAsWatched = useCallback((movie: Movie) => {
    setWatchlist((prev) => prev.filter((m) => m.imdbID !== movie.imdbID));
    setWatched((prev) => {
      if (prev.some((m) => m.imdbID === movie.imdbID)) return prev;
      return [...prev, movie];
    });
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
        isAuthenticated,
        login,
        logout,
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
