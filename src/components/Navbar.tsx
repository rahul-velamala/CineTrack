"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { useState } from "react";
import AuthModal from "./AuthModal";
import HandlePicker from "./HandlePicker";
import UserMenu from "./UserMenu";

export default function Navbar() {
  const { watchlist, watched, user, authLoading, incomingCount, inboxCount } = useApp();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const baseLinks = [
    { href: "/home", label: "Search", icon: "🔍" },
    { href: "/watchlist", label: "Watchlist", count: watchlist.length, icon: "📋" },
    { href: "/watched", label: "Watched", count: watched.length, icon: "✅" },
  ];
  const authedLinks = [
    { href: "/friends", label: "Friends", count: incomingCount, icon: "👥" },
    { href: "/inbox", label: "Inbox", count: inboxCount, icon: "📥" },
  ];
  const links = user ? [...baseLinks, ...authedLinks] : baseLinks;

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/home" className="flex items-center gap-2 group">
              <span className="text-2xl">🎬</span>
              <span className="text-xl font-bold font-[family-name:var(--font-display)] text-gradient-gold">
                CineTrack
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-cinema-purple/20 text-cinema-purple"
                        : "text-cinema-muted hover:text-cinema-text hover:bg-white/5"
                    }`}
                  >
                    <span>{link.icon}</span>
                    <span>{link.label}</span>
                    {link.count !== undefined && link.count > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs font-bold rounded-full bg-cinema-purple/30 text-cinema-purple">
                        {link.count}
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full gradient-purple" />
                    )}
                  </Link>
                );
              })}
            </div>

            <div className="hidden md:flex items-center gap-2">
              {!authLoading && (
                user ? (
                  <UserMenu />
                ) : (
                  <button
                    onClick={() => setAuthOpen(true)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold gradient-purple text-white hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Sign in
                  </button>
                )
              )}
            </div>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-cinema-muted hover:text-cinema-text hover:bg-white/5 transition-colors"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {mobileOpen && (
            <div className="md:hidden pb-4 animate-slide-down space-y-1">
              {links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-cinema-purple/20 text-cinema-purple"
                        : "text-cinema-muted hover:text-cinema-text hover:bg-white/5"
                    }`}
                  >
                    <span className="text-lg">{link.icon}</span>
                    <span>{link.label}</span>
                    {link.count !== undefined && link.count > 0 && (
                      <span className="ml-auto px-2 py-0.5 text-xs font-bold rounded-full bg-cinema-purple/30 text-cinema-purple">
                        {link.count}
                      </span>
                    )}
                  </Link>
                );
              })}

              <div className="pt-2 border-t border-cinema-border/30 mt-2">
                {!authLoading && (
                  user ? (
                    <div className="px-2 py-2">
                      <UserMenu />
                    </div>
                  ) : (
                    <button
                      onClick={() => { setMobileOpen(false); setAuthOpen(true); }}
                      className="w-full px-4 py-3 rounded-lg text-sm font-semibold gradient-purple text-white transition-all cursor-pointer"
                    >
                      Sign in
                    </button>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <HandlePicker />
    </>
  );
}
