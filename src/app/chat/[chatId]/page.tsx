"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Image as ImageIcon, Film, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import MediaPicker from "@/components/MediaPicker";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/Toast";
import {
  ensureChat,
  markChatRead,
  sendImageMessage,
  sendRecMessage,
  sendTextMessage,
  subscribeMessages,
  type ChatMessage,
} from "@/lib/chatStore";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ChatDoc } from "@/lib/chatStore";
import { titleHref, type MediaItem, media } from "@/lib/media";

function formatTime(ts?: unknown): string {
  if (!ts) return "";
  const t = ts as { toDate?: () => Date };
  const date = t?.toDate ? t.toDate() : ts instanceof Date ? ts : null;
  if (!date) return "";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function ChatThreadPage() {
  const router = useRouter();
  const params = useParams();
  const chatId = params.chatId as string;
  const { user, profile, friends, authLoading } = useApp();
  const toast = useToast();

  const [chatDoc, setChatDoc] = useState<ChatDoc | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Subscribe to chat doc + messages
  useEffect(() => {
    if (!user || !chatId) return;
    const unsubChat = onSnapshot(doc(db, "chats", chatId), (snap) => {
      if (!snap.exists()) { setChatDoc(null); return; }
      const data = snap.data() as Omit<ChatDoc, "id">;
      // Guard: must be participant
      if (!data.participants?.includes(user.uid)) {
        toast.error("You don't have access to this chat.");
        router.replace("/chat");
        return;
      }
      setChatDoc({ id: chatId, ...data });
    });
    const unsubMsgs = subscribeMessages(chatId, setMessages);
    return () => { unsubChat(); unsubMsgs(); };
  }, [user, chatId, router, toast]);

  // Mark read when messages change and tab is visible
  useEffect(() => {
    if (!user || !chatDoc) return;
    const myUnread = chatDoc.unread?.[user.uid] ?? 0;
    if (myUnread > 0) {
      markChatRead(chatId, user.uid).catch(console.error);
    }
  }, [user, chatDoc, chatId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (authLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-16 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-cinema-purple border-t-transparent rounded-full animate-spin" />
        </main>
      </>
    );
  }

  if (!user || !profile) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-16">
          <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
            <span className="text-5xl">💬</span>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">Sign in to chat</h1>
            <Link href="/home" className="inline-block mt-4 px-6 py-3 rounded-xl font-semibold text-sm gradient-purple text-white">Back to home</Link>
          </div>
        </main>
      </>
    );
  }

  if (chatDoc === null) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-16 flex flex-col items-center justify-center gap-4 text-center">
          <span className="text-5xl">😕</span>
          <p className="text-cinema-muted">Chat not found</p>
          <Link href="/chat" className="text-cinema-purple hover:underline text-sm">Back to chats</Link>
        </main>
      </>
    );
  }

  const otherUid = chatDoc.participants.find((p) => p !== user.uid) ?? "";
  const otherHandle = chatDoc.participantHandles?.[otherUid] || null;
  const otherName = chatDoc.participantNames?.[otherUid] || otherHandle || "User";
  const otherPhoto = chatDoc.participantPhotos?.[otherUid] || null;
  const initials = otherName.slice(0, 2).toUpperCase();
  const isFriend = friends.some((f) => f.uid === otherUid && f.status === "accepted");

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await sendTextMessage(chatId, user.uid, chatDoc.participants, text);
      setText("");
    } catch (err) {
      console.error(err);
      toast.error("Could not send. Try again.");
    } finally {
      setSending(false);
    }
  };

  const onAttachImage = async (file: File) => {
    setSending(true);
    try {
      await sendImageMessage(chatId, user.uid, chatDoc.participants, file);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not send image.";
      toast.error(msg);
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onPickMedia = async (item: MediaItem) => {
    setSending(true);
    try {
      const movie = media.toMovie(item);
      await sendRecMessage(chatId, user.uid, chatDoc.participants, movie);
      toast.success(`Sent "${item.title}"`);
    } catch (err) {
      console.error(err);
      toast.error("Could not send rec.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16 flex flex-col">
        {/* Sticky header */}
        <div className="sticky top-16 z-10 bg-cinema-bg/85 backdrop-blur-xl border-b border-cinema-border/40">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => router.push("/chat")}
              aria-label="Back"
              className="p-2 -ml-2 rounded-lg text-cinema-muted hover:text-cinema-text hover:bg-white/5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            {otherHandle ? (
              <Link href={`/u/${otherHandle}`} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-90 transition">
                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-cinema-purple/30 flex items-center justify-center flex-shrink-0">
                  {otherPhoto ? (
                    <Image src={otherPhoto} alt={otherName} fill sizes="40px" className="object-cover" unoptimized />
                  ) : (
                    <span className="text-xs font-bold text-white">{initials}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-cinema-text truncate">{otherName}</p>
                  <p className="text-[11px] text-cinema-purple truncate">@{otherHandle}</p>
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-cinema-purple/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-white">{initials}</span>
                </div>
                <p className="text-sm font-semibold text-cinema-text truncate">{otherName}</p>
              </div>
            )}
            {!isFriend && (
              <span className="text-[11px] px-2 py-1 rounded-full bg-cinema-gold/15 text-cinema-gold border border-cinema-gold/30">
                Not friends
              </span>
            )}
          </div>
        </div>

        {/* Messages list */}
        <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 space-y-2">
          {messages.length === 0 ? (
            <div className="text-center text-cinema-muted text-sm py-12">
              No messages yet. Say hi!
            </div>
          ) : (
            messages.map((m, i) => {
              const prev = messages[i - 1];
              const isMine = m.fromUid === user.uid;
              const showTime = !prev || elapsedMs(prev.at, m.at) > 5 * 60_000 || prev.fromUid !== m.fromUid;
              return (
                <MessageBubble
                  key={m.id}
                  msg={m}
                  isMine={isMine}
                  showTime={showTime}
                  onImageClick={(url) => setLightbox(url)}
                />
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="sticky bottom-0 bg-cinema-bg/90 backdrop-blur-xl border-t border-cinema-border/40">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <div className="flex items-end gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                aria-label="Attach image"
                disabled={sending}
                className="p-2.5 rounded-full bg-cinema-surface border border-cinema-border hover:border-cinema-purple/50 transition-all disabled:opacity-50 cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-cinema-muted" />
              </button>
              <button
                onClick={() => setPickerOpen(true)}
                aria-label="Attach movie"
                disabled={sending}
                className="p-2.5 rounded-full bg-cinema-surface border border-cinema-border hover:border-cinema-purple/50 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Film className="w-4 h-4 text-cinema-muted" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onAttachImage(f);
                }}
              />
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder={`Message ${otherName}...`}
                className="flex-1 px-4 py-2.5 rounded-2xl bg-cinema-surface border border-cinema-border text-cinema-text placeholder:text-cinema-muted/60 text-sm focus:outline-none focus:border-cinema-purple resize-none max-h-32"
              />
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={send}
                disabled={!text.trim() || sending}
                aria-label="Send"
                className="p-2.5 rounded-full gradient-purple text-white disabled:opacity-30 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </div>
      </main>

      <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={onPickMedia} />

      <AnimatePresence>
        {lightbox && (
          <motion.div
            key="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm cursor-zoom-out"
          >
            <button
              onClick={() => setLightbox(null)}
              aria-label="Close"
              className="absolute top-4 right-4 p-2 rounded-lg text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function elapsedMs(a?: unknown, b?: unknown): number {
  const aDate = (a as { toDate?: () => Date })?.toDate?.() ?? null;
  const bDate = (b as { toDate?: () => Date })?.toDate?.() ?? null;
  if (!aDate || !bDate) return Number.MAX_SAFE_INTEGER;
  return Math.abs(bDate.getTime() - aDate.getTime());
}

interface BubbleProps {
  msg: ChatMessage;
  isMine: boolean;
  showTime: boolean;
  onImageClick: (url: string) => void;
}

function MessageBubble({ msg, isMine, showTime, onImageClick }: BubbleProps) {
  const align = isMine ? "items-end" : "items-start";
  const bubbleCls = isMine
    ? "bg-cinema-purple text-white rounded-2xl rounded-br-md"
    : "bg-cinema-card border border-cinema-border/40 text-cinema-text rounded-2xl rounded-bl-md";

  return (
    <div className={`flex flex-col ${align}`}>
      {showTime && (
        <span className="text-[10px] text-cinema-muted mb-1 px-1">{formatTime(msg.at)}</span>
      )}
      {msg.type === "text" && (
        <div className={`max-w-[85%] sm:max-w-[70%] px-3.5 py-2 ${bubbleCls}`}>
          <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
        </div>
      )}
      {msg.type === "image" && msg.imageUrl && (
        <button
          onClick={() => msg.imageUrl && onImageClick(msg.imageUrl)}
          className="max-w-[85%] sm:max-w-[60%] rounded-2xl overflow-hidden cursor-zoom-in border border-cinema-border/40"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={msg.imageUrl} alt="attached" className="w-full h-auto block" />
        </button>
      )}
      {msg.type === "rec" && msg.rec && (
        <Link
          href={titleHref(msg.rec.mediaType, msg.rec.tmdbId)}
          className={`max-w-[85%] sm:max-w-[70%] flex gap-3 p-2.5 ${bubbleCls.replace("rounded-br-md", "").replace("rounded-bl-md", "")}`}
        >
          {msg.rec.posterUrl && (
            <div className="relative w-14 h-20 rounded-md overflow-hidden bg-cinema-surface flex-shrink-0">
              <Image src={msg.rec.posterUrl} alt={msg.rec.title} fill sizes="56px" className="object-cover" unoptimized />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider opacity-80">
              🎬 {msg.rec.mediaType === "tv" ? "TV Series" : "Movie"}
            </p>
            <p className="text-sm font-semibold mt-0.5 line-clamp-2">{msg.rec.title}</p>
            {msg.rec.year && <p className="text-[11px] opacity-70">{msg.rec.year}</p>}
            {msg.text && <p className="text-xs italic opacity-90 mt-1.5 line-clamp-3">&ldquo;{msg.text}&rdquo;</p>}
          </div>
        </Link>
      )}
    </div>
  );
}
