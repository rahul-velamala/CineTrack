import { Movie } from "@/context/AppContext";

const BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p";

function apiKey() {
  return process.env.NEXT_PUBLIC_TMDB_API_KEY || "";
}

// --- Types ---

export interface TMDBSearchResult {
  id: number;
  media_type?: string;
  // Movie fields
  title?: string;
  release_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  overview?: string;
  genre_ids?: number[];
  // TV fields
  first_air_date?: string;
  origin_country?: string[];
  // Person fields
  name?: string;
  profile_path?: string | null;
  known_for_department?: string;
  known_for?: TMDBSearchResult[];
}

export interface TMDBVideo {
  id?: string;
  key: string;
  site: string;
  type: string;
  name: string;
  iso_639_1?: string;
  iso_3166_1?: string;
  official?: boolean;
  published_at?: string;
  size?: number;
}

export interface TMDBMovieDetail {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  runtime: number;
  genres: { id: number; name: string }[];
  spoken_languages: { english_name: string; iso_639_1: string }[];
  credits: {
    cast: { name: string; character: string; profile_path: string | null }[];
    crew: { name: string; job: string }[];
  };
  videos: {
    results: TMDBVideo[];
  };
}

export interface TMDBTVDetail {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  last_air_date?: string;
  vote_average: number;
  episode_run_time: number[];
  number_of_seasons: number;
  number_of_episodes: number;
  status: string;
  in_production: boolean;
  genres: { id: number; name: string }[];
  spoken_languages: { english_name: string; iso_639_1: string }[];
  credits: {
    cast: { name: string; character: string; profile_path: string | null }[];
    crew: { name: string; job: string; department: string }[];
  };
  videos: {
    results: TMDBVideo[];
  };
  created_by?: { id: number; name: string }[];
  networks?: { id: number; name: string; logo_path: string | null }[];
}

// --- Genre Map ---

const GENRE_MAP: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
  80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
  14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
  9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 10770: "TV Movie",
  53: "Thriller", 10752: "War", 37: "Western",
};

const TV_GENRE_MAP: Record<number, string> = {
  10759: "Action & Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 10762: "Kids",
  9648: "Mystery", 10763: "News", 10764: "Reality", 10765: "Sci-Fi & Fantasy",
  10766: "Soap", 10767: "Talk", 10768: "War & Politics", 37: "Western",
};

// --- Image helpers ---

export function posterUrl(path: string | null | undefined, size: "w92" | "w185" | "w342" | "w500" | "w780" = "w500"): string {
  if (!path) return "/no-poster.svg";
  return `${IMG}/${size}${path}`;
}

export function backdropUrl(path: string | null | undefined): string {
  if (!path) return "";
  return `${IMG}/w1280${path}`;
}

// --- Search ---

export async function searchMulti(query: string): Promise<TMDBSearchResult[]> {
  const res = await fetch(
    `${BASE}/search/multi?api_key=${apiKey()}&query=${encodeURIComponent(query)}&include_adult=false&page=1`
  );
  const data = await res.json();
  return data.results || [];
}

export async function searchMovies(query: string): Promise<TMDBSearchResult[]> {
  const res = await fetch(
    `${BASE}/search/movie?api_key=${apiKey()}&query=${encodeURIComponent(query)}&include_adult=false&page=1`
  );
  const data = await res.json();
  return data.results || [];
}

export async function searchTV(query: string): Promise<TMDBSearchResult[]> {
  const res = await fetch(
    `${BASE}/search/tv?api_key=${apiKey()}&query=${encodeURIComponent(query)}&include_adult=false&page=1`
  );
  const data = await res.json();
  return data.results || [];
}

// --- Paged search (for /search results page) ---

export interface TMDBPagedResponse {
  page: number;
  results: TMDBSearchResult[];
  total_pages: number;
  total_results: number;
}

export async function searchMultiPaged(query: string, page: number = 1): Promise<TMDBPagedResponse> {
  const res = await fetch(
    `${BASE}/search/multi?api_key=${apiKey()}&query=${encodeURIComponent(query)}&include_adult=false&page=${page}`
  );
  const data = await res.json();
  return {
    page: data.page || page,
    results: data.results || [],
    total_pages: data.total_pages || 0,
    total_results: data.total_results || 0,
  };
}

export async function searchMoviesPaged(query: string, page: number = 1): Promise<TMDBPagedResponse> {
  const res = await fetch(
    `${BASE}/search/movie?api_key=${apiKey()}&query=${encodeURIComponent(query)}&include_adult=false&page=${page}`
  );
  const data = await res.json();
  return {
    page: data.page || page,
    results: data.results || [],
    total_pages: data.total_pages || 0,
    total_results: data.total_results || 0,
  };
}

export async function searchTVPaged(query: string, page: number = 1): Promise<TMDBPagedResponse> {
  const res = await fetch(
    `${BASE}/search/tv?api_key=${apiKey()}&query=${encodeURIComponent(query)}&include_adult=false&page=${page}`
  );
  const data = await res.json();
  return {
    page: data.page || page,
    results: data.results || [],
    total_pages: data.total_pages || 0,
    total_results: data.total_results || 0,
  };
}

export async function searchPeoplePaged(query: string, page: number = 1): Promise<TMDBPagedResponse> {
  const res = await fetch(
    `${BASE}/search/person?api_key=${apiKey()}&query=${encodeURIComponent(query)}&include_adult=false&page=${page}`
  );
  const data = await res.json();
  return {
    page: data.page || page,
    results: data.results || [],
    total_pages: data.total_pages || 0,
    total_results: data.total_results || 0,
  };
}

// --- Keyword fallback (fuzzy retry on zero-result) ---

export interface TMDBKeyword {
  id: number;
  name: string;
}

export async function searchKeyword(query: string): Promise<TMDBKeyword[]> {
  const res = await fetch(
    `${BASE}/search/keyword?api_key=${apiKey()}&query=${encodeURIComponent(query)}&page=1`
  );
  const data = await res.json();
  return data.results || [];
}

export async function discoverByKeyword(keywordId: number, page: number = 1): Promise<TMDBPagedResponse> {
  const res = await fetch(
    `${BASE}/discover/movie?api_key=${apiKey()}&with_keywords=${keywordId}&include_adult=false&sort_by=popularity.desc&page=${page}`
  );
  const data = await res.json();
  return {
    page: data.page || page,
    results: (data.results || []).map((r: TMDBSearchResult) => ({ ...r, media_type: "movie" })),
    total_pages: data.total_pages || 0,
    total_results: data.total_results || 0,
  };
}

// --- Person details + filmography ---

export interface TMDBPersonDetail {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  known_for_department: string;
  place_of_birth: string | null;
  profile_path: string | null;
  also_known_as: string[];
}

export interface TMDBPersonCredit extends TMDBSearchResult {
  character?: string;
  job?: string;
  department?: string;
  credit_id?: string;
}

export interface TMDBPersonCombinedCredits {
  cast: TMDBPersonCredit[];
  crew: TMDBPersonCredit[];
}

export async function getPersonDetail(id: string | number): Promise<TMDBPersonDetail | null> {
  const res = await fetch(
    `${BASE}/person/${id}?api_key=${apiKey()}`
  );
  if (!res.ok) return null;
  return res.json();
}

export async function getPersonCombinedCredits(id: string | number): Promise<TMDBPersonCombinedCredits> {
  const res = await fetch(
    `${BASE}/person/${id}/combined_credits?api_key=${apiKey()}`
  );
  if (!res.ok) return { cast: [], crew: [] };
  const data = await res.json();
  return {
    cast: data.cast || [],
    crew: data.crew || [],
  };
}

export function profileUrl(path: string | null | undefined, size: "w185" | "w342" | "h632" = "h632"): string {
  if (!path) return "/no-poster.svg";
  return `${IMG}/${size}${path}`;
}

// --- Movie Details ---

export async function getMovieDetails(id: string | number): Promise<TMDBMovieDetail | null> {
  const res = await fetch(
    `${BASE}/movie/${id}?api_key=${apiKey()}&append_to_response=credits,videos&include_video_language=en,hi,te,ta,ml,null`
  );
  if (!res.ok) return null;
  return res.json();
}

export async function getTVDetails(id: string | number): Promise<TMDBTVDetail | null> {
  const res = await fetch(
    `${BASE}/tv/${id}?api_key=${apiKey()}&append_to_response=credits,videos&include_video_language=en,hi,te,ta,ml,null`
  );
  if (!res.ok) return null;
  return res.json();
}

// --- Trending ---

export async function getTrending(timeWindow: "day" | "week" = "week"): Promise<TMDBSearchResult[]> {
  const res = await fetch(
    `${BASE}/trending/movie/${timeWindow}?api_key=${apiKey()}&page=1`
  );
  const data = await res.json();
  return data.results || [];
}

export async function getTrendingAll(timeWindow: "day" | "week" = "week"): Promise<TMDBSearchResult[]> {
  const res = await fetch(
    `${BASE}/trending/all/${timeWindow}?api_key=${apiKey()}&page=1`
  );
  const data = await res.json();
  return data.results || [];
}

// --- Recommendations ---

export async function getRecommendations(id: string | number): Promise<TMDBSearchResult[]> {
  const res = await fetch(
    `${BASE}/movie/${id}/recommendations?api_key=${apiKey()}&page=1`
  );
  const data = await res.json();
  return (data.results || []).slice(0, 10);
}

export async function getTVRecommendations(id: string | number): Promise<TMDBSearchResult[]> {
  const res = await fetch(
    `${BASE}/tv/${id}/recommendations?api_key=${apiKey()}&page=1`
  );
  const data = await res.json();
  return (data.results || []).slice(0, 10);
}

// --- Watch Providers (OTT links) ---

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface WatchProviderData {
  link?: string;
  flatrate?: WatchProvider[];  // subscription streaming
  rent?: WatchProvider[];
  buy?: WatchProvider[];
}

export async function getWatchProviders(id: string | number, region: string = "IN"): Promise<WatchProviderData | null> {
  const res = await fetch(
    `${BASE}/movie/${id}/watch/providers?api_key=${apiKey()}`
  );
  const data = await res.json();
  return data.results?.[region] || data.results?.["US"] || null;
}

export async function getTVWatchProviders(id: string | number, region: string = "IN"): Promise<WatchProviderData | null> {
  const res = await fetch(
    `${BASE}/tv/${id}/watch/providers?api_key=${apiKey()}`
  );
  const data = await res.json();
  return data.results?.[region] || data.results?.["US"] || null;
}

// Fetch videos separately across ALL languages as fallback
export async function getMovieVideos(id: string | number): Promise<TMDBVideo[]> {
  // Try with no language filter to get everything
  const res = await fetch(
    `${BASE}/movie/${id}/videos?api_key=${apiKey()}`
  );
  const data = await res.json();
  return data.results || [];
}

export async function getTVVideos(id: string | number): Promise<TMDBVideo[]> {
  const res = await fetch(
    `${BASE}/tv/${id}/videos?api_key=${apiKey()}`
  );
  const data = await res.json();
  return data.results || [];
}

export async function getAllVideos(type: "movie" | "tv", id: string | number): Promise<TMDBVideo[]> {
  const vids = type === "tv" ? await getTVVideos(id) : await getMovieVideos(id);
  return vids.filter((v) => v.site === "YouTube");
}

// --- Conversion to our Movie interface ---

export function tmdbToMovie(t: TMDBSearchResult): Movie {
  const mediaType = t.media_type === "tv" ? "tv" : "movie";
  const genreMap = mediaType === "tv" ? TV_GENRE_MAP : GENRE_MAP;
  const dateField = mediaType === "tv" ? t.first_air_date : t.release_date;
  return {
    imdbID: String(t.id),
    Title: t.title || t.name || "Unknown",
    Year: dateField?.split("-")[0] || "N/A",
    Poster: posterUrl(t.poster_path),
    imdbRating: t.vote_average ? t.vote_average.toFixed(1) : "N/A",
    Genre: t.genre_ids?.map((id) => genreMap[id] || "").filter(Boolean).join(", ") || undefined,
    Plot: t.overview || undefined,
    Type: mediaType,
    mediaType,
  };
}

export function tmdbTVToMovie(t: TMDBTVDetail): Movie {
  const creator = t.created_by?.[0]?.name;
  const cast = t.credits?.cast?.slice(0, 5).map((c) => c.name).join(", ");
  const runtime = t.episode_run_time?.[0] ? `${t.episode_run_time[0]} min/ep` : undefined;

  return {
    imdbID: String(t.id),
    Title: t.name,
    Year: t.first_air_date?.split("-")[0] || "N/A",
    Poster: posterUrl(t.poster_path),
    imdbRating: t.vote_average ? t.vote_average.toFixed(1) : "N/A",
    Genre: t.genres?.map((g) => g.name).join(", ") || undefined,
    Plot: t.overview || undefined,
    Language: t.spoken_languages?.[0]?.english_name || undefined,
    Runtime: runtime,
    Director: creator || undefined,
    Actors: cast || undefined,
    Type: "tv",
    mediaType: "tv",
    Seasons: t.number_of_seasons,
    Episodes: t.number_of_episodes,
  };
}

export function tmdbDetailToMovie(t: TMDBMovieDetail): Movie {
  const director = t.credits?.crew?.find((c) => c.job === "Director");
  const cast = t.credits?.cast?.slice(0, 5).map((c) => c.name).join(", ");

  return {
    imdbID: String(t.id),
    Title: t.title,
    Year: t.release_date?.split("-")[0] || "N/A",
    Poster: posterUrl(t.poster_path),
    imdbRating: t.vote_average ? t.vote_average.toFixed(1) : "N/A",
    Genre: t.genres?.map((g) => g.name).join(", ") || undefined,
    Plot: t.overview || undefined,
    Language: t.spoken_languages?.[0]?.english_name || undefined,
    Runtime: t.runtime ? `${t.runtime} min` : undefined,
    Director: director?.name || undefined,
    Actors: cast || undefined,
    Type: "movie",
  };
}

// --- Get trailer YouTube ID from videos array ---

export function findTrailerKey(vids: TMDBVideo[]): string | null {
  // Prefer official trailer, then teaser, then any YouTube video
  const trailer = vids.find((v) => v.site === "YouTube" && v.type === "Trailer")
    || vids.find((v) => v.site === "YouTube" && v.type === "Teaser")
    || vids.find((v) => v.site === "YouTube");
  return trailer?.key || null;
}

export function getTrailerKey(detail: TMDBMovieDetail): string | null {
  return findTrailerKey(detail.videos?.results || []);
}
