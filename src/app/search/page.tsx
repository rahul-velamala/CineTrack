"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import MovieCard from "@/components/MovieCard";
import { media, titleHref, personHref, type MediaItem, type PersonItem, type SearchScope } from "@/lib/media";
import { addRecentSearch } from "@/lib/recentSearches";

type SortKey = "popularity" | "rating" | "year";

const SCOPE_LABELS: Record<SearchScope, string> = {
  all: "All",
  movie: "Movies",
  tv: "TV",
  person: "People",
};

function isPersonItem(x: MediaItem | PersonItem): x is PersonItem {
  return "name" in x && !("mediaType" in x);
}

function sortMedia(items: MediaItem[], sort: SortKey): MediaItem[] {
  const copy = [...items];
  if (sort === "rating") {
    copy.sort((a, b) => parseFloat(b.rating || "0") - parseFloat(a.rating || "0"));
  } else if (sort === "year") {
    copy.sort((a, b) => parseInt(b.year || "0", 10) - parseInt(a.year || "0", 10));
  }
  // "popularity" = TMDB default order, no-op
  return copy;
}

function SearchResultsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";
  const scopeParam = (searchParams.get("type") || "all") as SearchScope;
  const sortParam = (searchParams.get("sort") || "popularity") as SortKey;

  const [items, setItems] = useState<(MediaItem | PersonItem)[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    async function run() {
      setLoading(true);
      setUsedFallback(false);
      try {
        const first = await media.searchPaged(scopeParam, query, 1);
        if (cancelled) return;
        if (first.results.length === 0 && scopeParam !== "person") {
          // Zero-result retry: keyword fallback (movies only from TMDB /search/keyword)
          const fb = await media.keywordFallback(query, 1);
          if (cancelled) return;
          setItems(fb.results);
          setPage(fb.page);
          setTotalPages(fb.totalPages);
          setTotalResults(fb.totalResults);
          setUsedFallback(fb.results.length > 0);
        } else {
          setItems(first.results);
          setPage(first.page);
          setTotalPages(first.totalPages);
          setTotalResults(first.totalResults);
        }
        addRecentSearch(query);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [query, scopeParam]);

  const loadMore = useCallback(async () => {
    if (loading || page >= totalPages) return;
    setLoading(true);
    try {
      const next = usedFallback
        ? await media.keywordFallback(query, page + 1)
        : await media.searchPaged(scopeParam, query, page + 1);
      setItems((prev) => [...prev, ...next.results]);
      setPage(next.page);
      setTotalPages(next.totalPages);
    } finally {
      setLoading(false);
    }
  }, [loading, page, totalPages, usedFallback, query, scopeParam]);

  const setScope = (next: SearchScope) => {
    const url = new URL(window.location.href);
    url.searchParams.set("type", next);
    if (sortParam !== "popularity") url.searchParams.set("sort", sortParam);
    router.push(`${url.pathname}?${url.searchParams.toString()}`);
  };

  const setSort = (next: SortKey) => {
    const url = new URL(window.location.href);
    url.searchParams.set("sort", next);
    router.push(`${url.pathname}?${url.searchParams.toString()}`);
  };

  const visible = useMemo(() => {
    if (scopeParam === "person") return items;
    const mediaItems = items.filter((x): x is MediaItem => !isPersonItem(x));
    return sortMedia(mediaItems, sortParam);
  }, [items, scopeParam, sortParam]);

  const canSort = scopeParam !== "person";

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="mb-8 space-y-4">
            <div>
              <Link href="/home" className="text-xs text-cinema-muted hover:text-cinema-text transition-colors">← Back to home</Link>
              <h1 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-display)] mt-2">
                Search: <span className="text-gradient-gold">{query || "—"}</span>
              </h1>
              {!loading && totalResults > 0 && (
                <p className="text-cinema-muted text-sm mt-1">
                  {totalResults.toLocaleString()} result{totalResults === 1 ? "" : "s"}
                  {usedFallback && <span className="ml-2 text-cinema-gold">(showing related)</span>}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(Object.keys(SCOPE_LABELS) as SearchScope[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setScope(s)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    s === scopeParam
                      ? "bg-cinema-purple/25 text-cinema-purple border border-cinema-purple/40"
                      : "bg-cinema-surface text-cinema-muted border border-cinema-border/50 hover:border-cinema-purple/40 hover:text-cinema-text"
                  }`}
                >
                  {SCOPE_LABELS[s]}
                </button>
              ))}

              {canSort && (
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-cinema-muted">Sort:</span>
                  <select
                    value={sortParam}
                    onChange={(e) => setSort(e.target.value as SortKey)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-cinema-surface border border-cinema-border/50 text-cinema-text focus:outline-none focus:border-cinema-purple cursor-pointer"
                  >
                    <option value="popularity">Popularity</option>
                    <option value="rating">Rating</option>
                    <option value="year">Year</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {loading && items.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] rounded-xl skeleton" />
              ))}
            </div>
          ) : visible.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {visible.map((item, index) => {
                  if (isPersonItem(item)) {
                    return (
                      <PersonCard key={`p-${item.id}`} person={item} index={index} />
                    );
                  }
                  return (
                    <div key={`${item.mediaType}-${item.id}-${index}`} className="animate-fade-in" style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}>
                      <MovieCard movie={media.toMovie(item)} href={titleHref(item.mediaType, item.id)} />
                    </div>
                  );
                })}
              </div>

              {page < totalPages && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="px-6 py-3 rounded-xl font-semibold text-sm gradient-purple text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? "Loading..." : `Load more (page ${page + 1} of ${totalPages})`}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <span className="text-6xl">🔍</span>
              <p className="text-cinema-muted text-lg">No results for <span className="text-cinema-text">&ldquo;{query}&rdquo;</span></p>
              <p className="text-cinema-muted/60 text-sm max-w-sm">Try different keywords, check spelling, or switch filter.</p>
              <Link href="/home" className="mt-2 px-6 py-3 rounded-xl font-semibold text-sm gradient-gold text-cinema-bg hover:opacity-90 transition-all">
                Back to home
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function PersonCard({ person, index }: { person: PersonItem; index: number }) {
  return (
    <Link
      href={personHref(person.id)}
      className="group animate-fade-in block rounded-xl overflow-hidden bg-cinema-card border border-cinema-border/50 hover:border-cinema-purple/40 transition-all"
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-cinema-surface">
        <Image
          src={person.profileUrl}
          alt={person.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized
        />
        <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/70 backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider text-white border border-white/10">
          👤 Person
        </div>
      </div>
      <div className="p-3 space-y-1">
        <h3 className="font-semibold text-sm leading-tight line-clamp-1 text-cinema-text group-hover:text-white transition-colors">{person.name}</h3>
        {person.knownForDepartment && (
          <p className="text-xs text-cinema-muted">{person.knownForDepartment}</p>
        )}
        {person.knownFor && person.knownFor.length > 0 && (
          <p className="text-xs text-cinema-muted/70 line-clamp-1">
            Known for: {person.knownFor.slice(0, 3).map((k) => k.title).join(", ")}
          </p>
        )}
      </div>
    </Link>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <>
        <Navbar />
        <main className="min-h-screen pt-16 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-cinema-purple border-t-transparent rounded-full animate-spin" />
        </main>
      </>
    }>
      <SearchResultsClient />
    </Suspense>
  );
}
