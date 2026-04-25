"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import Navbar from "@/components/Navbar";
import HandleResolver from "@/components/HandleResolver";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/components/Toast";
import {
  acceptFriendRequest,
  cancelOutgoingRequest,
  getSuggestedFriends,
  rejectFriendRequest,
  sendFriendRequest,
  unfriend,
  type FriendEdge,
  type FriendSuggestion,
} from "@/lib/socialStore";
import type { UserProfile } from "@/lib/userStore";

type Tab = "friends" | "incoming" | "outgoing" | "discover";

export default function FriendsPage() {
  const { user, profile, friends, authLoading } = useApp();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("friends");
  const [suggestions, setSuggestions] = useState<FriendSuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);

  const accepted = useMemo(() => friends.filter((f) => f.status === "accepted"), [friends]);
  const incoming = useMemo(() => friends.filter((f) => f.status === "pending_in"), [friends]);
  const outgoing = useMemo(() => friends.filter((f) => f.status === "pending_out"), [friends]);

  // Load suggestions on demand (when discover tab opened OR friends list changes)
  const acceptedSig = accepted.map((f) => f.uid).join(",");
  useEffect(() => {
    if (!user || tab !== "discover") return;
    if (accepted.length === 0) { setSuggestions([]); return; }
    let cancelled = false;
    async function load() {
      setSuggestLoading(true);
      try {
        const res = await getSuggestedFriends({ selfUid: user!.uid, selfFriends: friends, maxResults: 12 });
        if (!cancelled) setSuggestions(res);
      } finally {
        if (!cancelled) setSuggestLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tab, acceptedSig]);

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
            <p className="text-cinema-muted text-sm">Friends let you send movies and shows to each other.</p>
            <Link href="/home" className="inline-block mt-4 px-6 py-3 rounded-xl font-semibold text-sm gradient-purple text-white hover:opacity-90 transition-all">Back to home</Link>
          </div>
        </main>
      </>
    );
  }

  const onSend = async (target: UserProfile) => {
    const res = await sendFriendRequest(profile, target);
    if (res.ok) toast.success(`Request sent to @${target.handle}`);
    else toast.error(res.error);
  };

  const list: FriendEdge[] = tab === "friends" ? accepted : tab === "incoming" ? incoming : tab === "outgoing" ? outgoing : [];

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
            <HandleResolver selfFriends={friends} selfUid={user.uid} onSend={onSend} />
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-6">
            {([
              { k: "friends" as Tab, label: "Friends", count: accepted.length },
              { k: "incoming" as Tab, label: "Incoming", count: incoming.length },
              { k: "outgoing" as Tab, label: "Outgoing", count: outgoing.length },
              { k: "discover" as Tab, label: "Discover", count: 0 },
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

          {tab === "discover" ? (
            <DiscoverPanel
              loading={suggestLoading}
              suggestions={suggestions}
              friends={friends}
              hasFriends={accepted.length > 0}
              onSend={onSend}
            />
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <span className="text-4xl">
                {tab === "friends" ? "🤝" : tab === "incoming" ? "📥" : "📤"}
              </span>
              <p className="text-cinema-muted text-sm">
                {tab === "friends" ? "No friends yet. Add by handle or check Discover." : tab === "incoming" ? "No incoming requests." : "No outgoing requests."}
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
      {edge.handle ? (
        <Link href={`/u/${edge.handle}`} className="relative w-11 h-11 rounded-full overflow-hidden bg-cinema-purple/30 flex items-center justify-center flex-shrink-0">
          {edge.photoURL ? (
            <Image src={edge.photoURL} alt={displayName} fill sizes="44px" className="object-cover" unoptimized />
          ) : (
            <span className="text-sm font-bold text-white">{initials}</span>
          )}
        </Link>
      ) : (
        <div className="relative w-11 h-11 rounded-full overflow-hidden bg-cinema-purple/30 flex items-center justify-center flex-shrink-0">
          {edge.photoURL ? (
            <Image src={edge.photoURL} alt={displayName} fill sizes="44px" className="object-cover" unoptimized />
          ) : (
            <span className="text-sm font-bold text-white">{initials}</span>
          )}
        </div>
      )}
      <div className="flex-1 min-w-0">
        {edge.handle ? (
          <Link href={`/u/${edge.handle}`} className="text-sm font-semibold text-cinema-text hover:text-cinema-purple truncate block">{displayName}</Link>
        ) : (
          <p className="text-sm font-semibold text-cinema-text truncate">{displayName}</p>
        )}
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

function DiscoverPanel({
  loading, suggestions, friends, hasFriends, onSend,
}: {
  loading: boolean;
  suggestions: FriendSuggestion[];
  friends: FriendEdge[];
  hasFriends: boolean;
  onSend: (target: UserProfile) => Promise<void>;
}) {
  if (!hasFriends) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <span className="text-4xl">🌱</span>
        <p className="text-cinema-muted text-sm">Add at least one friend to unlock people-you-may-know suggestions.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl skeleton" />
        ))}
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <span className="text-4xl">🤔</span>
        <p className="text-cinema-muted text-sm">No suggestions right now. Your friends&apos; circles haven&apos;t added many people yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-cinema-muted mb-3">People who share friends with you. More mutuals = stronger connection.</p>
      {suggestions.map((s) => (
        <SuggestionRow key={s.uid} suggestion={s} friends={friends} onSend={onSend} />
      ))}
    </div>
  );
}

function SuggestionRow({
  suggestion, friends, onSend,
}: {
  suggestion: FriendSuggestion;
  friends: FriendEdge[];
  onSend: (target: UserProfile) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const initials = (suggestion.displayName || suggestion.handle || "?").slice(0, 2).toUpperCase();

  const handleAdd = async () => {
    setBusy(true);
    try {
      await onSend({ uid: suggestion.uid, handle: suggestion.handle, displayName: suggestion.displayName, photoURL: suggestion.photoURL });
      setSent(true);
    } finally {
      setBusy(false);
    }
  };

  // Resolve mutual handles via own friends list
  const mutualHandles = suggestion.viaHandles.length > 0
    ? suggestion.viaHandles.slice(0, 3).map((h) => `@${h}`)
    : suggestion.mutualUids.slice(0, 3).map((uid) => {
        const f = friends.find((fe) => fe.uid === uid);
        return f?.handle ? `@${f.handle}` : null;
      }).filter(Boolean) as string[];

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-cinema-card/60 border border-cinema-border/40">
      {suggestion.handle ? (
        <Link href={`/u/${suggestion.handle}`} className="relative w-12 h-12 rounded-full overflow-hidden bg-cinema-purple/30 flex items-center justify-center flex-shrink-0">
          {suggestion.photoURL ? (
            <Image src={suggestion.photoURL} alt={suggestion.displayName || suggestion.handle} fill sizes="48px" className="object-cover" unoptimized />
          ) : (
            <span className="text-sm font-bold text-white">{initials}</span>
          )}
        </Link>
      ) : (
        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-cinema-purple/30 flex items-center justify-center flex-shrink-0">
          {suggestion.photoURL ? (
            <Image src={suggestion.photoURL} alt={suggestion.displayName || "user"} fill sizes="48px" className="object-cover" unoptimized />
          ) : (
            <span className="text-sm font-bold text-white">{initials}</span>
          )}
        </div>
      )}
      <div className="flex-1 min-w-0">
        {suggestion.handle ? (
          <Link href={`/u/${suggestion.handle}`} className="text-sm font-semibold text-cinema-text hover:text-cinema-purple truncate block">
            {suggestion.displayName || `@${suggestion.handle}`}
          </Link>
        ) : (
          <p className="text-sm font-semibold text-cinema-text truncate">{suggestion.displayName || "User"}</p>
        )}
        {suggestion.handle && suggestion.displayName && (
          <p className="text-xs text-cinema-purple truncate">@{suggestion.handle}</p>
        )}
        <p className="text-[11px] text-cinema-muted mt-0.5">
          {suggestion.mutualCount} mutual{suggestion.mutualCount === 1 ? "" : "s"}
          {mutualHandles.length > 0 && ` · ${mutualHandles.join(", ")}`}
          {suggestion.mutualCount > mutualHandles.length && ` +${suggestion.mutualCount - mutualHandles.length}`}
        </p>
      </div>
      <button
        onClick={handleAdd}
        disabled={busy || sent}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${
          sent
            ? "bg-cinema-surface border border-cinema-border text-cinema-muted"
            : "gradient-purple text-white"
        }`}
      >
        <UserPlus className="w-3.5 h-3.5" />
        {sent ? "Sent" : busy ? "..." : "Add"}
      </button>
    </div>
  );
}
