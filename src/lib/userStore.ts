import {
  doc,
  getDoc,
  setDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "./firebase";
import type { Movie } from "@/context/AppContext";

export interface UserProfile {
  uid: string;
  handle?: string;
  displayName?: string;
  photoURL?: string;
  email?: string;
  verified?: boolean;
  createdAt?: unknown;
}

export interface UserData {
  watchlist: Movie[];
  watched: Movie[];
}

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
const RESERVED_HANDLES = new Set([
  "admin", "root", "support", "system", "cinetrack", "official", "null", "undefined", "me", "you",
  "help", "contact", "api", "www", "settings", "profile", "search", "home", "login", "signup", "signin",
  "watchlist", "watched", "inbox", "friends", "lists", "person", "title", "movie", "tv",
]);

export function validateHandle(raw: string): { ok: true; handle: string } | { ok: false; error: string } {
  const handle = raw.trim().toLowerCase().replace(/^@/, "");
  if (!handle) return { ok: false, error: "Handle cannot be empty." };
  if (!HANDLE_RE.test(handle)) return { ok: false, error: "3-20 chars, lowercase letters, digits, or underscore." };
  if (RESERVED_HANDLES.has(handle)) return { ok: false, error: "Handle reserved. Pick another." };
  return { ok: true, handle };
}

export async function ensureUserDoc(user: User): Promise<UserProfile> {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return { uid: user.uid, ...(snap.data() as Omit<UserProfile, "uid">) };
  }
  const base: Omit<UserProfile, "uid"> = {
    displayName: user.displayName || undefined,
    photoURL: user.photoURL || undefined,
    email: user.email || undefined,
    verified: false,
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, base, { merge: true });
  return { uid: user.uid, ...base };
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { uid, ...(snap.data() as Omit<UserProfile, "uid">) };
}

export async function claimHandle(uid: string, rawHandle: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const v = validateHandle(rawHandle);
  if (!v.ok) return v;
  const { handle } = v;
  try {
    await runTransaction(db, async (tx) => {
      const handleRef = doc(db, "handles", handle);
      const userRef = doc(db, "users", uid);

      const [handleSnap, userSnap] = await Promise.all([tx.get(handleRef), tx.get(userRef)]);
      if (handleSnap.exists() && handleSnap.data()?.uid !== uid) {
        throw new Error("HANDLE_TAKEN");
      }

      const existingHandle = userSnap.data()?.handle;
      if (existingHandle && existingHandle !== handle) {
        // Free the old handle if it was held by this uid
        const oldRef = doc(db, "handles", existingHandle);
        const oldSnap = await tx.get(oldRef);
        if (oldSnap.exists() && oldSnap.data()?.uid === uid) {
          tx.delete(oldRef);
        }
      }

      tx.set(handleRef, { uid, claimedAt: serverTimestamp() });
      tx.set(userRef, { handle }, { merge: true });
    });
    return { ok: true };
  } catch (err) {
    const code = err instanceof Error ? err.message : "UNKNOWN";
    if (code === "HANDLE_TAKEN") return { ok: false, error: "Handle already taken." };
    return { ok: false, error: "Could not claim handle. Try again." };
  }
}

function dedupeMovies(...lists: Movie[][]): Movie[] {
  const seen = new Set<string>();
  const out: Movie[] = [];
  for (const list of lists) {
    for (const m of list) {
      if (!m?.imdbID) continue;
      const key = `${m.mediaType ?? "movie"}-${m.imdbID}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ ...m, mediaType: m.mediaType ?? "movie" });
    }
  }
  return out;
}

export async function mergeLocalIntoFirestore(
  uid: string,
  localWatchlist: Movie[],
  localWatched: Movie[],
): Promise<UserData> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  const remote = snap.exists() ? (snap.data() as { watchlist?: Movie[]; watched?: Movie[] }) : {};
  const remoteWatchlist = Array.isArray(remote.watchlist) ? remote.watchlist : [];
  const remoteWatched = Array.isArray(remote.watched) ? remote.watched : [];

  const watchedMerged = dedupeMovies(remoteWatched, localWatched);
  const watchedIds = new Set(watchedMerged.map((m) => `${m.mediaType ?? "movie"}-${m.imdbID}`));
  const watchlistMergedRaw = dedupeMovies(remoteWatchlist, localWatchlist);
  const watchlistMerged = watchlistMergedRaw.filter((m) => !watchedIds.has(`${m.mediaType ?? "movie"}-${m.imdbID}`));

  await setDoc(ref, { watchlist: watchlistMerged, watched: watchedMerged }, { merge: true });
  return { watchlist: watchlistMerged, watched: watchedMerged };
}

export async function writeUserLists(uid: string, data: UserData): Promise<void> {
  const ref = doc(db, "users", uid);
  await setDoc(ref, { watchlist: data.watchlist, watched: data.watched }, { merge: true });
}
