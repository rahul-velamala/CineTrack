"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  claimHandle as claimHandleFn,
  ensureUserDoc,
  mergeLocalIntoFirestore,
  type UserProfile,
} from "@/lib/userStore";
import {
  signInGoogle as doSignInGoogle,
  sendEmailLink as doSendEmailLink,
  signOut as doSignOut,
} from "@/lib/auth";
import { subscribeFriends, subscribeInbox, type FriendEdge, type InboxRec } from "@/lib/socialStore";
import { attachInviteOnSignIn, captureInviteFromUrl } from "@/lib/inviteTracking";

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
  // data
  watchlist: Movie[];
  watched: Movie[];
  addToWatchlist: (movie: Movie) => void;
  removeFromWatchlist: (id: string) => void;
  markAsWatched: (movie: Movie) => void;
  removeFromWatched: (id: string) => void;
  isInWatchlist: (id: string) => boolean;
  isInWatched: (id: string) => boolean;
  // auth
  user: User | null;
  profile: UserProfile | null;
  authLoading: boolean;
  syncing: boolean;
  needsHandle: boolean;
  signInGoogle: () => Promise<void>;
  sendEmailLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  claimHandle: (raw: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  // social
  friends: FriendEdge[];
  inbox: InboxRec[];
  incomingCount: number;
  inboxCount: number;
  // guest tracking
  guestAdds: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const WATCHLIST_KEY = "cinetrack_watchlist";
const WATCHED_KEY = "cinetrack_watched";
const GUEST_ADDS_KEY = "cinetrack_guest_adds";

function loadGuestAdds(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(GUEST_ADDS_KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

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

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [friends, setFriends] = useState<FriendEdge[]>([]);
  const [inbox, setInbox] = useState<InboxRec[]>([]);
  const [guestAdds, setGuestAdds] = useState(0);

  const isRemoteUpdate = useRef(false);
  const firestoreLoaded = useRef(false);
  const migrated = useRef(false);
  const userRef = useRef<User | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setWatchlist(loadList(WATCHLIST_KEY));
    setWatched(loadList(WATCHED_KEY));
    setGuestAdds(loadGuestAdds());
    captureInviteFromUrl();
    setHydrated(true);
  }, []);

  // Firebase Auth subscription
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      setAuthLoading(false);
      if (!fbUser) {
        setProfile(null);
        setFriends([]);
        setInbox([]);
        firestoreLoaded.current = false;
        migrated.current = false;
        return;
      }
      try {
        const p = await ensureUserDoc(fbUser);
        setProfile(p);
        // Attach pending invite (one-time, no-op if none)
        attachInviteOnSignIn(fbUser.uid).catch((err) => console.error("attachInvite failed", err));
      } catch (err) {
        console.error("ensureUserDoc failed", err);
      }
    });
    return () => unsub();
  }, []);

  // Social subscriptions (friends + inbox) when authed
  useEffect(() => {
    if (!user) return;
    const unsubFriends = subscribeFriends(user.uid, setFriends);
    const unsubInbox = subscribeInbox(user.uid, setInbox);
    return () => {
      unsubFriends();
      unsubInbox();
    };
  }, [user]);

  // When user signs in, migrate local lists into Firestore (one-time), then subscribe
  useEffect(() => {
    if (!user) return;
    let unsub: (() => void) | undefined;

    async function setup() {
      setSyncing(true);
      try {
        if (!migrated.current) {
          const localWatchlist = loadList(WATCHLIST_KEY);
          const localWatched = loadList(WATCHED_KEY);
          await mergeLocalIntoFirestore(user!.uid, localWatchlist, localWatched);
          migrated.current = true;
        }
      } catch (err) {
        console.error("migration failed", err);
      }

      const ref = doc(db, "users", user!.uid);
      unsub = onSnapshot(
        ref,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as { watchlist?: Movie[]; watched?: Movie[]; handle?: string; displayName?: string; photoURL?: string; email?: string; verified?: boolean };
            isRemoteUpdate.current = true;
            setWatchlist(Array.isArray(data.watchlist) ? data.watchlist.map(normalize) : []);
            setWatched(Array.isArray(data.watched) ? data.watched.map(normalize) : []);
            setProfile((prev) => ({
              uid: user!.uid,
              handle: data.handle,
              displayName: data.displayName ?? prev?.displayName,
              photoURL: data.photoURL ?? prev?.photoURL,
              email: data.email ?? prev?.email,
              verified: data.verified,
            }));
            setTimeout(() => { isRemoteUpdate.current = false; }, 50);
          }
          firestoreLoaded.current = true;
          setSyncing(false);
        },
        (err) => {
          console.error("Firestore snapshot error", err);
          setSyncing(false);
        }
      );
    }
    setup();

    return () => {
      if (unsub) unsub();
      firestoreLoaded.current = false;
    };
  }, [user]);

  // Persist changes: Firestore if authed, localStorage always as mirror
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
    if (!user || !firestoreLoaded.current || isRemoteUpdate.current) return;
    setDoc(doc(db, "users", user.uid), { watchlist }, { merge: true }).catch(console.error);
  }, [watchlist, hydrated, user]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(WATCHED_KEY, JSON.stringify(watched));
    if (!user || !firestoreLoaded.current || isRemoteUpdate.current) return;
    setDoc(doc(db, "users", user.uid), { watched }, { merge: true }).catch(console.error);
  }, [watched, hydrated, user]);

  // Keep ref in sync for callbacks
  useEffect(() => { userRef.current = user; }, [user]);

  const bumpGuestAdds = useCallback(() => {
    if (userRef.current) return;
    setGuestAdds((n) => {
      const next = n + 1;
      try { localStorage.setItem(GUEST_ADDS_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const addToWatchlist = useCallback((movie: Movie) => {
    const m = normalize(movie);
    setWatchlist((prev) => {
      if (prev.some((x) => x.imdbID === m.imdbID)) return prev;
      bumpGuestAdds();
      return [...prev, m];
    });
  }, [bumpGuestAdds]);

  const removeFromWatchlist = useCallback((id: string) => {
    setWatchlist((prev) => prev.filter((m) => m.imdbID !== id));
  }, []);

  const markAsWatched = useCallback((movie: Movie) => {
    const m = normalize(movie);
    setWatchlist((prev) => prev.filter((x) => x.imdbID !== m.imdbID));
    setWatched((prev) => {
      if (prev.some((x) => x.imdbID === m.imdbID)) return prev;
      bumpGuestAdds();
      return [...prev, m];
    });
  }, [bumpGuestAdds]);

  const removeFromWatched = useCallback((id: string) => {
    setWatched((prev) => prev.filter((m) => m.imdbID !== id));
  }, []);

  const isInWatchlist = useCallback((id: string) => watchlist.some((m) => m.imdbID === id), [watchlist]);
  const isInWatched = useCallback((id: string) => watched.some((m) => m.imdbID === id), [watched]);

  const signInGoogle = useCallback(async () => {
    await doSignInGoogle();
  }, []);

  const sendEmailLink = useCallback(async (email: string) => {
    await doSendEmailLink(email);
  }, []);

  const signOut = useCallback(async () => {
    await doSignOut();
  }, []);

  const claimHandle = useCallback(async (raw: string) => {
    if (!user) return { ok: false as const, error: "Not signed in." };
    const res = await claimHandleFn(user.uid, raw);
    if (res.ok) {
      const handle = raw.trim().toLowerCase().replace(/^@/, "");
      setProfile((prev) => (prev ? { ...prev, handle } : { uid: user.uid, handle }));
    }
    return res;
  }, [user]);

  const needsHandle = !!user && !!profile && !profile.handle;
  const incomingCount = friends.filter((f) => f.status === "pending_in").length;
  const inboxCount = inbox.length;

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
        user,
        profile,
        authLoading,
        syncing,
        needsHandle,
        signInGoogle,
        sendEmailLink,
        signOut,
        claimHandle,
        friends,
        inbox,
        incomingCount,
        inboxCount,
        guestAdds,
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
