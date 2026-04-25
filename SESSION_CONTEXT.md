# CineTrack — Session Context

> Read this first if you're a Claude session picking up cold.
> Goal: get to productive in 60 seconds.

Last updated: 2026-04-25, after Phase 9 ship (`65058a5`).

---

## TL;DR

**CineTrack** is a personal movie + TV tracking webapp. Owned by **Rahul Velamala** (`rahul.velamala@gmail.com`).
Originally built with Google Antigravity. Now in V3 revamp.
9 phases shipped. Plan + brainstorm of remaining work in `REVAMP_PLAN.md` and `BRAINSTORM_ISSUES.md`.

User wants: premium feel, free tier only, portable (will leave Vercel later), commercial-ready (eventually).

---

## Stack

| Layer | Pick | Why |
|---|---|---|
| Framework | Next.js 16 App Router | already here |
| React | 19.2 | latest |
| Styling | Tailwind v4 | already here |
| Animation | framer-motion 12 | premium feel, free, portable |
| Icons | lucide-react 1 | clean iconography |
| Auth | Firebase Auth (Google + Email Link) | free, Spark plan |
| DB | Firestore | free tier, real-time |
| Media API | TMDB | free hobby tier |
| Hosting | Vercel (now), Cloudflare/Netlify/Render later | portability tracked |
| Analytics | Vercel Analytics + Speed Insights | thin, removable |

**Hard rule:** no `@vercel/blob`, `@vercel/kv`, `@vercel/postgres`, no Vercel Runtime Cache. Standard Next.js + Firebase only. Removable from Vercel any time.

---

## Codebase map

```
src/
  app/
    layout.tsx              AppProvider + ToastProvider mount
    page.tsx                redirect to /home
    home/page.tsx           hero + 3D strip + recs + trending
    search/page.tsx         results page (filters, sort, pagination, keyword fallback)
    title/[type]/[id]/      canonical detail (movie | tv) — uses TitleDetail
    movie/[id]/             back-compat thin wrapper over TitleDetail (type=movie)
    person/[id]/            person profile + filmography
    watchlist/              user's watchlist
    watched/                user's watched
    friends/                friend management (3 tabs)
    inbox/                  rec inbox
    finish-signin/          email-link auth callback

  components/
    Navbar.tsx              top nav, scroll-aware, lucide icons, badges
    SearchBar.tsx           dropdown + Enter→/search + recent searches
    MovieCard.tsx           3D tilt + glare + toast hooks
    TitleDetail.tsx         shared detail UI (movie/tv aware)
    TrailerModal.tsx        portal fullscreen modal w/ tabs + keyboard
    AuthModal.tsx           Google + email link signin
    HandlePicker.tsx        forced handle picker after first login (NOTE: see Phase 10)
    UserMenu.tsx            avatar dropdown
    SendToFriendModal.tsx   pick friend + note → write to inbox
    Toast.tsx               ToastProvider + useToast hook
    Poster3DStrip.tsx       auto-scroll perspective marquee on home

  context/
    AppContext.tsx          single global store: watchlist, watched, user, profile,
                            friends, inbox, counts, all CRUD + auth methods

  lib/
    firebase.ts             auth + db init
    auth.ts                 Google + email link helpers
    userStore.ts            user doc + handle registry + migration
    socialStore.ts          friends + inbox + handle resolution
    media.ts                provider-agnostic abstraction over TMDB
    tmdb.ts                 raw TMDB calls (don't import from components — use media)
    recommendations.ts      personal recs engine (client-side)
    recentSearches.ts       localStorage helpers

firestore.rules             Published rules (republish to Firebase console after changes)
REVAMP_PLAN.md              Phase tracker, locked decisions
BRAINSTORM_ISSUES.md        Product issue dump + roadmap proposals
SESSION_CONTEXT.md          THIS FILE
```

---

## Locked decisions

1. **Free tier only.** No Clerk, no paid DB, no paid CDNs.
2. **Guest-first.** App works without login. Sign-in is optional upgrade. localStorage default.
3. **Handle-based identity** (`@handle`). Unique via `handles/{handle}` Firestore registry.
4. **Auth providers:** Firebase Google + Email Link. **Instagram is dead** (Meta deprecated Basic Display API Dec 2024).
5. **Portability:** no Vercel-only APIs. App must run on Cloudflare/Netlify/Render with zero changes.
6. **TMDB hobby tier** = current. Commercial license required before monetization. API abstraction in `lib/media.ts` makes provider swap one-file.
7. **UI palette:** Midnight Cinema (indigo `#6366f1` + magenta `#ec4899` + near-black `#0a0a14`).
8. **3D effects:** mouse-tracked card tilt, parallax hero, perspective auto-scroll strip, layered depth shadows. CSS + framer-motion only. Mobile-safe.

---

## Data model (Firestore)

```
users/{uid}: {
  handle: string,
  displayName, photoURL, email,
  verified: bool,
  createdAt: timestamp,
  watchlist: Movie[],
  watched: Movie[]
}

users/{uid}/friends/{otherUid}: {
  uid, handle, displayName, photoURL,
  status: "pending_out" | "pending_in" | "accepted" | "blocked",
  since: timestamp
}

users/{uid}/inbox/{recId}: {
  fromUid, fromHandle, fromName, fromPhoto,
  tmdbId, mediaType: "movie"|"tv",
  title, year, posterUrl,
  note?, at: timestamp
}

handles/{handle}: { uid, claimedAt }
```

**Key:** `Movie` interface = legacy shape carried from V1 (`imdbID` is actually TMDB id, `Title`, `Year`, `Poster`, `mediaType`). Don't rename — wide blast radius.

---

## Phases shipped (commits)

| Phase | What | Commit |
|---|---|---|
| 0 | Data model + guest-first + media abstraction | `9198e32` |
| 1 | TV / series support | `6238a65` |
| 2 | /search results page + person pages | `0e4db93` |
| 3 | Optional auth + handle registry | `4a0de4a` |
| 4 | Personal recommendations engine | `2f13453` |
| 5 | Trailer fullscreen modal | `b3854f6` |
| 6 | Friends + recommend-to-friend inbox | `90d3b24` |
| 7 | Creator lists | DEFERRED |
| 8 | Motion + lucide + toasts | `a3f3c03` |
| 9 | 3D effects + Midnight Cinema palette | `65058a5` |

---

## Firebase console — required setup (verify before assuming auth works)

- [ ] Authentication → Sign-in method → **Google = Enabled**
- [ ] Authentication → Sign-in method → **Email/Password = Enabled** + check **Email link (passwordless)**
- [ ] Authentication → Settings → Authorized domains: `localhost` + `cinetrack.vercel.app` (and any custom domain)
- [ ] Firestore Database → Rules → matches `firestore.rules` in repo + Published

If user reports auth broken: **make them verify these 4** before debugging code. (Per past resolution — auth bugs were always console config, not code.)

---

## Run / deploy

```bash
# dev
npm run dev          # next dev

# build
npm run build        # next build

# deploy
git push origin main  # auto-triggers Vercel build
```

Repo: `https://github.com/rahul-velamala/CineTrack`
Default branch: `main`. Force-push not allowed.

---

## Known frictions / open issues (top of mind)

See `BRAINSTORM_ISSUES.md` for full list. Highlights:

1. **Friend discovery weak** — handle-only is brittle. Need profile preview, public `/u/[handle]` pages, shareable invite links, QR codes.
2. **No chat** between friends — only one-shot inbox recs. User explicitly asked.
3. **HandlePicker is blocking** — should be optional, prompted only on first social action.
4. **No public profile pages** — `/u/[handle]` is empty 404.
5. **No profile editing** — can't change display name, photo, bio.
6. **No personal rating after watched** — common ask in any tracker.
7. **Watchlist has no filter/sort** — gets unwieldy past 50 items.
8. **No notifications** — friend rec lands in inbox silently.
9. **Privacy:** all profiles public. No toggle.
10. **No block / report.**

User-flagged for next: **friend discovery overhaul + chat**. Proposed in BRAINSTORM as Phase 10 + 11.

---

## Communication preferences

- User prefers **caveman mode** (terse, drop articles/filler). Active by default in this project. Code/commits stay normal English.
- Phased work: ship one phase at a time, commit + push, ask before next.
- Ask permission before destructive ops (force push, dropping data).
- User has not enabled `vercel` CLI globally; deploys via git push.

---

## Memory layout — what each doc is for

| File | Purpose | Update on |
|---|---|---|
| `REVAMP_PLAN.md` | Phase status + commit hashes + locked decisions | every phase ship |
| `BRAINSTORM_ISSUES.md` | Full friction inventory + future roadmap proposals | when new issues surface, before each phase plan |
| `SESSION_CONTEXT.md` | THIS — fresh-session bootstrap | end of each session, after major shifts |
| `firestore.rules` | Live security rules | when data model changes |
| `improvements_cinetrack.txt` | Legacy V1 notes | don't update — historical |
| `realistic_improvements.md` | Pre-V3 roadmap | don't update — historical |

---

## Tasks runtime
TaskCreate is used per phase to track sub-steps. Persist across sessions only via this doc + `REVAMP_PLAN.md` status table — TaskCreate is in-session only.

---

## When you (Claude) resume cold

1. Read `REVAMP_PLAN.md` status table → know what's shipped
2. Read `BRAINSTORM_ISSUES.md` → know what's pending and why
3. Read this file → know stack + decisions + tone
4. Run `git log --oneline -10` → confirm latest commits match table
5. Ask user: which phase next? Don't assume.
