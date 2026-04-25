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

export type ProfileVisibility = "basic" | "friends" | "private";

export interface UserProfile {
  uid: string;
  handle?: string;
  displayName?: string;
  photoURL?: string;
  email?: string;
  verified?: boolean;
  createdAt?: unknown;
  // Phase 10a additions
  bio?: string;
  profileVisibility?: ProfileVisibility;
  watchlistPublic?: boolean;
  notifyByEmail?: boolean;
  activityFeedPublic?: boolean;
  handleChangedAt?: unknown; // Firestore Timestamp
}

export const HANDLE_CHANGE_COOLDOWN_DAYS = 21;
export const BIO_MAX = 280;
export const DISPLAY_NAME_MAX = 50;

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

export async function getUserProfileByHandle(rawHandle: string): Promise<UserProfile | null> {
  const v = validateHandle(rawHandle);
  if (!v.ok) return null;
  const handleSnap = await getDoc(doc(db, "handles", v.handle));
  if (!handleSnap.exists()) return null;
  const uid = handleSnap.data()?.uid as string | undefined;
  if (!uid) return null;
  return getUserProfile(uid);
}

export interface ProfileUpdates {
  displayName?: string;
  bio?: string;
  photoURL?: string;
  profileVisibility?: ProfileVisibility;
  watchlistPublic?: boolean;
  notifyByEmail?: boolean;
  activityFeedPublic?: boolean;
}

export function validateProfileUpdates(u: ProfileUpdates): { ok: true; clean: ProfileUpdates } | { ok: false; error: string } {
  const clean: ProfileUpdates = {};
  if (u.displayName !== undefined) {
    const v = u.displayName.trim();
    if (v.length === 0) return { ok: false, error: "Display name cannot be empty." };
    if (v.length > DISPLAY_NAME_MAX) return { ok: false, error: `Display name max ${DISPLAY_NAME_MAX} chars.` };
    clean.displayName = v;
  }
  if (u.bio !== undefined) {
    const v = u.bio.trim();
    if (v.length > BIO_MAX) return { ok: false, error: `Bio max ${BIO_MAX} chars.` };
    clean.bio = v;
  }
  if (u.photoURL !== undefined) {
    const v = u.photoURL.trim();
    if (v && !/^https?:\/\//.test(v)) return { ok: false, error: "Photo URL must start with http(s)://" };
    clean.photoURL = v;
  }
  if (u.profileVisibility !== undefined) {
    if (!["basic", "friends", "private"].includes(u.profileVisibility)) {
      return { ok: false, error: "Invalid visibility." };
    }
    clean.profileVisibility = u.profileVisibility;
  }
  if (u.watchlistPublic !== undefined) clean.watchlistPublic = !!u.watchlistPublic;
  if (u.notifyByEmail !== undefined) clean.notifyByEmail = !!u.notifyByEmail;
  if (u.activityFeedPublic !== undefined) clean.activityFeedPublic = !!u.activityFeedPublic;
  return { ok: true, clean };
}

export async function updateProfile(uid: string, u: ProfileUpdates): Promise<{ ok: true } | { ok: false; error: string }> {
  const v = validateProfileUpdates(u);
  if (!v.ok) return v;
  try {
    await setDoc(doc(db, "users", uid), v.clean, { merge: true });
    return { ok: true };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "Could not save changes." };
  }
}

export interface HandleChangeStatus {
  cooldownActive: boolean;
  daysRemaining: number;
  nextAllowedAt: Date | null;
}

export function getHandleChangeStatus(profile: UserProfile | null): HandleChangeStatus {
  if (!profile?.handleChangedAt) return { cooldownActive: false, daysRemaining: 0, nextAllowedAt: null };
  // handleChangedAt is a Firestore Timestamp (.toDate()) or already a Date
  const ts = profile.handleChangedAt as { toDate?: () => Date };
  let lastChanged: Date | null = null;
  if (ts?.toDate) lastChanged = ts.toDate();
  else if (profile.handleChangedAt instanceof Date) lastChanged = profile.handleChangedAt;
  if (!lastChanged) return { cooldownActive: false, daysRemaining: 0, nextAllowedAt: null };

  const next = new Date(lastChanged.getTime() + HANDLE_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diffMs = next.getTime() - now.getTime();
  if (diffMs <= 0) return { cooldownActive: false, daysRemaining: 0, nextAllowedAt: next };
  const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  return { cooldownActive: true, daysRemaining: days, nextAllowedAt: next };
}

export async function changeHandle(uid: string, profile: UserProfile, newRaw: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const status = getHandleChangeStatus(profile);
  if (status.cooldownActive) {
    return { ok: false, error: `Wait ${status.daysRemaining} more day(s) before changing handle.` };
  }
  // claimHandle handles the transaction (releasing old, claiming new). We just need to stamp handleChangedAt.
  const res = await claimHandle(uid, newRaw);
  if (!res.ok) return res;
  try {
    await setDoc(doc(db, "users", uid), { handleChangedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    console.error("stamp handleChangedAt failed", err);
  }
  return { ok: true };
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
