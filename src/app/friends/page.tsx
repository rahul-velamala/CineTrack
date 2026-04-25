"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useApp } from "@/context/AppContext";
import {
  acceptFriendRequest,
  cancelOutgoingRequest,
  rejectFriendRequest,
  resolveHandle,
  sendFriendRequest,
  unfriend,
  type FriendEdge,
} from "@/lib/socialStore";

type Tab = "friends" | "incoming" | "outgoing";

export default function FriendsPage() {
  const { user, profile, friends, authLoading } = useApp();
  const [tab, setTab] = useState<Tab>("friends");
  const [query, setQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState<"idle" | "searching" | "sending">("idle");
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const accepted = useMemo(() => friends.filter((f) => f.status === "accepted"), [friends]);
  const incoming = useMemo(() => friends.filter((f) => f.status === "pending_in"), [friends]);
  const outgoing = useMemo(() => friends.filter((f) => f.status === "pending_out"), [friends]);

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
            <span className="text-5xl">👥</span>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">Sign in to connect</h1>
            <p className="text-cinema-muted text-sm">
              Friends let you send movies and shows to each other. Sign in with Google or email link.
            </p>
            <Link href="/home" className="inline-block mt-4 px-6 py-3 rounded-xl font-semibold text-sm gradient-purple text-white hover:opacity-90 transition-all">
              Back to home
            </Link>
          </div>
        </main>
      </>
    );
  }

  const handleSend = async () => {
    setSearchError(null);
    setSearchMessage(null);
    const raw = query.trim().replace(/^@/, "");
    if (!raw) { setSearchError("Enter a handle."); return; }
    if (profile.handle && raw.toLowerCase() === profile.handle.toLowerCase()) {
      setSearchError("That's you.");
      return;
    }
    setSearchStatus("searching");
    const target = await resolveHandle(raw);
    if (!target) {
      setSearchStatus("idle");
      setSearchError(`No user with handle @${raw.toLowerCase()}.`);
      return;
    }
    setSearchStatus("sending");
    const res = await sendFriendRequest(profile, target);
    setSearchStatus("idle");
    if (res.ok) {
      setSearchMessage(`Request sent to @${target.handle}.`);
      setQuery("");
    } else {
      setSearchError(res.error);
    }
  };

  const list: FriendEdge[] = tab === "friends" ? accepted : tab === "incoming" ? incoming : outgoing;

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="mb-8">
            <Link href="/home" className="text-xs text-cinema-muted hover:text-cinema-text transition-colors">← Back to home</Link>
            <h1 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)] mt-2 flex items-center gap-3">
              <span>👥</span> Friends
            </h1>
            {profile.handle && (
              <p className="text-cinema-muted text-sm mt-1">
                You are <span className="text-cinema-purple">@{profile.handle}</span>
              </p>
            )}
          </div>

          <div className="mb-8 p-5 rounded-2xl bg-cinema-card/60 border border-cinema-border/40">
            <h2 className="text-sm font-semibold text-cinema-text mb-3">Add a friend by handle</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-cinema-muted">@</span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setSearchError(null); setSearchMessage(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
                  placeholder="friendhandle"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-cinema-surface border border-cinema-border text-cinema-text placeholder:text-cinema-muted/60 text-sm focus:outline-none focus:border-cinema-purple focus:ring-1 focus:ring-cinema-purple/50"
                />
              </div>
              <button
                onClick={handleSend}
                disabled={searchStatus !== "idle" || !query.trim()}
                className="px-6 py-3 rounded-xl font-semibold text-sm gradient-purple text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
              >
                {searchStatus === "sending" ? "Sending..." : searchStatus === "searching" ? "Finding..." : "Send request"}
              </button>
            </div>
            {searchError && <p className="text-cinema-red text-xs mt-2">{searchError}</p>}
            {searchMessage && <p className="text-cinema-green text-xs mt-2">{searchMessage}</p>}
          </div>

          <div className="flex items-center gap-2 mb-6">
            {([
              { k: "friends" as Tab, label: "Friends", count: accepted.length },
              { k: "incoming" as Tab, label: "Incoming", count: incoming.length },
              { k: "outgoing" as Tab, label: "Outgoing", count: outgoing.length },
            ]).map((t) => (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  tab === t.k
                    ? "bg-cinema-purple/25 text-cinema-purple border border-cinema-purple/40"
                    : "bg-cinema-surface text-cinema-muted border border-cinema-border/50 hover:text-cinema-text"
                }`}
              >
                {t.label}
                {t.count > 0 && (
                  <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${tab === t.k ? "bg-cinema-purple/30" : "bg-cinema-border/50"}`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <span className="text-4xl">
                {tab === "friends" ? "🤝" : tab === "incoming" ? "📥" : "📤"}
              </span>
              <p className="text-cinema-muted text-sm">
                {tab === "friends" ? "No friends yet. Send a request above." : tab === "incoming" ? "No incoming requests." : "No outgoing requests."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {list.map((f) => (
                <FriendRow key={f.uid} edge={f} selfUid={user.uid} tab={tab} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function FriendRow({ edge, selfUid, tab }: { edge: FriendEdge; selfUid: string; tab: Tab }) {
  const [busy, setBusy] = useState(false);
  const displayName = edge.displayName || edge.handle || "User";
  const initials = (displayName).slice(0, 2).toUpperCase();

  const doAccept = async () => { setBusy(true); try { await acceptFriendRequest(selfUid, edge.uid); } finally { setBusy(false); } };
  const doReject = async () => { setBusy(true); try { await rejectFriendRequest(selfUid, edge.uid); } finally { setBusy(false); } };
  const doCancel = async () => { setBusy(true); try { await cancelOutgoingRequest(selfUid, edge.uid); } finally { setBusy(false); } };
  const doUnfriend = async () => { setBusy(true); try { await unfriend(selfUid, edge.uid); } finally { setBusy(false); } };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-cinema-card/60 border border-cinema-border/40">
      <div className="relative w-11 h-11 rounded-full overflow-hidden bg-cinema-purple/30 flex items-center justify-center flex-shrink-0">
        {edge.photoURL ? (
          <Image src={edge.photoURL} alt={displayName} fill sizes="44px" className="object-cover" unoptimized />
        ) : (
          <span className="text-sm font-bold text-white">{initials}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-cinema-text truncate">{displayName}</p>
        {edge.handle && <p className="text-xs text-cinema-purple truncate">@{edge.handle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {tab === "incoming" && (
          <>
            <button onClick={doAccept} disabled={busy} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cinema-green/15 text-cinema-green border border-cinema-green/30 hover:bg-cinema-green/25 disabled:opacity-50 cursor-pointer">Accept</button>
            <button onClick={doReject} disabled={busy} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cinema-red/15 text-cinema-red border border-cinema-red/30 hover:bg-cinema-red/25 disabled:opacity-50 cursor-pointer">Reject</button>
          </>
        )}
        {tab === "outgoing" && (
          <button onClick={doCancel} disabled={busy} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cinema-red/15 text-cinema-red border border-cinema-red/30 hover:bg-cinema-red/25 disabled:opacity-50 cursor-pointer">Cancel</button>
        )}
        {tab === "friends" && (
          <button onClick={doUnfriend} disabled={busy} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cinema-red/15 text-cinema-red border border-cinema-red/30 hover:bg-cinema-red/25 disabled:opacity-50 cursor-pointer">Unfriend</button>
        )}
      </div>
    </div>
  );
}
