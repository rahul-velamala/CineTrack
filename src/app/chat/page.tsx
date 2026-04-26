"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { MessageSquare, UserPlus } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useApp } from "@/context/AppContext";
import type { ChatDoc } from "@/lib/chatStore";

function formatTime(ts?: unknown): string {
  if (!ts) return "";
  const t = ts as { toDate?: () => Date };
  const date = t?.toDate ? t.toDate() : ts instanceof Date ? ts : null;
  if (!date) return "";
  const now = Date.now();
  const diff = now - date.getTime();
  if (diff < 60_000) return "now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h`;
  if (diff < 7 * 86400_000) return `${Math.floor(diff / 86400_000)}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ChatListPage() {
  const { user, authLoading, chats } = useApp();

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

  if (!user) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-16">
          <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
            <span className="text-5xl">💬</span>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">Sign in to chat</h1>
            <p className="text-cinema-muted text-sm">DM your friends. Send recs inline. Share photos.</p>
            <Link href="/home" className="inline-block mt-4 px-6 py-3 rounded-xl font-semibold text-sm gradient-purple text-white hover:opacity-90 transition-all">Back to home</Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <div className="mb-8">
            <Link href="/home" className="text-xs text-cinema-muted hover:text-cinema-text transition-colors">← Back to home</Link>
            <h1 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)] mt-2 flex items-center gap-3">
              <MessageSquare className="w-7 h-7 text-cinema-purple" /> Chats
            </h1>
          </div>

          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <span className="text-5xl">💬</span>
              <p className="text-cinema-muted text-sm">No chats yet.</p>
              <Link href="/friends" className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold gradient-purple text-white hover:opacity-90 transition-all">
                <UserPlus className="w-4 h-4" /> Find friends
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {chats.map((c) => (
                <ChatRow key={c.id} chat={c} selfUid={user.uid} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function ChatRow({ chat, selfUid }: { chat: ChatDoc; selfUid: string }) {
  const otherUid = useMemo(() => chat.participants.find((p) => p !== selfUid) ?? selfUid, [chat.participants, selfUid]);
  const otherHandle = chat.participantHandles?.[otherUid] || null;
  const otherName = chat.participantNames?.[otherUid] || otherHandle || "User";
  const otherPhoto = chat.participantPhotos?.[otherUid] || null;
  const unread = chat.unread?.[selfUid] ?? 0;
  const initials = otherName.slice(0, 2).toUpperCase();

  return (
    <motion.div whileTap={{ scale: 0.99 }}>
      <Link
        href={`/chat/${chat.id}`}
        className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
          unread > 0 ? "bg-cinema-purple/10 border border-cinema-purple/30" : "bg-cinema-card/60 border border-cinema-border/40 hover:border-cinema-purple/40"
        }`}
      >
        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-cinema-purple/30 flex items-center justify-center flex-shrink-0">
          {otherPhoto ? (
            <Image src={otherPhoto} alt={otherName} fill sizes="48px" className="object-cover" unoptimized />
          ) : (
            <span className="text-sm font-bold text-white">{initials}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm truncate ${unread > 0 ? "font-bold text-cinema-text" : "font-semibold text-cinema-text"}`}>
              {otherName}
              {otherHandle && <span className="text-cinema-purple font-normal text-xs ml-1.5">@{otherHandle}</span>}
            </p>
            <span className="text-[11px] text-cinema-muted flex-shrink-0">{formatTime(chat.lastAt)}</span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <p className={`text-xs truncate ${unread > 0 ? "text-cinema-text/80" : "text-cinema-muted"}`}>
              {chat.lastMessage || "Tap to start the conversation"}
            </p>
            {unread > 0 && (
              <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-cinema-purple text-white flex-shrink-0">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
