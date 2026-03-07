"use client";

import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import AuthGuard from "@/components/AuthGuard";

export default function HomePage() {
  return (
    <AuthGuard>
      <Navbar />
      <main className="min-h-screen pt-16">
        {/* Hero Section */}
        <section className="relative pt-20 pb-16 px-4">
          {/* Background glow */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-cinema-purple/10 rounded-full blur-[120px]" />
          </div>

          <div className="relative max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold font-[family-name:var(--font-display)] leading-tight">
                Discover &{" "}
                <span className="text-gradient-gold">Track</span>
                <br />
                Your Movies
              </h1>
              <p className="text-cinema-muted text-lg max-w-lg mx-auto">
                Search any movie, watch trailers, and manage your personal watchlist — all in one place.
              </p>
            </div>

            <SearchBar />

            {/* Quick suggestions */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="text-cinema-muted">Try:</span>
              {["Inception", "3 Idiots", "Interstellar", "Dangal", "The Dark Knight"].map((title) => (
                <span
                  key={title}
                  className="px-3 py-1.5 rounded-full bg-cinema-surface border border-cinema-border/50 text-cinema-muted hover:text-cinema-text hover:border-cinema-purple/50 transition-all cursor-default"
                >
                  {title}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Feature hints */}
        <section className="max-w-5xl mx-auto px-4 pb-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: "🔍", title: "Search", desc: "Find any Bollywood or Hollywood movie" },
              { icon: "🎬", title: "Watch Trailers", desc: "Watch trailers right on the page" },
              { icon: "📋", title: "Track Movies", desc: "Save to watchlist or mark as watched" },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl bg-cinema-card/50 border border-cinema-border/30 hover:border-cinema-purple/30 transition-all"
              >
                <span className="text-2xl mb-3 block">{feature.icon}</span>
                <h3 className="font-semibold text-sm text-cinema-text mb-1">{feature.title}</h3>
                <p className="text-xs text-cinema-muted">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </AuthGuard>
  );
}
