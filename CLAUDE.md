# CineTrack — project rules for Claude Code

This file auto-loads at session start. Read all of it before responding.

---

## Mandatory: update plan after each step

After **every** step that ships code, you MUST update progress tracking before the user has to ask:

1. Mark the corresponding row in `REVAMP_PLAN.md` status table (✅ done with commit hash, 🟡 in_progress, ⏸️ deferred, 🔴 blocked).
2. If the step revealed a new issue or follow-up, append it to `BRAINSTORM_ISSUES.md` under the right surface heading.
3. Commit the plan-doc edits in the **same commit as the code change**, not a separate one. (One PR, one commit, one update — atomic state.)

Do not consider a phase "done" until:
- Code builds clean (`next build`)
- Code is committed + pushed to `main`
- Plan doc reflects the new commit hash + ✅ status
- User has been told what to test

Never silently skip the plan update. If you're unsure where a step belongs in the plan, add it as a sub-bullet rather than dropping it.

---

## Workflow rules

- **Phased delivery.** One scoped phase per cycle. Plan → ship → commit → push → wait for user test/approve. Never combine multiple plan phases into one PR.
- **Before starting any phase**, read `REVAMP_PLAN.md` (current status) and `BRAINSTORM_ISSUES.md` (priority queue). Don't reinvent items already tracked.
- **Free tier hard rule:** $0 budget. No paid services without explicit approval. Firebase Spark, TMDB hobby, Vercel free, open-source libs only.
- **Hosting portability:** no Vercel-only APIs (`@vercel/blob`, `@vercel/kv`, `@vercel/postgres`, Runtime Cache, Queues, Sandbox). Allowed: `@vercel/analytics` and `@vercel/speed-insights` only (one-line removable).
- **Caveman mode** is active in this project. Terse responses for chat. Code, commit messages, PR bodies stay normal English.
- **Confirm before destructive ops** — force push, dropping data, deleting branches, schema migrations.
- **Use specialized tools** (Read, Edit, Glob, Grep) over shell. Reserve Bash for git + npm + build only.

---

## Living docs (read first, update last)

| File | Purpose | When to update |
|---|---|---|
| `REVAMP_PLAN.md` | Phase status table + commit hashes + locked decisions | Every phase ship |
| `BRAINSTORM_ISSUES.md` | Friction inventory + priority + roadmap proposals | When new issues surface; before each phase plan |
| `SESSION_CONTEXT.md` | Fresh-session bootstrap (stack, codebase map, decisions) | End of major sessions, after big shifts |
| `firestore.rules` | Live security rules | When data model changes (republish to Firebase console manually) |

Do not create new top-level planning docs without user approval. Add to the existing three.

---

## Stack snapshot

Next.js 16 App Router · React 19 · Tailwind v4 · framer-motion 12 · lucide-react 1 · Firebase Auth + Firestore · TMDB hobby tier.

Repo: `https://github.com/rahul-velamala/CineTrack` (default branch `main`, force-push not allowed).

---

## When you (Claude) resume cold

1. Read `REVAMP_PLAN.md` status table → know what's shipped
2. Read `BRAINSTORM_ISSUES.md` → know pending work + priorities
3. Read `SESSION_CONTEXT.md` → stack + decisions + tone
4. Run `git log --oneline -10` → confirm latest commits match plan table
5. Ask user which phase next. Don't assume.

If `REVAMP_PLAN.md` is missing a commit hash for a phase the git log shows as shipped, fix it before doing anything else.

---

## Firebase console (auth troubleshooting first-line check)

Auth bugs reported by user are almost always console misconfiguration. Verify these 4 before touching code:

1. Auth → Sign-in method → **Google = Enabled** (with support email set)
2. Auth → Sign-in method → **Email/Password = Enabled** + **Email link (passwordless)** ticked
3. Auth → Settings → Authorized domains: prod URL whitelisted
4. Firestore → Rules → matches repo's `firestore.rules` + **Published**

---

## Communication preferences

- Caveman mode active. Terse, drop articles + filler. Code/commits/PRs/security warnings stay normal English.
- User is solo dev/owner. Practical. Wants tradeoffs in plain terms, not deep TS internals.
- Phased shipping is the default. Do not surprise-bundle features.
- After shipping a phase: list smoke-test steps, ask "go phase N+1" or "test first". Don't auto-proceed.
