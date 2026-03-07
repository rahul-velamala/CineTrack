"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

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
  login: (code: string) => void;
  logout: () => void;
  watchlist: Movie[];
  watched: Movie[];
  addToWatchlist: (movie: Movie) => void;
  removeFromWatchlist: (id: string) => void;
  markAsWatched: (movie: Movie) => void;
  removeFromWatched: (id: string) => void;
  isInWatchlist: (id: string) => boolean;
  isInWatched: (id: string) => boolean;
  syncing: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState<string | null>(null);
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [watched, setWatched] = useState<Movie[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Track whether updates are from Firestore (to avoid write-back loops)
  const isRemoteUpdate = useRef(false);
  // Track if initial load from Firestore is done
  const firestoreLoaded = useRef(false);

  // Hydrate auth from sessionStorage on mount
  useEffect(() => {
    const auth = sessionStorage.getItem("cinetrack_auth");
    const savedCode = sessionStorage.getItem("cinetrack_passcode");
    if (auth === "true" && savedCode) {
      setIsAuthenticated(true);
      setPasscode(savedCode);
    }
    setHydrated(true);
  }, []);

  // Subscribe to Firestore real-time updates when authenticated
  useEffect(() => {
    if (!passcode) return;

    const docRef = doc(db, "users", passcode);
    setSyncing(true);

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          isRemoteUpdate.current = true;
          if (data.watchlist) setWatchlist(data.watchlist);
          if (data.watched) setWatched(data.watched);
          // Small delay to let state settle before allowing local writes
          setTimeout(() => {
            isRemoteUpdate.current = false;
          }, 100);
        }
        firestoreLoaded.current = true;
        setSyncing(false);
      },
      (error) => {
        console.error("Firestore sync error:", error);
        setSyncing(false);
        // Fall back to localStorage
        const savedWatchlist = localStorage.getItem("cinetrack_watchlist");
        if (savedWatchlist) {
          try { setWatchlist(JSON.parse(savedWatchlist)); } catch { /* ignore */ }
        }
        const savedWatched = localStorage.getItem("cinetrack_watched");
        if (savedWatched) {
          try { setWatched(JSON.parse(savedWatched)); } catch { /* ignore */ }
        }
        firestoreLoaded.current = true;
      }
    );

    return () => unsubscribe();
  }, [passcode]);

  // Sync watchlist to Firestore on changes (skip if remote update)
  useEffect(() => {
    if (!passcode || !firestoreLoaded.current || isRemoteUpdate.current) return;
    const docRef = doc(db, "users", passcode);
    setDoc(docRef, { watchlist, watched }, { merge: true }).catch(console.error);
    // Also keep localStorage as fallback
    localStorage.setItem("cinetrack_watchlist", JSON.stringify(watchlist));
    localStorage.setItem("cinetrack_watched", JSON.stringify(watched));
  }, [watchlist, watched, passcode]);

  const login = useCallback((code: string) => {
    setIsAuthenticated(true);
    setPasscode(code);
    sessionStorage.setItem("cinetrack_auth", "true");
    sessionStorage.setItem("cinetrack_passcode", code);
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setPasscode(null);
    sessionStorage.removeItem("cinetrack_auth");
    sessionStorage.removeItem("cinetrack_passcode");
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
        syncing,
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
