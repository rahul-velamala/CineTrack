"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Bookmark, Eye, Users, Inbox, Menu, X, Film } from "lucide-react";
import AuthModal from "./AuthModal";
import HandlePicker from "./HandlePicker";
import UserMenu from "./UserMenu";

export default function Navbar() {
  const { watchlist, watched, user, authLoading, incomingCount, inboxCount } = useApp();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const baseLinks = [
    { href: "/home", label: "Search", Icon: Search },
    { href: "/watchlist", label: "Watchlist", count: watchlist.length, Icon: Bookmark },
    { href: "/watched", label: "Watched", count: watched.length, Icon: Eye },
  ];
  const authedLinks = [
    { href: "/friends", label: "Friends", count: incomingCount, Icon: Users },
    { href: "/inbox", label: "Inbox", count: inboxCount, Icon: Inbox },
  ];
  const links = user ? [...baseLinks, ...authedLinks] : baseLinks;

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "glass-strong shadow-lg shadow-black/30" : "glass"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/home" className="flex items-center gap-2 group">
              <Film className="w-6 h-6 text-cinema-gold group-hover:rotate-[-6deg] transition-transform" />
              <span className="text-xl font-bold font-[family-name:var(--font-display)] text-gradient-gold">
                CineTrack
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {links.map((link) => {
                const isActive = pathname === link.href;
                const Icon = link.Icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-cinema-purple/20 text-cinema-purple"
                        : "text-cinema-muted hover:text-cinema-text hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                    <AnimatePresence>
                      {link.count !== undefined && link.count > 0 && (
                        <motion.span
                          key={`badge-${link.count}`}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 25 }}
                          className="ml-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-cinema-purple/30 text-cinema-purple"
                        >
                          {link.count}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {isActive && (
                      <motion.span
                        layoutId="nav-active-underline"
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full gradient-purple"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
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
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setAuthOpen(true)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold gradient-purple text-white hover:opacity-90 transition-all cursor-pointer"
                  >
                    Sign in
                  </motion.button>
                )
              )}
            </div>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-cinema-muted hover:text-cinema-text hover:bg-white/5 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          <AnimatePresence initial={false}>
            {mobileOpen && (
              <motion.div
                key="mobile-menu"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                className="md:hidden overflow-hidden"
              >
                <div className="pb-4 space-y-1">
                  {links.map((link) => {
                    const isActive = pathname === link.href;
                    const Icon = link.Icon;
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
                        <Icon className="w-4 h-4" />
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <HandlePicker />
    </>
  );
}
