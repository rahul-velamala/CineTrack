import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
  orderBy,
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
