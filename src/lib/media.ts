import type { Movie, MediaType } from "@/context/AppContext";
import * as tmdb from "./tmdb";

export type { MediaType };

export interface MediaItem {
  id: string;
  mediaType: MediaType;
  title: string;
  year: string;
  posterUrl: string;
  backdropUrl?: string;
  rating?: string;
  overview?: string;
  genres?: string[];
  popularity?: number;
}

export interface VideoItem {
  key: string;
  name: string;
  type: string; // Trailer | Teaser | Clip | Featurette | Behind the Scenes | ...
  language?: string; // iso_639_1
  official?: boolean;
  publishedAt?: string;
}

export interface MediaDetail extends MediaItem {
  runtime?: string;
  seasons?: number;
  episodes?: number;
  language?: string;
  director?: string;
  cast?: string[];
  trailerKey?: string | null;
  releaseDate?: string;
  status?: string;
  inProduction?: boolean;
}

export interface WatchProviderInfo {
  link?: string;
  streaming: { name: string; logo: string }[];
  rent: { name: string; logo: string }[];
  buy: { name: string; logo: string }[];
}

export interface PersonItem {
  id: string;
  name: string;
  profileUrl: string;
  knownForDepartment?: string;
  knownFor?: MediaItem[];
}

export interface PersonDetail extends PersonItem {
  biography?: string;
  birthday?: string | null;
  deathday?: string | null;
  placeOfBirth?: string | null;
  alsoKnownAs?: string[];
}

export interface PersonCredit extends MediaItem {
  character?: string;
  job?: string;
}

export interface PagedResult<T> {
  page: number;
  totalPages: number;
  totalResults: number;
  results: T[];
}

export type SearchScope = "all" | "movie" | "tv" | "person";

export interface MediaProvider {
  search(query: string): Promise<MediaItem[]>;
  searchMovies(query: string): Promise<MediaItem[]>;
  searchTV(query: string): Promise<MediaItem[]>;
  searchPaged(scope: SearchScope, query: string, page: number): Promise<PagedResult<MediaItem | PersonItem>>;
  searchMoviesPaged(query: string, page: number): Promise<PagedResult<MediaItem>>;
  searchTVPaged(query: string, page: number): Promise<PagedResult<MediaItem>>;
  searchPeoplePaged(query: string, page: number): Promise<PagedResult<PersonItem>>;
  keywordFallback(query: string, page: number): Promise<PagedResult<MediaItem>>;
  getDetail(type: MediaType, id: string): Promise<MediaDetail | null>;
  getTrending(window: "day" | "week"): Promise<MediaItem[]>;
  getTrendingAll(window: "day" | "week"): Promise<MediaItem[]>;
  getRecommendations(type: MediaType, id: string): Promise<MediaItem[]>;
  getWatchProviders(type: MediaType, id: string, region?: string): Promise<WatchProviderInfo | null>;
  resolveTrailerKey(type: MediaType, id: string, existingKey: string | null): Promise<string | null>;
  getVideos(type: MediaType, id: string): Promise<VideoItem[]>;
  getPerson(id: string): Promise<PersonDetail | null>;
  getPersonCredits(id: string): Promise<PersonCredit[]>;
  toMovie(item: MediaItem): Movie;
  toMovieFromDetail(detail: MediaDetail): Movie;
}

function mapSearchResult(r: tmdb.TMDBSearchResult, fallbackType: MediaType = "movie"): MediaItem | null {
  const rawType = r.media_type;
  const mediaType: MediaType = rawType === "tv" ? "tv" : rawType === "movie" ? "movie" : fallbackType;
  const title = r.title || r.name;
  if (!title) return null;
  const dateField = mediaType === "tv" ? r.first_air_date : r.release_date;
  return {
    id: String(r.id),
    mediaType,
    title,
    year: dateField?.split("-")[0] || "",
    posterUrl: tmdb.posterUrl(r.poster_path),
    backdropUrl: r.backdrop_path ? tmdb.backdropUrl(r.backdrop_path) : undefined,
    rating: r.vote_average ? r.vote_average.toFixed(1) : undefined,
    overview: r.overview || undefined,
  };
}

function mapPerson(r: tmdb.TMDBSearchResult): PersonItem | null {
  if (!r.name) return null;
  const knownFor = (r.known_for || [])
    .map((k) => mapSearchResult(k))
    .filter((x): x is MediaItem => x !== null);
  return {
    id: String(r.id),
    name: r.name,
    profileUrl: tmdb.profileUrl(r.profile_path, "w185"),
    knownForDepartment: r.known_for_department,
    knownFor,
  };
}

function toPaged<T>(r: tmdb.TMDBPagedResponse, mapper: (raw: tmdb.TMDBSearchResult) => T | null): PagedResult<T> {
  return {
    page: r.page,
    totalPages: r.total_pages,
    totalResults: r.total_results,
    results: r.results.map(mapper).filter((x): x is T => x !== null),
  };
}

const tmdbProvider: MediaProvider = {
  async search(query) {
    const raw = await tmdb.searchMulti(query);
    return raw.map((r) => mapSearchResult(r)).filter((x): x is MediaItem => x !== null);
  },
  async searchMovies(query) {
    const raw = await tmdb.searchMovies(query);
    return raw.map((r) => mapSearchResult(r, "movie")).filter((x): x is MediaItem => x !== null);
  },
  async searchTV(query) {
    const raw = await tmdb.searchTV(query);
    return raw.map((r) => mapSearchResult(r, "tv")).filter((x): x is MediaItem => x !== null);
  },
  async searchPaged(scope, query, page) {
    if (scope === "movie") return await tmdbProvider.searchMoviesPaged(query, page);
    if (scope === "tv") return await tmdbProvider.searchTVPaged(query, page);
    if (scope === "person") return await tmdbProvider.searchPeoplePaged(query, page);
    const r = await tmdb.searchMultiPaged(query, page);
    return {
      page: r.page,
      totalPages: r.total_pages,
      totalResults: r.total_results,
      results: r.results
        .map((raw) => {
          if (raw.media_type === "person") return mapPerson(raw);
          return mapSearchResult(raw);
        })
        .filter((x): x is MediaItem | PersonItem => x !== null),
    };
  },
  async searchMoviesPaged(query, page) {
    const r = await tmdb.searchMoviesPaged(query, page);
    return toPaged<MediaItem>(r, (raw) => mapSearchResult({ ...raw, media_type: "movie" }, "movie"));
  },
  async searchTVPaged(query, page) {
    const r = await tmdb.searchTVPaged(query, page);
    return toPaged<MediaItem>(r, (raw) => mapSearchResult({ ...raw, media_type: "tv" }, "tv"));
  },
  async searchPeoplePaged(query, page) {
    const r = await tmdb.searchPeoplePaged(query, page);
    return toPaged<PersonItem>(r, mapPerson);
  },
  async keywordFallback(query, page) {
    const keywords = await tmdb.searchKeyword(query);
    if (keywords.length === 0) {
      return { page: 1, totalPages: 0, totalResults: 0, results: [] };
    }
    const top = keywords[0];
    const r = await tmdb.discoverByKeyword(top.id, page);
    return toPaged<MediaItem>(r, (raw) => mapSearchResult({ ...raw, media_type: "movie" }, "movie"));
  },
  async getDetail(type, id) {
    if (type === "movie") {
      const d = await tmdb.getMovieDetails(id);
      if (!d) return null;
      return {
        id: String(d.id),
        mediaType: "movie",
        title: d.title,
        year: d.release_date?.split("-")[0] || "",
        posterUrl: tmdb.posterUrl(d.poster_path),
        backdropUrl: tmdb.backdropUrl(d.backdrop_path),
        rating: d.vote_average ? d.vote_average.toFixed(1) : undefined,
        overview: d.overview,
        genres: d.genres?.map((g) => g.name),
        runtime: d.runtime ? `${d.runtime} min` : undefined,
        language: d.spoken_languages?.[0]?.english_name,
        director: d.credits?.crew?.find((c) => c.job === "Director")?.name,
        cast: d.credits?.cast?.slice(0, 5).map((c) => c.name),
        trailerKey: tmdb.getTrailerKey(d),
        releaseDate: d.release_date,
      };
    }
    const t = await tmdb.getTVDetails(id);
    if (!t) return null;
    const creator = t.created_by?.[0]?.name;
    const runtime = t.episode_run_time?.[0] ? `${t.episode_run_time[0]} min/ep` : undefined;
    return {
      id: String(t.id),
      mediaType: "tv",
      title: t.name,
      year: t.first_air_date?.split("-")[0] || "",
      posterUrl: tmdb.posterUrl(t.poster_path),
      backdropUrl: tmdb.backdropUrl(t.backdrop_path),
      rating: t.vote_average ? t.vote_average.toFixed(1) : undefined,
      overview: t.overview,
      genres: t.genres?.map((g) => g.name),
      runtime,
      seasons: t.number_of_seasons,
      episodes: t.number_of_episodes,
      language: t.spoken_languages?.[0]?.english_name,
      director: creator,
      cast: t.credits?.cast?.slice(0, 5).map((c) => c.name),
      trailerKey: tmdb.findTrailerKey(t.videos?.results || []),
      releaseDate: t.first_air_date,
      status: t.status,
      inProduction: t.in_production,
    };
  },
  async getTrending(window) {
    const raw = await tmdb.getTrending(window);
    return raw.map((r) => mapSearchResult(r, "movie")).filter((x): x is MediaItem => x !== null);
  },
  async getTrendingAll(window) {
    const raw = await tmdb.getTrendingAll(window);
    return raw
      .filter((r) => r.media_type === "movie" || r.media_type === "tv")
      .map((r) => mapSearchResult(r))
      .filter((x): x is MediaItem => x !== null);
  },
  async getRecommendations(type, id) {
    const raw = type === "tv" ? await tmdb.getTVRecommendations(id) : await tmdb.getRecommendations(id);
    return raw.map((r) => mapSearchResult(r, type)).filter((x): x is MediaItem => x !== null);
  },
  async getWatchProviders(type, id, region = "IN") {
    const data = type === "tv" ? await tmdb.getTVWatchProviders(id, region) : await tmdb.getWatchProviders(id, region);
    if (!data) return null;
    const m = (arr?: tmdb.WatchProvider[]) =>
      (arr || []).map((p) => ({ name: p.provider_name, logo: `https://image.tmdb.org/t/p/w45${p.logo_path}` }));
    return {
      link: data.link,
      streaming: m(data.flatrate),
      rent: m(data.rent),
      buy: m(data.buy),
    };
  },
  async resolveTrailerKey(type, id, existingKey) {
    if (existingKey) return existingKey;
    const vids = type === "tv" ? await tmdb.getTVVideos(id) : await tmdb.getMovieVideos(id);
    return tmdb.findTrailerKey(vids);
  },
  async getVideos(type, id) {
    const raw = await tmdb.getAllVideos(type, id);
    return raw.map((v) => ({
      key: v.key,
      name: v.name,
      type: v.type,
      language: v.iso_639_1,
      official: v.official,
      publishedAt: v.published_at,
    }));
  },
  async getPerson(id) {
    const p = await tmdb.getPersonDetail(id);
    if (!p) return null;
    return {
      id: String(p.id),
      name: p.name,
      profileUrl: tmdb.profileUrl(p.profile_path, "h632"),
      knownForDepartment: p.known_for_department,
      biography: p.biography || undefined,
      birthday: p.birthday,
      deathday: p.deathday,
      placeOfBirth: p.place_of_birth,
      alsoKnownAs: p.also_known_as,
    };
  },
  async getPersonCredits(id) {
    const combined = await tmdb.getPersonCombinedCredits(id);
    const all: PersonCredit[] = [];
    for (const c of combined.cast) {
      const base = mapSearchResult(c);
      if (!base) continue;
      all.push({ ...base, character: c.character });
    }
    for (const c of combined.crew) {
      if (c.department !== "Directing" && c.department !== "Writing" && c.department !== "Production") continue;
      const base = mapSearchResult(c);
      if (!base) continue;
      all.push({ ...base, job: c.job });
    }
    // Deduplicate by type+id (same title may appear in both cast and crew)
    const seen = new Set<string>();
    return all.filter((item) => {
      const key = `${item.mediaType}-${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },
  toMovie(item) {
    return {
      imdbID: item.id,
      Title: item.title,
      Year: item.year || "N/A",
      Poster: item.posterUrl,
      imdbRating: item.rating || "N/A",
      Genre: item.genres?.join(", "),
      Plot: item.overview,
      mediaType: item.mediaType,
      Type: item.mediaType,
    };
  },
  toMovieFromDetail(d) {
    return {
      imdbID: d.id,
      Title: d.title,
      Year: d.year || "N/A",
      Poster: d.posterUrl,
      imdbRating: d.rating || "N/A",
      Genre: d.genres?.join(", "),
      Plot: d.overview,
      Language: d.language,
      Runtime: d.runtime,
      Director: d.director,
      Actors: d.cast?.join(", "),
      mediaType: d.mediaType,
      Type: d.mediaType,
      Seasons: d.seasons,
      Episodes: d.episodes,
    };
  },
};

export const media: MediaProvider = tmdbProvider;

export function titleHref(type: MediaType, id: string | number): string {
  return `/title/${type}/${id}`;
}

export function personHref(id: string | number): string {
  return `/person/${id}`;
}

export function isPerson(item: MediaItem | PersonItem): item is PersonItem {
  return "name" in item && !("mediaType" in item);
}
