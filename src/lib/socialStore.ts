import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  orderBy,
  limit,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { MediaType, Movie } from "@/context/AppContext";
import type { UserProfile } from "./userStore";
import { validateHandle } from "./userStore";

// --- Types ---

export type FriendStatus = "pending_out" | "pending_in" | "accepted" | "blocked";

export interface FriendEdge {
  uid: string;          // other party's uid
  handle?: string;
  displayName?: string;
  photoURL?: string;
  status: FriendStatus;
  since?: unknown;      // timestamp
}

export interface InboxRec {
  id: string;           // recId
  fromUid: string;
  fromHandle?: string;
  fromPhoto?: string;
  fromName?: string;
  tmdbId: string;
  mediaType: MediaType;
  title: string;
  year: string;
  posterUrl: string;
  note?: string;
  at?: unknown;
}

// --- Handle resolution ---

export async function resolveHandle(rawHandle: string): Promise<UserProfile | null> {
  const v = validateHandle(rawHandle);
  if (!v.ok) return null;
  const handle = v.handle;
  const handleSnap = await getDoc(doc(db, "handles", handle));
  if (!handleSnap.exists()) return null;
  const uid = handleSnap.data()?.uid as string | undefined;
  if (!uid) return null;
  const userSnap = await getDoc(doc(db, "users", uid));
  if (!userSnap.exists()) return null;
  return { uid, ...(userSnap.data() as Omit<UserProfile, "uid">) };
}

// --- Friend request flow ---

function friendEdgePayload(
  otherUid: string,
  otherHandle: string | undefined,
  otherName: string | undefined,
  otherPhoto: string | undefined,
  status: FriendStatus,
) {
  const payload: Record<string, unknown> = { uid: otherUid, status, since: serverTimestamp() };
  if (otherHandle) payload.handle = otherHandle;
  if (otherName) payload.displayName = otherName;
  if (otherPhoto) payload.photoURL = otherPhoto;
  return payload;
}

export async function sendFriendRequest(
  selfProfile: UserProfile,
  target: UserProfile,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!selfProfile.uid || !target.uid) return { ok: false, error: "Missing uid." };
  if (selfProfile.uid === target.uid) return { ok: false, error: "Cannot friend yourself." };
  if (!selfProfile.handle) return { ok: false, error: "Pick a handle first." };

  const selfEdgeRef = doc(db, "users", selfProfile.uid, "friends", target.uid);
  const targetEdgeRef = doc(db, "users", target.uid, "friends", selfProfile.uid);

  try {
    const existingSelf = await getDoc(selfEdgeRef);
    if (existingSelf.exists()) {
      const s = existingSelf.data()?.status as FriendStatus | undefined;
      if (s === "accepted") return { ok: false, error: "Already friends." };
      if (s === "pending_out") return { ok: false, error: "Request already sent." };
      if (s === "pending_in") return { ok: false, error: "They already sent you a request. Check Incoming." };
    }

    const batch = writeBatch(db);
    batch.set(
      selfEdgeRef,
      friendEdgePayload(target.uid, target.handle, target.displayName, target.photoURL, "pending_out"),
    );
    batch.set(
      targetEdgeRef,
      friendEdgePayload(selfProfile.uid, selfProfile.handle, selfProfile.displayName, selfProfile.photoURL, "pending_in"),
    );
    await batch.commit();
    return { ok: true };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "Could not send request." };
  }
}

export async function acceptFriendRequest(selfUid: string, otherUid: string): Promise<void> {
  const selfRef = doc(db, "users", selfUid, "friends", otherUid);
  const otherRef = doc(db, "users", otherUid, "friends", selfUid);
  const batch = writeBatch(db);
  batch.set(selfRef, { status: "accepted", since: serverTimestamp() }, { merge: true });
  batch.set(otherRef, { status: "accepted", since: serverTimestamp() }, { merge: true });
  await batch.commit();
}

export async function rejectFriendRequest(selfUid: string, otherUid: string): Promise<void> {
  const selfRef = doc(db, "users", selfUid, "friends", otherUid);
  const otherRef = doc(db, "users", otherUid, "friends", selfUid);
  const batch = writeBatch(db);
  batch.delete(selfRef);
  batch.delete(otherRef);
  await batch.commit();
}

export async function unfriend(selfUid: string, otherUid: string): Promise<void> {
  return rejectFriendRequest(selfUid, otherUid);
}

export async function cancelOutgoingRequest(selfUid: string, otherUid: string): Promise<void> {
  return rejectFriendRequest(selfUid, otherUid);
}

// --- Subscriptions ---

export function subscribeFriends(
  uid: string,
  onChange: (edges: FriendEdge[]) => void,
): Unsubscribe {
  const col = collection(db, "users", uid, "friends");
  return onSnapshot(col, (snap) => {
    const edges: FriendEdge[] = [];
    snap.forEach((d) => {
      const data = d.data() as Omit<FriendEdge, "uid">;
      edges.push({ uid: d.id, ...data });
    });
    onChange(edges);
  });
}

export function subscribeInbox(
  uid: string,
  onChange: (items: InboxRec[]) => void,
): Unsubscribe {
  const col = collection(db, "users", uid, "inbox");
  const q = query(col, orderBy("at", "desc"));
  return onSnapshot(q, (snap) => {
    const items: InboxRec[] = [];
    snap.forEach((d) => {
      const data = d.data() as Omit<InboxRec, "id">;
      items.push({ id: d.id, ...data });
    });
    onChange(items);
  });
}

// --- Inbox send/accept/reject ---

export interface SendRecParams {
  from: UserProfile;
  toUid: string;
  movie: Movie;
  note?: string;
}

export async function sendRec(params: SendRecParams): Promise<void> {
  const { from, toUid, movie, note } = params;
  if (!from.uid) throw new Error("Missing from uid");
  const recId = `${movie.mediaType ?? "movie"}-${movie.imdbID}-${Date.now()}`;
  const ref = doc(db, "users", toUid, "inbox", recId);
  const payload: Record<string, unknown> = {
    fromUid: from.uid,
    tmdbId: movie.imdbID,
    mediaType: movie.mediaType ?? "movie",
    title: movie.Title,
    year: movie.Year,
    posterUrl: movie.Poster,
    at: serverTimestamp(),
  };
  if (from.handle) payload.fromHandle = from.handle;
  if (from.displayName) payload.fromName = from.displayName;
  if (from.photoURL) payload.fromPhoto = from.photoURL;
  if (note && note.trim()) payload.note = note.trim().slice(0, 280);
  await setDoc(ref, payload);
}

export async function deleteInboxRec(uid: string, recId: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "inbox", recId));
}

// --- Mutuals + Friends-of-Friends ---

const MUTUALS_TTL_MS = 5 * 60 * 1000; // 5 min
const mutualsCache = new Map<string, { uids: string[]; ts: number }>();

export async function getAcceptedFriendUids(uid: string): Promise<string[]> {
  const cached = mutualsCache.get(uid);
  if (cached && Date.now() - cached.ts < MUTUALS_TTL_MS) return cached.uids;
  try {
    const q = query(collection(db, "users", uid, "friends"), where("status", "==", "accepted"), limit(500));
    const snap = await getDocs(q);
    const uids = snap.docs.map((d) => d.id);
    mutualsCache.set(uid, { uids, ts: Date.now() });
    return uids;
  } catch (err) {
    console.error("getAcceptedFriendUids failed", err);
    return [];
  }
}

export function invalidateMutualsCache(uid?: string) {
  if (uid) mutualsCache.delete(uid);
  else mutualsCache.clear();
}

export async function computeMutuals(selfFriends: FriendEdge[], otherUid: string): Promise<string[]> {
  const myAccepted = new Set(selfFriends.filter((f) => f.status === "accepted").map((f) => f.uid));
  if (myAccepted.size === 0) return [];
  const otherAccepted = await getAcceptedFriendUids(otherUid);
  const mutual: string[] = [];
  for (const uid of otherAccepted) {
    if (myAccepted.has(uid)) mutual.push(uid);
  }
  return mutual;
}

export interface FriendSuggestion {
  uid: string;
  handle?: string;
  displayName?: string;
  photoURL?: string;
  mutualCount: number;
  mutualUids: string[];   // first 3 mutual uids for display
  viaHandles: string[];   // first 3 friends who introduce this suggestion
}

interface SuggestionParams {
  selfUid: string;
  selfFriends: FriendEdge[];
  maxResults?: number;
  perFriendLimit?: number;
}

export async function getSuggestedFriends({
  selfUid,
  selfFriends,
  maxResults = 12,
  perFriendLimit = 30,
}: SuggestionParams): Promise<FriendSuggestion[]> {
  const accepted = selfFriends.filter((f) => f.status === "accepted");
  if (accepted.length === 0) return [];

  // Track everyone you already know to skip them
  const knownUids = new Set<string>([selfUid]);
  for (const f of selfFriends) knownUids.add(f.uid); // friends + pending + blocked

  const counts = new Map<string, { count: number; mutualUids: string[]; viaHandles: string[] }>();

  await Promise.all(accepted.slice(0, 25).map(async (f) => {
    try {
      const q = query(collection(db, "users", f.uid, "friends"), where("status", "==", "accepted"), limit(perFriendLimit));
      const snap = await getDocs(q);
      snap.forEach((d) => {
        if (knownUids.has(d.id)) return;
        const entry = counts.get(d.id) || { count: 0, mutualUids: [], viaHandles: [] };
        entry.count++;
        if (entry.mutualUids.length < 3) entry.mutualUids.push(f.uid);
        if (entry.viaHandles.length < 3 && f.handle) entry.viaHandles.push(f.handle);
        counts.set(d.id, entry);
      });
    } catch (err) {
      console.error(`FoF read failed for ${f.uid}`, err);
    }
  }));

  // Sort by mutual count, take top N
  const top = [...counts.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, maxResults);

  // Hydrate basic profile info for each
  const results = await Promise.all(top.map(async ([uid, info]) => {
    try {
      const userSnap = await getDoc(doc(db, "users", uid));
      if (!userSnap.exists()) return null;
      const data = userSnap.data() as { handle?: string; displayName?: string; photoURL?: string; profileVisibility?: string };
      // Skip private profiles
      if (data.profileVisibility === "private") return null;
      return {
        uid,
        handle: data.handle,
        displayName: data.displayName,
        photoURL: data.photoURL,
        mutualCount: info.count,
        mutualUids: info.mutualUids,
        viaHandles: info.viaHandles,
      } as FriendSuggestion;
    } catch {
      return null;
    }
  }));

  return results.filter((x): x is FriendSuggestion => x !== null);
}
