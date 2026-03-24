# CineTrack — Realistic Improvements Roadmap

## ✅ Already Done
- TMDB database migration
- Search by actor name + partial/misspelled words
- Clickable suggestion chips
- Vercel Analytics + brute-force protection + Firebase security rules

## 🟢 Phase 1 — Quick Wins (free, 1-2 hrs each)
| # | Feature | TMDB Endpoint | Effort |
|---|---------|--------------|--------|
| 1 | Trending Movies on homepage | `/trending/movie/week` | ~1 hr |
| 2 | Recommendations on detail page | `/movie/{id}/recommendations` | ~1 hr |
| 3 | OTT streaming provider links | `/movie/{id}/watch/providers` | ~1 hr |
| 4 | Release status display | Already in movie details | ~30 min |

## 🟡 Phase 2 — Medium Effort (free)
| # | Feature | How | Effort |
|---|---------|-----|--------|
| 5 | Google Login | Firebase Auth (already set up) | ~3 hrs |
| 6 | Shareable watchlist link | Public route + Firestore reads | ~2 hrs |
| 7 | Books tracking | Google Books API / Open Library | ~4 hrs |
| 8 | Simple movie comments | Firestore sub-collection | ~3 hrs |

## 🔴 Phase 3 — Skip for Now (needs paid infra)
| # | Feature | Why Skip |
|---|---------|----------|
| 9 | Watch together | Needs WebSocket server, video sync — separate product |
| 10 | Full social chat | Needs real-time messaging + moderation |
| — | Ads | Wait until 1000+ daily users; add Patreon link instead |
