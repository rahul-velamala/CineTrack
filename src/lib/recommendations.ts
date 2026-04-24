import type { Movie, MediaType } from "@/context/AppContext";
import { media, type MediaItem } from "./media";

const CACHE_PREFIX = "cinetrack_recs_cache:";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CONCURRENCY = 6;
const MIN_SEEDS = 5;
const MAX_WATCHED_SEEDS = 20;
const TOP_N = 30;
const SCORE_WATCHED = 2;
const SCORE_WATCHLIST = 1;
const SCORE_GENRE = 0.5;

interface Seed {
  id: string;
  mediaType: MediaType;
  genres: string[];
  weight: number; // 2 for watched, 1 for watchlist
}

interface CachedEntry {
  ts: number;
  data: MediaItem[];
}

function cacheKey(type: MediaType, id: string): string {
  return `${CACHE_PREFIX}${type}:${id}`;
}

function readCache(type: MediaType, id: string): MediaItem[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(cacheKey(type, id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEntry;
    if (!parsed || typeof parsed.ts !== "number") return null;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    if (!Array.isArray(parsed.data)) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(type: MediaType, id: string, data: MediaItem[]): void {
  if (typeof window === "undefined") return;
  try {
    const entry: CachedEntry = { ts: Date.now(), data };
    localStorage.setItem(cacheKey(type, id), JSON.stringify(entry));
  } catch {
    // quota exceeded — ignore
  }
}

function parseGenres(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.split(",").map((g) => g.trim()).filter(Boolean);
}

function movieToSeed(m: Movie, weight: number): Seed {
  return {
    id: m.imdbID,
    mediaType: m.mediaType ?? "movie",
    genres: parseGenres(m.Genre),
    weight,
  };
}

function pickSeeds(watched: Movie[], watchlist: Movie[]): Seed[] {
  // Recent watched first (last 20). Assumes newest appended last.
  const recentWatched = watched.slice(-MAX_WATCHED_SEEDS);
  const watchedSeeds = recentWatched.map((m) => movieToSeed(m, SCORE_WATCHED));
  const watchlistSeeds = watchlist.map((m) => movieToSeed(m, SCORE_WATCHLIST));
  return [...watchedSeeds, ...watchlistSeeds];
}

async function fetchRecsForSeed(seed: Seed): Promise<MediaItem[]> {
  const cached = readCache(seed.mediaType, seed.id);
  if (cached) return cached;
  try {
    const recs = await media.getRecommendations(seed.mediaType, seed.id);
    writeCache(seed.mediaType, seed.id, recs);
    return recs;
  } catch {
    return [];
  }
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }).map(async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

function topGenres(seeds: Seed[], n: number): Set<string> {
  const counts = new Map<string, number>();
  for (const s of seeds) {
    for (const g of s.genres) counts.set(g, (counts.get(g) || 0) + s.weight);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([g]) => g);
  return new Set(top);
}

export interface PersonalRecsResult {
  items: MediaItem[];
  seedCount: number;
  sufficient: boolean;
}

export async function computePersonalRecs(watched: Movie[], watchlist: Movie[]): Promise<PersonalRecsResult> {
  const seeds = pickSeeds(watched, watchlist);
  if (seeds.length < MIN_SEEDS) {
    return { items: [], seedCount: seeds.length, sufficient: false };
  }

  const ownedKeys = new Set<string>();
  for (const m of watched) ownedKeys.add(`${m.mediaType ?? "movie"}-${m.imdbID}`);
  for (const m of watchlist) ownedKeys.add(`${m.mediaType ?? "movie"}-${m.imdbID}`);

  const topGenreSet = topGenres(seeds, 3);

  const recsLists = await mapWithConcurrency(seeds, CONCURRENCY, fetchRecsForSeed);

  // Score candidates. Key = "{mediaType}-{id}".
  const scored = new Map<string, { item: MediaItem; score: number }>();
  for (let i = 0; i < seeds.length; i++) {
    const seed = seeds[i];
    const recs = recsLists[i] || [];
    for (const r of recs) {
      const key = `${r.mediaType}-${r.id}`;
      if (ownedKeys.has(key)) continue;
      const existing = scored.get(key);
      let score = (existing?.score ?? 0) + seed.weight;
      if (existing == null) {
        // genre boost applied once per candidate
        const overlap = (r.genres || []).filter((g) => topGenreSet.has(g)).length;
        score += overlap * SCORE_GENRE;
      }
      scored.set(key, { item: r, score });
    }
  }

  const ranked = [...scored.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_N)
    .map((x) => x.item);

  return { items: ranked, seedCount: seeds.length, sufficient: true };
}

export function clearRecsCache(): void {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}
