"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Search, UserPlus, Hourglass, Check, X, AlertCircle } from "lucide-react";
import { getUserProfileByHandle, validateHandle, type UserProfile } from "@/lib/userStore";
import { computeMutuals, type FriendEdge } from "@/lib/socialStore";
import { useApp } from "@/context/AppContext";

interface Props {
  selfFriends: FriendEdge[];
  selfUid: string;
  onSend: (target: UserProfile) => Promise<void>;
}

type State =
  | { kind: "idle" }
  | { kind: "searching" }
  | { kind: "invalid"; reason: string }
  | { kind: "self" }
  | { kind: "not-found"; raw: string }
  | { kind: "found"; profile: UserProfile; mutuals: string[]; relation: FriendRelation };

type FriendRelation = "none" | "friends" | "pending_out" | "pending_in" | "blocked";

export default function HandleResolver({ selfFriends, selfUid, onSend }: Props) {
  const { profile: selfProfile } = useApp();
  const [raw, setRaw] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const [busy, setBusy] = useState(false);

  // Debounced lookup
  useEffect(() => {
    const trimmed = raw.trim().replace(/^@/, "");
    if (!trimmed) { setState({ kind: "idle" }); return; }
    const v = validateHandle(trimmed);
    if (!v.ok) { setState({ kind: "invalid", reason: v.error }); return; }
    if (selfProfile?.handle && v.handle === selfProfile.handle) {
      setState({ kind: "self" });
      return;
    }

    setState({ kind: "searching" });
    let cancelled = false;
    const t = setTimeout(async () => {
      const target = await getUserProfileByHandle(v.handle);
      if (cancelled) return;
      if (!target) {
        setState({ kind: "not-found", raw: v.handle });
        return;
      }
      const relation = relationOf(selfFriends, target.uid);
      // Compute mutuals in parallel; show profile immediately
      setState({ kind: "found", profile: target, mutuals: [], relation });
      const mutuals = await computeMutuals(selfFriends, target.uid);
      if (!cancelled) {
        setState((prev) => (prev.kind === "found" && prev.profile.uid === target.uid)
          ? { ...prev, mutuals }
          : prev);
      }
    }, 350);

    return () => { cancelled = true; clearTimeout(t); };
  }, [raw, selfFriends, selfProfile?.handle]);

  const handleSend = async () => {
    if (state.kind !== "found") return;
    setBusy(true);
    try {
      await onSend(state.profile);
      setRaw("");
      setState({ kind: "idle" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-cinema-muted">@</span>
        <input
          type="text"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="friendhandle"
          className="w-full pl-10 pr-12 py-3 rounded-xl bg-cinema-surface border border-cinema-border text-cinema-text placeholder:text-cinema-muted/60 text-sm focus:outline-none focus:border-cinema-purple focus:ring-1 focus:ring-cinema-purple/50"
        />
        {state.kind === "searching" && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            <div className="w-4 h-4 border-2 border-cinema-purple border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {state.kind !== "searching" && raw && (
          <button
            onClick={() => { setRaw(""); setState({ kind: "idle" }); }}
            aria-label="Clear"
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-cinema-muted hover:text-cinema-text transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {state.kind === "invalid" && (
          <PreviewCard key="invalid">
            <div className="flex items-center gap-2 text-cinema-red text-sm">
              <AlertCircle className="w-4 h-4" /> {state.reason}
            </div>
          </PreviewCard>
        )}

        {state.kind === "self" && (
          <PreviewCard key="self">
            <p className="text-cinema-muted text-sm">That&apos;s you.</p>
          </PreviewCard>
        )}

        {state.kind === "not-found" && (
          <PreviewCard key="not-found">
            <div className="flex items-center gap-2 text-cinema-muted text-sm">
              <Search className="w-4 h-4" /> No user with handle <span className="text-cinema-text font-mono">@{state.raw}</span>
            </div>
            <p className="text-[11px] text-cinema-muted/70 mt-1">Check the spelling or ask them to share their profile link.</p>
          </PreviewCard>
        )}

        {state.kind === "found" && (
          <FoundCard
            key={state.profile.uid}
            profile={state.profile}
            mutuals={state.mutuals}
            relation={state.relation}
            onSend={handleSend}
            busy={busy}
            selfFriends={selfFriends}
            selfUid={selfUid}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PreviewCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18 }}
      className="p-3 rounded-xl bg-cinema-surface border border-cinema-border/40"
    >
      {children}
    </motion.div>
  );
}

interface FoundCardProps {
  profile: UserProfile;
  mutuals: string[];
  relation: FriendRelation;
  onSend: () => Promise<void>;
  busy: boolean;
  selfFriends: FriendEdge[];
  selfUid: string;
}

function FoundCard({ profile, mutuals, relation, onSend, busy, selfFriends }: FoundCardProps) {
  const initials = (profile.displayName || profile.handle || "?").slice(0, 2).toUpperCase();
  const action = (() => {
    if (relation === "none") return { label: "Send request", Icon: UserPlus, cls: "gradient-purple text-white", disabled: busy };
    if (relation === "pending_out") return { label: "Request sent", Icon: Hourglass, cls: "bg-cinema-surface border border-cinema-border text-cinema-muted", disabled: true };
    if (relation === "pending_in") return { label: "Accept request", Icon: Check, cls: "bg-cinema-green/15 text-cinema-green border border-cinema-green/40", disabled: busy };
    if (relation === "friends") return { label: "Already friends", Icon: Check, cls: "bg-cinema-surface border border-cinema-border text-cinema-muted", disabled: true };
    return { label: "Blocked", Icon: X, cls: "bg-cinema-red/15 text-cinema-red border border-cinema-red/30", disabled: true };
  })();

  // Resolve mutuals to handles via selfFriends array
  const mutualLabels = mutuals.slice(0, 3).map((uid) => {
    const f = selfFriends.find((fe) => fe.uid === uid);
    return f?.handle ? `@${f.handle}` : null;
  }).filter(Boolean) as string[];

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18 }}
      className="p-3 rounded-xl bg-cinema-card border border-cinema-purple/30 depth-1"
    >
      <div className="flex items-center gap-3">
        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-cinema-purple/30 flex items-center justify-center flex-shrink-0">
          {profile.photoURL ? (
            <Image src={profile.photoURL} alt={profile.displayName || profile.handle || "avatar"} fill sizes="48px" className="object-cover" unoptimized />
          ) : (
            <span className="text-sm font-bold text-white">{initials}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {profile.handle && (
              <Link href={`/u/${profile.handle}`} className="font-semibold text-cinema-text hover:text-cinema-purple text-sm truncate">
                {profile.displayName || `@${profile.handle}`}
              </Link>
            )}
            {profile.verified && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cinema-purple/20 text-cinema-purple font-semibold">✓</span>
            )}
          </div>
          {profile.handle && profile.displayName && (
            <p className="text-xs text-cinema-purple truncate">@{profile.handle}</p>
          )}
          {mutuals.length > 0 ? (
            <p className="text-[11px] text-cinema-muted mt-1">
              {mutuals.length} mutual{mutuals.length === 1 ? "" : "s"}
              {mutualLabels.length > 0 && <> · {mutualLabels.join(", ")}{mutuals.length > mutualLabels.length ? ` +${mutuals.length - mutualLabels.length}` : ""}</>}
            </p>
          ) : (
            <p className="text-[11px] text-cinema-muted/70 mt-1">No mutuals</p>
          )}
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onSend}
          disabled={action.disabled}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${action.cls}`}
        >
          <action.Icon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{action.label}</span>
        </motion.button>
      </div>
    </motion.div>
  );
}

function relationOf(friends: FriendEdge[], otherUid: string): FriendRelation {
  const f = friends.find((x) => x.uid === otherUid);
  if (!f) return "none";
  if (f.status === "accepted") return "friends";
  if (f.status === "pending_out") return "pending_out";
  if (f.status === "pending_in") return "pending_in";
  if (f.status === "blocked") return "blocked";
  return "none";
}
