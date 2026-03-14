"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { searchMulti, TMDBSearchResult, posterUrl } from "@/lib/tmdb";

interface DisplayResult {
  id: number;
  title: string;
  year: string;
  poster: string;
  rating: string;
  type: "movie" | "person";
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
        type: "movie",
      });
    } else if (item.media_type === "person" && item.known_for) {
      // Show the person's known movies as results
      for (const kf of item.known_for) {
        if (kf.media_type === "movie" && kf.title) {
          results.push({
            id: kf.id,
            title: kf.title,
            year: kf.release_date?.split("-")[0] || "",
            poster: posterUrl(kf.poster_path, "w92"),
            rating: kf.vote_average ? kf.vote_average.toFixed(1) : "",
            type: "movie",
            subtitle: `via ${item.name}`,
          });
        }
      }
    }
  }
  // Deduplicate by id
  const seen = new Set<number>();
  return results.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  }).slice(0, 10);
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // If initialQuery is provided, trigger search on mount
  useEffect(() => {
    if (initialQuery && initialQuery.length >= 2) {
      doSearch(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (query.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    searchTimeoutRef.current = setTimeout(() => doSearch(query), 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query, doSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (id: number) => {
    setShowDropdown(false);
    setQuery("");
    router.push(`/movie/${id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[selectedIndex].id);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  return (
    <div ref={dropdownRef} className="relative w-full max-w-2xl mx-auto">
      {/* Input */}
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
          onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
          onKeyDown={handleKeyDown}
          placeholder="Search movies, actors... (Bollywood, Hollywood & more)"
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
            onClick={() => { setQuery(""); setResults([]); setShowDropdown(false); }}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-cinema-muted hover:text-cinema-text transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl glass-strong overflow-hidden shadow-2xl shadow-black/50 animate-slide-down z-50">
          {results.length > 0 ? (
            <div className="max-h-[480px] overflow-y-auto">
              {results.map((item, index) => (
                <button
                  key={`${item.id}-${index}`}
                  onClick={() => handleSelect(item.id)}
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
                          <span className="w-1 h-1 rounded-full bg-cinema-border" />
                          <span className="text-cinema-purple">{item.subtitle}</span>
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
          ) : (
            <div className="px-4 py-8 text-center text-cinema-muted text-sm">
              {query.length >= 2 ? "No movies found. Try a different search." : "Type at least 2 characters to search."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
