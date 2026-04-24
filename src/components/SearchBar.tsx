"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { searchMulti, TMDBSearchResult, posterUrl, profileUrl } from "@/lib/tmdb";
import { titleHref, personHref, type MediaType } from "@/lib/media";
import { loadRecentSearches, addRecentSearch, removeRecentSearch } from "@/lib/recentSearches";

type RowKind = "movie" | "tv" | "person";

interface DisplayResult {
  id: number;
  title: string;
  year: string;
  poster: string;
  rating: string;
  kind: RowKind;
  subtitle?: string;
}

function flattenResults(raw: TMDBSearchResult[]): DisplayResult[] {
  const results: DisplayResult[] = [];
  for (const item of raw) {
    if (item.media_type === "movie" && item.title) {
      results.push({
        id: item.id,
        title: item.title,
        year: item.release_date?.split("-")[0] || "",
        poster: posterUrl(item.poster_path, "w92"),
        rating: item.vote_average ? item.vote_average.toFixed(1) : "",
        kind: "movie",
      });
    } else if (item.media_type === "tv" && item.name) {
      results.push({
        id: item.id,
        title: item.name,
        year: item.first_air_date?.split("-")[0] || "",
        poster: posterUrl(item.poster_path, "w92"),
        rating: item.vote_average ? item.vote_average.toFixed(1) : "",
        kind: "tv",
        subtitle: "Series",
      });
    } else if (item.media_type === "person" && item.name) {
      const knownTitles = (item.known_for || [])
        .map((k) => k.title || k.name)
        .filter(Boolean)
        .slice(0, 2)
        .join(", ");
      results.push({
        id: item.id,
        title: item.name,
        year: "",
        poster: profileUrl(item.profile_path, "w185"),
        rating: "",
        kind: "person",
        subtitle: knownTitles ? `Person · ${knownTitles}` : "Person",
      });
    }
  }
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = `${r.kind}-${r.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10);
}

function hrefFor(r: DisplayResult): string {
  if (r.kind === "person") return personHref(r.id);
  return titleHref(r.kind as MediaType, r.id);
}

interface SearchBarProps {
  initialQuery?: string;
}

export default function SearchBar({ initialQuery }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery || "");
  const [results, setResults] = useState<DisplayResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  useEffect(() => {
    setRecent(loadRecentSearches());
  }, []);

  const doSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setIsLoading(true);
    try {
      const raw = await searchMulti(searchQuery);
      const flat = flattenResults(raw);
      setResults(flat);
      setShowDropdown(true);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialQuery && initialQuery.length >= 2) {
      doSearch(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (query.length < 2) {
      setResults([]);
      setShowDropdown(query.length === 0 && recent.length > 0);
      return;
    }
    searchTimeoutRef.current = setTimeout(() => doSearch(query), 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query, doSearch, recent.length]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (r: DisplayResult) => {
    setShowDropdown(false);
    setQuery("");
    router.push(hrefFor(r));
  };

  const pushToSearch = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setShowDropdown(false);
    setQuery("");
    setRecent(addRecentSearch(trimmed));
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const handleRemoveRecent = (e: React.MouseEvent, q: string) => {
    e.stopPropagation();
    setRecent(removeRecentSearch(q));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowDropdown(false);
      return;
    }
    if (e.key === "Enter") {
      if (selectedIndex >= 0 && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
        return;
      }
      if (query.trim().length >= 2) {
        e.preventDefault();
        pushToSearch(query);
        return;
      }
    }
    if (!showDropdown || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    }
  };

  const showingRecent = query.length === 0 && recent.length > 0 && showDropdown;
  const showingResults = query.length >= 2 && showDropdown;

  return (
    <div ref={dropdownRef} className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-cinema-muted">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(-1);
          }}
          onFocus={() => {
            if (results.length > 0 || recent.length > 0) setShowDropdown(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search movies, TV shows, actors..."
          className="w-full pl-12 pr-12 py-4 rounded-2xl bg-cinema-surface border border-cinema-border text-cinema-text placeholder:text-cinema-muted/60 text-base focus:outline-none focus:border-cinema-purple focus:ring-1 focus:ring-cinema-purple/50 transition-all"
          autoComplete="off"
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            <div className="w-5 h-5 border-2 border-cinema-purple border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {query && !isLoading && (
          <button
            onClick={() => { setQuery(""); setResults([]); setShowDropdown(recent.length > 0); }}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-cinema-muted hover:text-cinema-text transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {showingRecent && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl glass-strong overflow-hidden shadow-2xl shadow-black/50 animate-slide-down z-50">
          <div className="px-4 py-2 text-xs uppercase tracking-wider text-cinema-muted border-b border-cinema-border/30">Recent searches</div>
          {recent.map((q) => (
            <button
              key={q}
              onClick={() => pushToSearch(q)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 border-b border-cinema-border/20 last:border-b-0 cursor-pointer"
            >
              <svg className="w-4 h-4 text-cinema-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="flex-1 text-sm text-cinema-text truncate">{q}</span>
              <span
                onClick={(e) => handleRemoveRecent(e, q)}
                className="text-cinema-muted hover:text-cinema-red text-xs px-2 py-0.5 rounded cursor-pointer"
              >
                ✕
              </span>
            </button>
          ))}
        </div>
      )}

      {showingResults && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl glass-strong overflow-hidden shadow-2xl shadow-black/50 animate-slide-down z-50">
          {results.length > 0 ? (
            <>
              <div className="max-h-[440px] overflow-y-auto">
                {results.map((item, index) => (
                  <button
                    key={`${item.kind}-${item.id}-${index}`}
                    onClick={() => handleSelect(item)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${
                      index === selectedIndex
                        ? "bg-cinema-purple/15"
                        : "hover:bg-white/5"
                    } ${index !== results.length - 1 ? "border-b border-cinema-border/30" : ""}`}
                  >
                    <div className="relative w-10 h-14 rounded-md overflow-hidden bg-cinema-surface flex-shrink-0">
                      <Image
                        src={item.poster}
                        alt={item.title}
                        fill
                        sizes="40px"
                        className="object-cover"
                        unoptimized
                      />
                      {item.kind === "tv" && (
                        <span className="absolute top-0.5 left-0.5 text-[8px] font-bold uppercase px-1 py-0.5 rounded bg-black/70 text-white border border-white/10">
                          TV
                        </span>
                      )}
                      {item.kind === "person" && (
                        <span className="absolute top-0.5 left-0.5 text-[8px] font-bold uppercase px-1 py-0.5 rounded bg-black/70 text-white border border-white/10">
                          👤
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-cinema-text truncate">{item.title}</p>
                      <div className="flex items-center gap-2 text-xs text-cinema-muted mt-0.5">
                        {item.year && <span>{item.year}</span>}
                        {item.rating && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-cinema-border" />
                            <span className="text-cinema-gold">★ {item.rating}</span>
                          </>
                        )}
                        {item.subtitle && (
                          <>
                            {(item.year || item.rating) && <span className="w-1 h-1 rounded-full bg-cinema-border" />}
                            <span className="text-cinema-purple truncate">{item.subtitle}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-cinema-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
              <button
                onClick={() => pushToSearch(query)}
                className="w-full px-4 py-3 text-center text-sm font-semibold text-cinema-purple bg-cinema-purple/10 hover:bg-cinema-purple/20 border-t border-cinema-border/30 transition-colors cursor-pointer"
              >
                See all results for &ldquo;{query}&rdquo; →
              </button>
            </>
          ) : (
            <div className="px-4 py-8 text-center text-cinema-muted text-sm">
              {isLoading ? "Searching..." : (
                <>
                  Nothing found.{" "}
                  <button
                    onClick={() => pushToSearch(query)}
                    className="text-cinema-purple hover:underline cursor-pointer"
                  >
                    Try full search →
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
