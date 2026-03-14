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
  vote_average?: number;
  overview?: string;
  genre_ids?: number[];
  // Person fields
  name?: string;
  profile_path?: string | null;
  known_for_department?: string;
  known_for?: TMDBSearchResult[];
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
    results: { key: string; site: string; type: string; name: string }[];
  };
}

// --- Genre Map ---

const GENRE_MAP: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
  80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
  14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
  9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 10770: "TV Movie",
  53: "Thriller", 10752: "War", 37: "Western",
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

// --- Movie Details ---

export async function getMovieDetails(id: string | number): Promise<TMDBMovieDetail | null> {
  const res = await fetch(
    `${BASE}/movie/${id}?api_key=${apiKey()}&append_to_response=credits,videos`
  );
  if (!res.ok) return null;
  return res.json();
}

// --- Conversion to our Movie interface ---

export function tmdbToMovie(t: TMDBSearchResult): Movie {
  return {
    imdbID: String(t.id),
    Title: t.title || t.name || "Unknown",
    Year: t.release_date?.split("-")[0] || "N/A",
    Poster: posterUrl(t.poster_path),
    imdbRating: t.vote_average ? t.vote_average.toFixed(1) : "N/A",
    Genre: t.genre_ids?.map((id) => GENRE_MAP[id] || "").filter(Boolean).join(", ") || undefined,
    Plot: t.overview || undefined,
    Type: "movie",
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

// --- Get trailer YouTube ID from TMDB videos ---

export function getTrailerKey(detail: TMDBMovieDetail): string | null {
  const vids = detail.videos?.results || [];
  // Prefer official trailer
  const trailer = vids.find((v) => v.site === "YouTube" && v.type === "Trailer")
    || vids.find((v) => v.site === "YouTube" && v.type === "Teaser")
    || vids.find((v) => v.site === "YouTube");
  return trailer?.key || null;
}
