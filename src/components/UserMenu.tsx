"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Settings, User as UserIcon, LogOut } from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function UserMenu() {
  const { user, profile, signOut } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) return null;

  const displayName = profile?.displayName || user.displayName || user.email || "Account";
  const photoURL = profile?.photoURL || user.photoURL;
  const handle = profile?.handle;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((s) => !s)}
        aria-label="Account menu"
        className="flex items-center gap-2 px-1 py-1 pr-3 rounded-full border border-cinema-border/50 hover:border-cinema-purple/50 bg-cinema-surface transition-colors cursor-pointer"
      >
        <div className="relative w-7 h-7 rounded-full overflow-hidden bg-cinema-purple/30 flex items-center justify-center">
          {photoURL ? (
            <Image src={photoURL} alt={displayName} fill sizes="28px" className="object-cover" unoptimized />
          ) : (
            <span className="text-xs font-bold text-white">{initials}</span>
          )}
        </div>
        {handle && <span className="hidden sm:inline text-xs text-cinema-text">@{handle}</span>}
        <svg className="w-3 h-3 text-cinema-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-60 rounded-2xl glass-strong border border-cinema-border/50 depth-3 overflow-hidden animate-slide-down z-50">
          <div className="px-4 py-3 border-b border-cinema-border/30">
            <p className="text-sm font-semibold text-cinema-text truncate">{displayName}</p>
            {handle && <p className="text-xs text-cinema-purple truncate">@{handle}</p>}
            {user.email && <p className="text-xs text-cinema-muted truncate mt-0.5">{user.email}</p>}
          </div>

          {handle && (
            <Link
              href={`/u/${handle}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-left text-sm text-cinema-text hover:bg-white/5 transition-colors cursor-pointer"
            >
              <UserIcon className="w-4 h-4 text-cinema-muted" /> View profile
            </Link>
          )}

          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-left text-sm text-cinema-text hover:bg-white/5 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4 text-cinema-muted" /> Settings
          </Link>

          <button
            onClick={async () => { setOpen(false); await signOut(); }}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-left text-sm text-cinema-red hover:bg-cinema-red/10 transition-colors cursor-pointer border-t border-cinema-border/30"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
