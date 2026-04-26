import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import type { MediaType, Movie } from "@/context/AppContext";

// --- Types ---

export type ChatMessageType = "text" | "image" | "rec" | "system";

export interface ChatRecPayload {
  tmdbId: string;
  mediaType: MediaType;
  title: string;
  year?: string;
  posterUrl?: string;
}

export interface ChatMessage {
  id: string;
  fromUid: string;
  type: ChatMessageType;
  text?: string;
  imageUrl?: string;
  rec?: ChatRecPayload;
  at?: unknown; // Firestore Timestamp
}

export interface ChatDoc {
  id: string;
  participants: string[];
  participantHandles?: Record<string, string | null>;
  participantNames?: Record<string, string | null>;
  participantPhotos?: Record<string, string | null>;
  lastMessage?: string;
  lastAt?: unknown;
  unread?: Record<string, number>;
}

// --- Helpers ---

export function chatIdFor(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join("_");
}

interface MinimalProfile {
  uid: string;
  handle?: string;
  displayName?: string;
  photoURL?: string;
}

// Ensure the chat doc exists. Idempotent. Stores participant snapshots so the
// list view can render without an extra users/{uid} read per row.
export async function ensureChat(self: MinimalProfile, other: MinimalProfile): Promise<string> {
  const id = chatIdFor(self.uid, other.uid);
  const ref = doc(db, "chats", id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    // Refresh participant snapshots in case names/photos changed.
    await setDoc(ref, {
      participants: [self.uid, other.uid].sort(),
      participantHandles: {
        [self.uid]: self.handle ?? null,
        [other.uid]: other.handle ?? null,
      },
      participantNames: {
        [self.uid]: self.displayName ?? null,
        [other.uid]: other.displayName ?? null,
      },
      participantPhotos: {
        [self.uid]: self.photoURL ?? null,
        [other.uid]: other.photoURL ?? null,
      },
    }, { merge: true });
    return id;
  }
  await setDoc(ref, {
    participants: [self.uid, other.uid].sort(),
    participantHandles: {
      [self.uid]: self.handle ?? null,
      [other.uid]: other.handle ?? null,
    },
    participantNames: {
      [self.uid]: self.displayName ?? null,
      [other.uid]: other.displayName ?? null,
    },
    participantPhotos: {
      [self.uid]: self.photoURL ?? null,
      [other.uid]: other.photoURL ?? null,
    },
    unread: { [self.uid]: 0, [other.uid]: 0 },
    lastAt: serverTimestamp(),
  });
  return id;
}

function snippetForMessage(msg: { type: ChatMessageType; text?: string; rec?: ChatRecPayload | null }): string {
  if (msg.type === "image") return "📷 Photo";
  if (msg.type === "rec") return msg.rec?.title ? `🎬 ${msg.rec.title}` : "🎬 Movie";
  if (msg.type === "system") return msg.text || "—";
  return msg.text ? msg.text.slice(0, 80) : "";
}

async function bumpChatMeta(chatId: string, fromUid: string, toUid: string, snippet: string) {
  const ref = doc(db, "chats", chatId);
  await setDoc(ref, {
    lastMessage: snippet,
    lastAt: serverTimestamp(),
    unread: {
      [fromUid]: 0,                    // sender's own unread always cleared
      [toUid]: increment(1),
    },
  }, { merge: true });
}

function otherParticipant(participants: string[], selfUid: string): string {
  return participants.find((p) => p !== selfUid) ?? participants[0];
}

// --- Send messages ---

export async function sendTextMessage(chatId: string, fromUid: string, participants: string[], text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  const msgsRef = collection(db, "chats", chatId, "messages");
  await addDoc(msgsRef, {
    fromUid,
    type: "text" as ChatMessageType,
    text: trimmed.slice(0, 2000),
    at: serverTimestamp(),
  });
  const toUid = otherParticipant(participants, fromUid);
  await bumpChatMeta(chatId, fromUid, toUid, snippetForMessage({ type: "text", text: trimmed }));
}

export async function sendImageMessage(
  chatId: string,
  fromUid: string,
  participants: string[],
  file: File,
): Promise<void> {
  if (!file.type.startsWith("image/")) throw new Error("Only image files allowed");
  if (file.size > 5 * 1024 * 1024) throw new Error("Image must be under 5MB");

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().slice(0, 5);
  const filename = `${Date.now()}-${fromUid}.${ext}`;
  const sref = storageRef(storage, `chat-images/${chatId}/${filename}`);

  // Storage rule requires the chat doc to exist before write — caller should
  // have called ensureChat already. Defensive check:
  const chatSnap = await getDoc(doc(db, "chats", chatId));
  if (!chatSnap.exists()) throw new Error("Chat not initialized");

  await uploadBytes(sref, file, { contentType: file.type });
  const url = await getDownloadURL(sref);

  const msgsRef = collection(db, "chats", chatId, "messages");
  await addDoc(msgsRef, {
    fromUid,
    type: "image" as ChatMessageType,
    imageUrl: url,
    at: serverTimestamp(),
  });
  const toUid = otherParticipant(participants, fromUid);
  await bumpChatMeta(chatId, fromUid, toUid, snippetForMessage({ type: "image" }));
}

export async function sendRecMessage(
  chatId: string,
  fromUid: string,
  participants: string[],
  movie: Movie,
  note?: string,
): Promise<void> {
  const rec: ChatRecPayload = {
    tmdbId: movie.imdbID,
    mediaType: (movie.mediaType ?? "movie") as MediaType,
    title: movie.Title,
  };
  if (movie.Year) rec.year = movie.Year;
  if (movie.Poster && movie.Poster !== "N/A") rec.posterUrl = movie.Poster;

  const msgsRef = collection(db, "chats", chatId, "messages");
  const payload: Record<string, unknown> = {
    fromUid,
    type: "rec" as ChatMessageType,
    rec,
    at: serverTimestamp(),
  };
  const trimmedNote = note?.trim();
  if (trimmedNote) payload.text = trimmedNote.slice(0, 280);

  await addDoc(msgsRef, payload);
  const toUid = otherParticipant(participants, fromUid);
  await bumpChatMeta(chatId, fromUid, toUid, snippetForMessage({ type: "rec", rec }));
}

// --- Subscriptions ---

export function subscribeChats(uid: string, onChange: (chats: ChatDoc[]) => void): Unsubscribe {
  const q = query(
    collection(db, "chats"),
    where("participants", "array-contains", uid),
    orderBy("lastAt", "desc"),
    limit(100),
  );
  return onSnapshot(q, (snap) => {
    const chats: ChatDoc[] = [];
    snap.forEach((d) => {
      const data = d.data() as Omit<ChatDoc, "id">;
      chats.push({ id: d.id, ...data });
    });
    onChange(chats);
  }, (err) => {
    console.error("subscribeChats error", err);
  });
}

export function subscribeMessages(chatId: string, onChange: (messages: ChatMessage[]) => void, take: number = 80): Unsubscribe {
  const q = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("at", "desc"),
    limit(take),
  );
  return onSnapshot(q, (snap) => {
    const msgs: ChatMessage[] = [];
    snap.forEach((d) => {
      const data = d.data() as Omit<ChatMessage, "id">;
      msgs.push({ id: d.id, ...data });
    });
    // We queried desc for limit cap; reverse for chronological display
    msgs.reverse();
    onChange(msgs);
  }, (err) => {
    console.error("subscribeMessages error", err);
  });
}

// --- Read state ---

export async function markChatRead(chatId: string, selfUid: string): Promise<void> {
  const ref = doc(db, "chats", chatId);
  await setDoc(ref, { unread: { [selfUid]: 0 } }, { merge: true });
}

// Sum unread across all chats for a given uid
export function totalUnread(chats: ChatDoc[], uid: string): number {
  let n = 0;
  for (const c of chats) n += c.unread?.[uid] ?? 0;
  return n;
}
