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
}

export interface MediaDetail extends MediaItem {
  runtime?: string;
  seasons?: number;
  episodes?: number;
  language?: string;
  director?: string;
  cast?: string[];
  trailerKey?: string | null;
}

export interface WatchProviderInfo {
  link?: string;
  streaming: { name: string; logo: string }[];
  rent: { name: string; logo: string }[];
  buy: { name: string; logo: string }[];
}

export interface MediaProvider {
  search(query: string): Promise<MediaItem[]>;
  searchMovies(query: string): Promise<MediaItem[]>;
  searchTV(query: string): Promise<MediaItem[]>;
  getDetail(type: MediaType, id: string): Promise<MediaDetail | null>;
  getTrending(window: "day" | "week"): Promise<MediaItem[]>;
  getRecommendations(type: MediaType, id: string): Promise<MediaItem[]>;
  getWatchProviders(type: MediaType, id: string, region?: string): Promise<WatchProviderInfo | null>;
  toMovie(item: MediaItem): Movie;
  toMovieFromDetail(detail: MediaDetail): Movie;
}

function mapSearchResult(r: tmdb.TMDBSearchResult, fallbackType: MediaType = "movie"): MediaItem | null {
  const rawType = r.media_type;
  const mediaType: MediaType = rawType === "tv" ? "tv" : rawType === "movie" ? "movie" : fallbackType;
  const title = r.title || r.name;
  if (!title) return null;
  return {
    id: String(r.id),
    mediaType,
    title,
    year: r.release_date?.split("-")[0] || "",
    posterUrl: tmdb.posterUrl(r.poster_path),
    rating: r.vote_average ? r.vote_average.toFixed(1) : undefined,
    overview: r.overview || undefined,
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
  async searchTV() {
    // TMDB /search/tv wired up in Phase 1
    return [];
  },
  async getDetail(type, id) {
    if (type !== "movie") return null;
    const d = await tmdb.getMovieDetails(id);
    if (!d) return null;
    const trailerKey = tmdb.getTrailerKey(d);
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
      trailerKey,
    };
  },
  async getTrending(window) {
    const raw = await tmdb.getTrending(window);
    return raw.map((r) => mapSearchResult(r, "movie")).filter((x): x is MediaItem => x !== null);
  },
  async getRecommendations(type, id) {
    if (type !== "movie") return [];
    const raw = await tmdb.getRecommendations(id);
    return raw.map((r) => mapSearchResult(r, "movie")).filter((x): x is MediaItem => x !== null);
  },
  async getWatchProviders(type, id, region = "IN") {
    if (type !== "movie") return null;
    const data = await tmdb.getWatchProviders(id, region);
    if (!data) return null;
    const m = (arr?: tmdb.WatchProvider[]) =>
      (arr || []).map((p) => ({ name: p.provider_name, logo: tmdb.posterUrl(p.logo_path, "w92") }));
    return {
      link: data.link,
      streaming: m(data.flatrate),
      rent: m(data.rent),
      buy: m(data.buy),
    };
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
