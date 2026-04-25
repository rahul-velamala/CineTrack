# CineTrack — Practical Issues & Product Brainstorm

> Snapshot date: 2026-04-25. Generated after Phase 9 ship (`65058a5`).
> Purpose: dump of every friction point a real user will hit, organized by surface and priority. Source for follow-up phases.

---

## How to read this doc

- **P0** — blocks usability or growth, ship next
- **P1** — strong upgrade, schedule soon
- **P2** — polish, when time allows
- **P3** — long-tail / nice-to-have

Each item: *what's wrong → fix idea → effort sketch.*

---

## 1. Friend discovery (user-flagged)

**Problem:** Only path = ask friend their handle, type it. Easy to typo. Easy to send to wrong person. No name search. No avatar preview before sending. Painful at scale.

| # | Idea | Priority | Effort |
|---|------|---|---|
| 1.1 | **Profile preview while typing** — as user types `@han...`, show live avatar + display name + handle so they confirm right person before clicking Send | P0 | S |
| 1.2 | **Public profile pages** at `/u/[handle]` showing avatar, name, public watchlist preview, "Add friend" button | P0 | M |
| 1.3 | **Shareable invite link** — `https://cinetrack.app/u/@rahul?invite=1` — share via WhatsApp/SMS. Receiver lands on public profile with prefilled "Add" button | P0 | S (after 1.2) |
| 1.4 | **QR code on your profile** — generate QR for own profile URL. Friend scans → opens profile → adds. Works at parties/in person | P1 | S |
| 1.5 | **Fuzzy search by display name** — currently exact handle only. Add server-side handle prefix + name search. Firestore can't fuzzy by default; either denormalize lowercase tokens or use Algolia (paid) — start with prefix-match on `handle` and `displayName_lower` fields | P1 | M |
| 1.6 | **Mutual friends suggestion** — "@rahul, @priya are friends with you and @kiran" | P2 | M |
| 1.7 | **Recent inbox senders** — auto-suggest sending friend request to anyone who recently sent you a rec | P1 | S |
| 1.8 | **Phone/email contact lookup** — opt-in. Privacy heavy, skip until growth pressure | P3 | L |

---

## 2. Chat between friends (user-flagged)

**Problem:** Currently no DM channel. Inbox = one-shot recs only. No back-and-forth. No "thanks", "did you watch yet?", "rate it", etc.

### Architecture

**Pick: Firestore.** Free tier covers it. Real-time built-in. No new infra.

```
chats/{chatId}: {
  participants: [uidA, uidB] (sorted),
  lastMessage: string,
  lastAt: timestamp,
  unread: { [uid]: count }
}

chats/{chatId}/messages/{msgId}: {
  fromUid: string,
  text: string,
  type: "text" | "rec" | "system",
  recPayload?: { tmdbId, mediaType, title, posterUrl, year },
  at: timestamp,
  readBy?: [uid, ...]   // for read receipts
}
```

**chatId = sorted([uidA, uidB]).join("_")** — deterministic, no collisions.

### Features (P0 = MVP)

| # | Feature | Priority |
|---|---|---|
| 2.1 | Text messages, real-time | P0 |
| 2.2 | Send a movie/show inline as rec card | P0 |
| 2.3 | Unread count per chat | P0 |
| 2.4 | Last-seen timestamp / read receipts | P1 |
| 2.5 | "View profile" / "Unfriend" from chat header | P1 |
| 2.6 | Typing indicator | P2 (cost: Firestore presence is expensive) |
| 2.7 | Image attachments | P2 (needs Firebase Storage — free 5GB) |
| 2.8 | Reactions (👍 ❤️ 🔥) on messages | P2 |
| 2.9 | Reply-to-message threading | P3 |
| 2.10 | Voice notes / video calls | P3 (skip — out of scope) |

### UI surfaces

- `/chat` — list of conversations (last message preview, unread badge, sorted by lastAt)
- `/chat/[chatId]` — thread view (messages, input bar, header with friend info)
- Inbox stays separate (formal rec acceptance flow); Chat is casual DM
- Navbar adds **Chat** link with unread badge (sum of all chats' unread counts for self)
- "Send to friend" modal can chain into chat: "send + open chat?"
- Long message truncation in list, expand on tap

### Rules

```
match /chats/{chatId} {
  allow read, update: if request.auth != null
                      && request.auth.uid in resource.data.participants;
  allow create: if request.auth != null
                && request.auth.uid in request.resource.data.participants
                && request.resource.data.participants.size() == 2;

  match /messages/{msgId} {
    allow read: if request.auth != null
                && request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;
    allow create: if request.auth != null
                  && request.auth.uid == request.resource.data.fromUid;
    allow update: if request.auth != null
                  && request.auth.uid == resource.data.fromUid;
    allow delete: if request.auth != null
                  && request.auth.uid == resource.data.fromUid;
  }
}
```

### Cost watchout

Each chat thread polled = 1 listener per open chat. Free tier = 50k reads/day. If 100 active users send 5 messages/day each = 500 writes + ~5000 reads/day. Comfortable.

---

## 3. Profile / identity

| # | Issue | Fix | Priority |
|---|------|-----|---|
| 3.1 | No public `/u/[handle]` profile page | Build it (covers 1.2) | P0 |
| 3.2 | Cannot edit display name, photo, bio | Settings page `/settings` with form, write to `users/{uid}` | P0 |
| 3.3 | Cannot change handle once claimed | Allow handle change w/ cooldown (e.g. 30 days). Re-claim transaction releases old handle | P1 |
| 3.4 | HandlePicker is forced — blocks personal-only users | Make optional. Only require handle when user initiates first social action (send friend req, share list) | P1 |
| 3.5 | No bio / favorite genres / pinned movies on profile | Optional bio field, 5 pinned-titles, top-genres derived from watched | P2 |
| 3.6 | Reserved handle list too aggressive (`me`, `you`, common names) | Audit list, allow most | P2 |
| 3.7 | Handle squatting (claim popular handles to scalp) | Detect inactive (>180 days, 0 social) and add reclaim flow | P3 |

---

## 4. Watchlist & Watched UX

| # | Issue | Fix | Priority |
|---|------|-----|---|
| 4.1 | No personal rating after watching | 5-star or thumbs picker on "Mark Watched" | P0 |
| 4.2 | No review note per item | Optional 500-char review field | P1 |
| 4.3 | No filter / sort within lists | Filter by mediaType, genre, year. Sort by date-added, rating, alphabetic | P0 |
| 4.4 | No search within own lists | Search bar above grid filters by title | P1 |
| 4.5 | No bulk actions | Multi-select → bulk delete / bulk move to watched | P2 |
| 4.6 | No rewatch counter | Increment counter on re-mark | P2 |
| 4.7 | No "why I want to watch" private note | Add notes field, distinct from public review | P2 |
| 4.8 | No import from Letterboxd / Trakt / IMDb | Build CSV import, match titles via TMDB | P1 |
| 4.9 | No shareable list URL | `/u/[handle]/watchlist` public route | P1 |
| 4.10 | Watched list grows forever — no archive | "Years" navigation: 2023 watched, 2024, etc. | P3 |
| 4.11 | TV: only series-level tracking | Episode tracker: `S2E5` progress marker | P1 |
| 4.12 | No "next episode airing" reminder | Cron + email/push on first-air-day | P2 |

---

## 5. Recommendations

| # | Issue | Fix | Priority |
|---|------|-----|---|
| 5.1 | Cold-start = 5-item gate | Onboarding: pick 5 favorite movies on first launch | P1 |
| 5.2 | No "not interested" feedback | Hide button on rec cards → blacklist → exclude future | P1 |
| 5.3 | No explanation ("because you watched X") | Track which seed produced top score, surface | P2 |
| 5.4 | Recs cache local — switching devices recomputes | Move cache to Firestore TTL doc when authed | P2 |
| 5.5 | TV recs sparse | Add genre-based discovery for TV cold-start | P2 |
| 5.6 | No editorial picks ("Critics' Choice", "Hidden Gems") | Curate manually, reuse Phase 7 lists | P2 |
| 5.7 | No upcoming-release prediction ("you'll like Dune 3 when it drops") | Watchlist-aware release-radar | P3 |

---

## 6. Discovery / Browse

| # | Issue | Fix | Priority |
|---|------|-----|---|
| 6.1 | Trending only — no genre filters | `/discover?genre=horror` page. TMDB `/discover` endpoint | P0 |
| 6.2 | No language filter (Hindi, Tamil, Korean) | `/discover?lang=hi` | P0 |
| 6.3 | No "Coming soon" / "In theaters" | TMDB `/movie/upcoming`, `/movie/now_playing` | P1 |
| 6.4 | No release-day notifications for watchlist | Cron + push (P1) | P1 |
| 6.5 | No by-decade / "best of 2010s" curated | Manual lists (Phase 7) | P2 |
| 6.6 | No "based on a true story", "won an Oscar" filters | Tag system, manual curate | P3 |

---

## 7. Watch providers (OTT)

| # | Issue | Fix | Priority |
|---|------|-----|---|
| 7.1 | Region locked to IN/US fallback | Auto-detect via IP geolocation, allow user override in settings | P0 |
| 7.2 | No "available now" badge on poster | Compute from cached providers, show 📺 Netflix overlay | P1 |
| 7.3 | Cannot filter watchlist by "available on Netflix" | Add provider filter to watchlist | P1 |
| 7.4 | No personal subscription tracking ("I have Netflix + Prime") | Settings: subscriptions → highlight matches in watch-providers | P2 |

---

## 8. Onboarding & first-run

| # | Issue | Fix | Priority |
|---|------|-----|---|
| 8.1 | Land on /home — no orientation | First-visit modal: "Try a search → trailer → watchlist → done" | P1 |
| 8.2 | No "what is this app" landing for shared invite link | If query has `?invite=...`, show explainer card | P1 |
| 8.3 | Sign-in not pushed for guests after 3 movies added | Soft prompt: "Save your watchlist across devices" toast w/ Sign-in CTA | P1 |
| 8.4 | HandlePicker blocking instead of contextual | See 3.4 | P1 |
| 8.5 | No empty-state copy on /watchlist for first-timer | "Search for movies → tap +Watchlist → they appear here" | P2 |

---

## 9. Notifications

| # | Issue | Fix | Priority |
|---|------|-----|---|
| 9.1 | No notification when friend sends rec / msg | Web push (Firebase Cloud Messaging — free) + browser notifications API | P1 |
| 9.2 | No email digest | Weekly: "5 new in your For You" + activity. Use Firebase Functions + Resend free tier or Cloud Scheduler | P1 |
| 9.3 | No release-day reminder | Cron job checks upcoming watchlist → push | P2 |
| 9.4 | No friend-activity feed | "Priya watched Inception last night" (privacy-controlled) | P2 |

---

## 10. Privacy / Safety

| # | Issue | Fix | Priority |
|---|------|-----|---|
| 10.1 | All `/users/{uid}` docs publicly readable | Toggle `profilePublic: bool`. Rule: read public if true, owner only otherwise | P0 |
| 10.2 | Notes in inbox = abuse vector | Filter profanity client + server, char limit OK already (280) | P1 |
| 10.3 | No block / report | Add `users/{uid}/blocked/{otherUid}`. Rules deny friend-edge create when blocked | P0 |
| 10.4 | Spam friend requests possible | Rate limit: max 20 outgoing pending per user; auto-decline after 30d | P1 |
| 10.5 | No account delete (GDPR) | Settings → Delete account → confirm → cascade delete | P1 |
| 10.6 | No data export | Settings → Export → JSON download of own data | P2 |

---

## 11. Mobile UX

| # | Issue | Fix | Priority |
|---|------|-----|---|
| 11.1 | Modals as desktop centered card on mobile | Bottom-sheet style, swipe-down to dismiss | P0 |
| 11.2 | No bottom-tab nav | iOS-style bottom nav for mobile (Search / Watchlist / Inbox / Chat / Me) | P0 |
| 11.3 | 3D tilt = desktop only (correct) | Add subtle press-state on mobile instead | P2 |
| 11.4 | Swipe gestures missing | Swipe-left on watchlist item → mark watched | P2 |
| 11.5 | Top navbar takes too much vertical space | Mobile: collapse to icon-only bar | P1 |

---

## 12. Performance

| # | Issue | Fix | Priority |
|---|------|-----|---|
| 12.1 | Cold home load = many TMDB calls | Server-side pre-render trending + getTrendingAll cached | P1 |
| 12.2 | localStorage cache grows unbounded | Periodic prune of stale recs cache (>30d) | P2 |
| 12.3 | No service worker for offline | PWA support — manifest + workbox-style caching | P2 |
| 12.4 | Image-heavy detail page | LQIP / blur placeholders | P2 |

---

## 13. Accessibility

| # | Issue | Fix | Priority |
|---|------|-----|---|
| 13.1 | Indigo-on-near-black contrast may fail WCAG AA | Audit + tweak shades | P0 |
| 13.2 | Lucide icon-only buttons may lack aria-label | Audit, add labels | P1 |
| 13.3 | Toasts not announced to screen readers | role="status" + aria-live | P1 |
| 13.4 | 3D tilt could disorient | Already respects prefers-reduced-motion | done |
| 13.5 | Modal focus-trap missing | When modal opens, trap Tab cycling inside | P1 |

---

## 14. DevOps / engineering hygiene

| # | Issue | Fix | Priority |
|---|------|-----|---|
| 14.1 | Firestore rules manual republish each phase | Add Firebase CLI deploy script + GH Actions | P1 |
| 14.2 | No tests | Playwright e2e for critical flows (auth, search, send-rec) | P1 |
| 14.3 | No error monitoring | Sentry free tier or Vercel built-in error tracking | P1 |
| 14.4 | No analytics beyond Vercel basic | PostHog (free 1M events/mo) or Plausible self-host | P2 |
| 14.5 | All env vars NEXT_PUBLIC_* | Move sensitive ones to server-only when API routes added | P2 |
| 14.6 | No Firestore emulator | `firebase emulators:start` for safe local testing | P2 |
| 14.7 | No A/B framework | GrowthBook free tier or feature-flag util | P3 |

---

## 15. Commercialization (eventual)

| # | Issue | Fix | Priority |
|---|------|-----|---|
| 15.1 | TMDB hobby tier blocks monetization | Apply for commercial license OR swap to Watchmode/OMDb | P0 (when revenue starts) |
| 15.2 | No pricing page / premium tier | Future: "Pro" = unlimited friends, ad-free, multi-device, priority recs | P2 |
| 15.3 | No Stripe / payments | Future | P3 |
| 15.4 | No referral program | Phase 12+ | P3 |

---

## Suggested next 3 phases (my call)

### Phase 10 — Friend discovery overhaul + public profiles
- Items: 1.1, 1.2, 1.3, 1.4, 1.7, 3.1, 3.2, 3.4
- Effort: ~4-6 hrs of build
- Ships: profile preview in friend search, `/u/[handle]` public profile, `/settings`, shareable invite links, QR codes, recent senders suggestion, optional handle (no longer forced)

### Phase 11 — Chat between friends
- Items: 2.1–2.5
- Effort: ~5-7 hrs
- Ships: `/chat` list, `/chat/[id]` thread, real-time messages, send-rec inline, unread badges, read receipts

### Phase 12 — Watchlist polish
- Items: 4.1, 4.3, 4.4, 6.1, 6.2, 7.1
- Effort: ~3-4 hrs
- Ships: rating + review, watchlist filter/sort/search, discover-by-genre, language filter, region auto-detect

After phases 10-12: pause for feedback. Then prioritize from this doc based on real user pain.

---

## Items that need user decision (need your input)

- **Privacy default:** profile public or private out of the box?
- **Chat scope:** text-only MVP or also images at launch?
- **Handle change cooldown:** 30 days OK?
- **Notification channel:** web push only, or also email digest?
- **Onboarding 5 favorites:** required or skippable?
- **Rating system:** stars, thumbs, or 1-10 scale?
