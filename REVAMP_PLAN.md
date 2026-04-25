# CineTrack V3 — Revamp Plan

One phase at a time. Ship, test, move on.

---

## Commercial-use warning (READ FIRST)

Current TMDB key = **hobby tier = non-commercial only**. Monetizing (ads, subs, paid features) violates TMDB ToS.

Before any revenue:
1. Apply for **TMDB commercial license** at themoviedb.org → Settings → API. Small apps often approved free; larger pay tiered fee.
2. If TMDB denies/too costly, fallback APIs (commercial OK, free tier exists):
   - **Watchmode** — free 1k calls/month, $20/mo 10k calls, has streaming providers
   - **OMDb** — $1/mo Patreon = 100k calls/day, movies only, weaker data
   - **Trakt** — free for open-source, commercial needs approval
3. Build **API abstraction layer** now so swap is one-file change. Put all TMDB calls behind `lib/media.ts` interface. Never import `tmdb.ts` directly from components.

**Action in Phase 0:** wrap TMDB in abstraction. Phase 1 extends it. Future swap to Watchmode = swap one adapter, no UI change.

---

## Locked decisions (from user 2026-04-24)

1. **UI target:** premium, clean, interactive, very dynamic. Must be fun to play with. No framework mandate — pick what serves the goal.
2. **Budget: $0.** Free tier only. Firebase Spark, TMDB free, Vercel free. No Clerk, no paid DBs, no paid CDNs, no paid analytics beyond Vercel free.
3. **Friends:** handle-based (`@rahul`). Unique, shareable, indexable.
4. **NOT auth-first.** Guest mode default — localStorage works offline. Login is optional upgrade → syncs to cloud + unlocks social.
5. **Creator lists:** everyone can publish. Popular creators (verified Insta/YouTube) get blue-tick + priority placement. Manual verification to start.
6. **Hosting portability:** plan to leave Vercel later. Avoid Vercel-only lock-ins (Runtime Cache, Blob, Vercel KV, Fluid-only APIs). Standard Next.js + Firebase = runs anywhere (Cloudflare Pages, Netlify, Render, self-host).

---

## Free-tier stack (final)

| Concern | Pick | Why |
|---|---|---|
| Framework | Next.js 16 App Router | already here, runs everywhere |
| Auth | Firebase Auth (Google + email link) | free, already set up, portable |
| DB | Firestore | free 1 GB + 50k reads/day, portable |
| Media API | TMDB | free |
| Hosting | Vercel now, portable later | no Vercel-only APIs |
| UI kit | shadcn/ui (copy-paste, NOT a dep) | free, no lock-in, removable anytime |
| Animation | Framer Motion | free, standard |
| Icons | lucide-react | free |
| Analytics | Vercel Analytics (removable) OR Plausible self-host later | keep abstraction thin |
| Cache | in-memory + Firestore TTL docs (NOT Vercel Runtime Cache) | portable |

**Rule:** no import from `@vercel/*` except Analytics (easy to rip out).

---

## Phase order (locked)

Guest-first → TV → Search page → Optional Auth → Personal recs → Trailer → Friends → Creator lists → UI overhaul.

Auth moved **after** TV + search because guest mode must work first.

---

## Phase 0 — Data model + guest-first persistence (foundation)

- Add `mediaType: "movie" | "tv"` to `Movie`
- Default persistence = **localStorage**. Firestore only if logged in.
- Rewrite `AppContext`:
  - Guest mode: read/write localStorage, no Firebase calls
  - Authed mode: Firestore + localStorage mirror (offline safe)
  - On login: merge localStorage data into Firestore (dedupe by id), clear local guest flag
- Kill passcode logic, but keep `/` as landing (no gate)
- Migration: old passcode users' localStorage still loads

**Done when:** fresh visitor lands on `/home` (no gate), adds to watchlist, refresh keeps data. No Firebase calls made while guest.

---

## Phase 1 — TV & series support

`lib/tmdb.ts` adds:
- `searchTV`, `getTVDetails`, `getTVRecommendations`
- `getTrendingAll` (mixed movie+tv)
- `tmdbTVToMovie` converter (`name`→Title, `first_air_date`→Year, `number_of_seasons`, `number_of_episodes`)

Routing:
- Keep `/movie/[id]` for back-compat
- New canonical: `/title/[type]/[id]` where type ∈ `movie|tv`
- Detail page reads type, fetches right endpoint, shows seasons block for TV

Homepage: Trending uses `/trending/all/week`, posters show TV badge.

**Done when:** Breaking Bad, Dark, Succession all searchable, trackable. Season count visible.

---

## Phase 2 — Search results page + better search

- New `/search?q=&type=&sort=` page
- Filters: All | Movies | TV | People
- Sort: popularity / rating / year
- Pagination (TMDB returns 20/page)
- SearchBar: Enter → pushes to `/search?q=...`. Dropdown stays for quick-nav.
- Typo tolerance: TMDB already fuzzy; add lowercase+trim; on zero-result retry with `/search/keyword`
- Actor click → `/person/[id]` filmography grid
- Recent searches in localStorage (5 max)
- Skeletons, empty state, zero-result suggestions ("did you mean?")

**Done when:** "beraking bad" finds Breaking Bad; `/search?q=tom+cruise&type=tv` works.

---

## Phase 3 — Optional auth (Google + email link)

Still guest-first. Login is a **button in Navbar**, not a gate.

Rationale for Firebase Auth:
- Free unlimited MAU on Spark plan
- Google 1-tap = lowest friction
- Email magic link = no password
- Instagram OAuth not possible (Meta deprecated Basic Display API Dec 2024, Graph API needs business review for personal apps — not free-tier friendly)

Flow:
1. Navbar: `Sign in` button
2. Modal: "Google" + "Email me a link"
3. On success: pick a **unique handle** (Phase 7 uses it)
4. Firestore: `users/{uid}` created with `{ handle, displayName, photoURL, createdAt, verified: false }`
5. Handle registry: `handles/{handle}` → `{ uid }` for O(1) uniqueness check
6. Migrate localStorage watchlist/watched into `users/{uid}`, dedupe by id
7. Navbar shows avatar + sign-out

Firestore rules:
```
match /users/{uid} {
  allow read: if true;  // public profiles for lists/friends
  allow write: if request.auth.uid == uid;
}
match /handles/{handle} {
  allow read: if true;
  allow create: if request.auth != null && !exists(/databases/$(database)/documents/handles/$(handle));
  allow delete: if resource.data.uid == request.auth.uid;
}
```

**Done when:** guest can use app; can upgrade to Google account; data merges; handle claimed uniquely.

---

## Phase 4 — Personal recommendations engine

Pure client-side, no backend.

Algorithm:
1. Gather last 20 watched + full watchlist as "seed" items
2. Fetch TMDB `/recommendations` per seed (cache TTL 7 days in localStorage `recs_cache:{id}`)
3. Score candidate:
   - +2 per watched match, +1 per watchlist match
   - +0.5 × (top-3 genre overlap)
   - −∞ if already in watchlist/watched
4. Return top 30 by score
5. Render "For You" row on `/home` (only if user has ≥5 seed items, else show trending)

**Done when:** heavy user sees personalized row distinct from Trending.

---

## Phase 5 — Trailer page upgrade

- Full-screen modal (portal-mounted), not squashed iframe
- Tabs for multiple videos (Trailer / Teaser / Clip / Behind-the-scenes)
- Language picker (TMDB returns multi-lang)
- Keyboard: `Esc` close, `←/→` prev/next, `M` mute, `Space` play-pause
- Autoplay muted; unmute on click (Chrome policy)
- Fallback: YouTube search deep-link if zero videos
- Framer Motion backdrop fade + modal scale-in

**Done when:** tap poster play → full-screen, keyboard fully functional.

---

## Phase 6 — Friends + recommend-to-friend

Data model:
```
users/{uid}: { handle, displayName, photoURL, verified }
users/{uid}/friends/{friendUid}: { status: "pending"|"accepted", since }
users/{uid}/inbox/{recId}: { fromUid, fromHandle, tmdbId, mediaType, note, at }
handles/{handle}: { uid }
```

Flow:
1. `/friends` page: search by handle, send request
2. Receiver: accept/reject in `/friends` requests tab
3. On title detail page: "Send to friend" → pick from accepted friends → write to their `inbox`
4. `/inbox` page: pending recs list. Accept → add to watchlist. Reject → delete.
5. Navbar badge = inbox count

Firestore rules — scoped cross-user writes:
```
match /users/{uid}/inbox/{recId} {
  allow read, delete: if request.auth.uid == uid;
  allow create: if request.auth != null
    && request.resource.data.fromUid == request.auth.uid;
}
match /users/{uid}/friends/{friendUid} {
  allow read: if request.auth.uid == uid;
  allow create: if request.auth.uid == uid || request.auth.uid == friendUid;
  allow update, delete: if request.auth.uid == uid;
}
```

**Done when:** two test accounts can friend, one recommends, other accepts → shows in watchlist.

---

## Phase 7 — Creator/reviewer lists (everyone publishes)

Data model:
```
lists/{listId}: {
  ownerUid, ownerHandle, title, description,
  items: [{ tmdbId, mediaType, note }],
  tags: ["bollywood","horror"],
  createdAt, updatedAt,
  verified: bool,       // manual blue-tick
  priority: number      // 0=default, 10=featured
}
```

Features:
- `/lists` — feed, sorted by: `verified first → priority → recency`
- `/lists/[listId]` — detail, posters + notes
- `/lists/new` — any logged-in user creates (rate-limit: max 5 lists/day client-side)
- "Apply for verified creator": form → manual approval (you set `verified: true` in Firestore)
- User profile `/u/[handle]` shows their lists

Rules:
```
match /lists/{listId} {
  allow read: if true;
  allow create: if request.auth != null
    && request.resource.data.ownerUid == request.auth.uid;
  allow update, delete: if request.auth.uid == resource.data.ownerUid;
}
```

**Done when:** logged-in user creates list, it appears in `/lists`, verified ones float to top.

---

## Phase 8 — Premium UI/UX overhaul (last)

Goal: feel expensive. Interactive. Dynamic. Fun to touch.

Approach:
- Adopt **shadcn/ui** components (copy-paste, no dep lock — portable with codebase)
- Add **Framer Motion** for:
  - Page transitions (shared-element poster → detail)
  - Card hover tilt (subtle)
  - List item stagger
  - Modal spring physics
- Micro-interactions:
  - "Add to watchlist" button morphs into checkmark
  - Long-press poster → context menu (mobile)
  - Drag poster to watchlist/watched zones on desktop
  - Haptic feedback on mobile (`navigator.vibrate`)
- Visual:
  - Backdrop-blurred hero with poster backdrop parallax on scroll
  - Gradient mesh backgrounds (CSS, no video)
  - Glassmorphism surfaces (already partially there)
  - Type scale: display serif + body sans
  - Dark primary, optional light
- Performance: `next/image` optimized, prefetch on hover, skeleton shimmers

Tools (all free):
- **v0.dev** for quick screen drafts (I can prompt it, hand you URLs)
- **Framer Motion** npm
- **shadcn/ui** CLI init
- **lucide-react** icons
- Custom Tailwind theme tokens

**Done when:** home, detail, search, inbox, lists all feel cohesive + delightful. Ship public.

---

## Portability checklist (so we can leave Vercel later)

- [ ] No `@vercel/blob`, `@vercel/kv`, `@vercel/postgres` imports
- [ ] No Vercel Runtime Cache (use Firestore TTL docs instead)
- [ ] No `vercel.ts`/`vercel.json` features that aren't standard Next.js
- [ ] Keep `next.config.ts` vanilla
- [ ] `@vercel/analytics` isolated to root layout — one-line removal
- [ ] Env vars use `NEXT_PUBLIC_*` prefix (standard, not Vercel-only)
- [ ] Firebase SDK calls work in any Node env
- [ ] Build runs with plain `next build` + `next start`

Target future hosts (all free tier):
- **Cloudflare Pages** (free, generous, Workers for API)
- **Netlify** (free 100GB bandwidth)
- **Render** (free web service)

---

## Pre-Phase-0 checklist (before coding)

- [ ] Confirm `NEXT_PUBLIC_TMDB_API_KEY` works (already set?)
- [ ] Confirm Firebase project exists (already does)
- [ ] Enable Firebase Auth → Google provider in console (needed for Phase 3)
- [ ] Enable Firebase Auth → Email Link provider (needed for Phase 3)
- [ ] Firestore rules file updated per phase (I'll generate)

Phase 0 needs zero console changes. Safe to start.

---

## Status

| Phase | Status | Commit |
|---|---|---|
| 0 — Data model + guest-first | ✅ done | `9198e32` |
| 1 — TV support | ✅ done | `6238a65` |
| 2 — Search page | ✅ done | `0e4db93` |
| 3 — Optional auth | ✅ shipped, **broken in prod** | `4a0de4a` |
| 4 — Personal recs | ✅ done | `2f13453` |
| 5 — Trailer upgrade | ✅ done | `b3854f6` |
| 6 — Friends + inbox | ✅ done | `90d3b24` |
| 7 — Creator lists | ⏸️ deferred (skip per user) | — |
| 8 — UI overhaul (motion + lucide + toasts) | ✅ done | `a3f3c03` |
| **A — Auth fix** | ✅ resolved (console config) | — |
| **9 — 3D + Midnight Cinema palette** | ✅ done | `65058a5` |
| **9.1 — Guest data-loss UX + CLAUDE.md + Insta strategy** | ✅ done | (this commit) |
| **10 — Friend discovery overhaul + public profiles** | ⏳ planned | — |
| **11 — Chat MVP** | ⏳ planned | — |

---

## Phase A — Auth fix (blocker)

User reports: Google + Email sign-in **not working** in production.

Most likely causes (in order of probability):
1. **Firebase Auth providers not enabled in console**
   - Console → Authentication → Sign-in method → Google = Disabled
   - Console → Authentication → Sign-in method → Email Link = Disabled
2. **Authorized domains missing** — Vercel deploy URL not whitelisted
3. **Firestore rules not republished** — `users/{uid}` create denied
4. **Popup blocked** — Google sign-in via `signInWithPopup` browser-blocked
5. **Code bug** — possible but unlikely (build clean)

Debug priority:
- (a) Get console errors from browser DevTools → console
- (b) Verify Firebase console state (3 checkboxes)
- (c) If still broken, swap `signInWithPopup` → `signInWithRedirect` (Safari mobile fails on popup)

---

## Phase 9 — 3D + new color palette

### Color palette options (pick one)

| Option | Vibe | Primary | Accent | Background |
|---|---|---|---|---|
| **A. Midnight Cinema** (current refresh) | Premium, cinematic | Deep indigo `#4f46e5` | Electric magenta `#ec4899` | Near-black `#0a0a14` |
| **B. Neo-Tokyo** | Cyberpunk, neon | Cyan `#06b6d4` | Hot pink `#f472b6` | Charcoal w/ blue tint `#0c0e1a` |
| **C. Aurora** | Soft premium, modern | Mint `#10b981` | Lavender `#a78bfa` | Slate `#0f172a` |
| **D. Sunset Vinyl** | Warm, retro premium | Coral `#fb7185` | Amber `#f59e0b` | Warm dark `#1a0f0d` |
| **E. Custom** | You pick | — | — | — |

**Recommendation:** **B (Neo-Tokyo)** if want truly different. **A (Midnight Cinema)** if want polished evolution. **C (Aurora)** for friendlier mass-market feel.

### 3D scope options (pick subset)

| Effect | Cost | Library | Impact |
|---|---|---|---|
| 1. **Tilt cards on hover** (2D mouse-tracked) | Low | CSS only | Big perceived premium |
| 2. **Parallax hero on scroll** (backdrop slow, foreground fast) | Low | framer-motion `useScroll` | Cinematic feel |
| 3. **Card stack 3D depth on scroll** | Med | framer-motion | Modern Apple-store feel |
| 4. **Hero 3D poster carousel** (rotate-Y, perspective) | Med | CSS perspective | Wow factor on landing |
| 5. **WebGL gradient mesh background** (animated) | Med | shader / `react-three-fiber` | Premium ambient |
| 6. **Full three.js scene** (movie posters in 3D space) | High | `@react-three/fiber` + `drei` | Heavy bundle, mobile risk |
| 7. **Glassmorphism layers w/ depth shadows** | Low | CSS only | Subtle premium |

**Recommendation (free-tier + portable + mobile-safe):** **1 + 2 + 4 + 7**. CSS-only or framer-motion. No heavy WebGL deps. Mobile fast.

**Skip 6** for now — three.js bundles ~200KB, mobile perf risk, complex maintenance.

### Phase 9 tasks (after palette + 3D scope chosen)

- [ ] Apply new palette tokens → `globals.css`
- [ ] Re-skin existing components (cards, modals, buttons, navbar) with new colors
- [ ] Mouse-tracked tilt on `MovieCard` hover (CSS perspective)
- [ ] Parallax hero on `/home` (backdrop slower than content)
- [ ] 3D rotating poster carousel on landing
- [ ] Layered glass with depth shadows on detail pages
- [ ] Verify accessibility (contrast ratios, motion-reduced)

