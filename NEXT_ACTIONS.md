# Next Actions

Updated 2026-08-15 after the Next.js 16 upgrade (unplanned — happened via a
local `npm install`, not a deliberate migration) and the homepage redesign.
All work so far is on `development`, tracked by PR #82 into `main`. This file
is a living plan — update it as items are done or reprioritized.

## Do these first

- [ ] **Merge PR #82** (`development` → `main`) once reviewed. It bundles the
      security/dependency audit, the tournament auto-start cron fix, the
      Next.js 16 upgrade and everything it broke (route protection via
      `proxy.ts`, `images.remotePatterns`), and the homepage redesign.
- [ ] **Rotate the Steam Web API token** that was hardcoded in
      `cs-docker/docker-compose.yml` (`SRCDS_TOKEN`) and committed to git
      history since `2b7e55e`. It's now read from an env var in the working
      tree, but the old value is still recoverable from git history — treat it
      as burned and get a new one from Steamworks.
- [ ] **Smoke-test against a real deployment, not just local dev**:
      session/permission checks were added to several previously-open API
      routes; `GET /api/tournaments/check-start` moved to its own route file
      (it used to 404); and `src/proxy.ts` replaced a broken next-auth
      middleware integration that Next 16 silently failed to load (route
      protection for `/admin` and `/profile` was down until this was caught).
      All verified locally (`npm run build`/`npm test`/`npm run dev` against
      the real Postgres in `.env`, including confirming `/admin` redirects
      when unauthenticated) but not against a live Steam OAuth round-trip or
      an actual cron invocation — do both before relying on this in
      production. Set `CRON_API_KEY` and/or `CRON_SECRET`, and enable either
      `vercel.json`'s cron or `.github/workflows/check-tournaments.yml` (not
      both).
- [ ] **Decide on Convex auth**: `convex/notifications.ts` has no identity
      checks at all — every query/mutation trusts a client-supplied `userId`.
      Fixing this properly requires wiring Convex Auth (or passing a verified
      NextAuth JWT into the Convex client) — bigger scope than a quick patch.
      Until it's fixed, treat notification data as not access-controlled.

## Security / infra gaps

- [ ] **No CI on PRs** for build+test+lint (separate from the tournament
      auto-start cron workflow, which only calls one endpoint). Add a
      `.github/workflows/ci.yml` running install + lint + test + build on
      every PR — would have caught the lint errors that were silently failing
      `next build` before an earlier pass fixed them, and would catch a repeat
      of the Next 16 proxy breakage class of bug going forward.
- [ ] **No dependency update automation** (no Dependabot/Renovate config).
      Add a `.github/dependabot.yml` for npm with at least a weekly schedule.
      Also worth pinning Next to a specific minor range (`~16.3.1` rather than
      `^16.3.1`) if unplanned major bumps like this one are unwanted —
      `npm install <pkg>` without a version always grabs latest regardless of
      the semver range in `package.json`.
- [ ] **`next-auth` v4 → v5 migration**: still on v4, which is unmaintained
      and wasn't updated for Next 16 (hence the `proxy.ts` workaround for
      `next-auth/middleware`, and the `uuid` vulnerability pinned inside v4
      that couldn't be patched around). Genuine breaking migration, plan it as
      its own project rather than another forced-by-upgrade scramble.

## Stale branches (cleanup)

- `origin/feat/add-automated-matches` is fully merged (PR #80) — safe to
  delete.
- `feature/ui-upgrade` was merged into `development` and deleted locally.

## Open GitHub issues (4 open)

- **#69** — `InvitePlayerDialog` should fetch on demand instead of
  prefetching.
- **#68** — adopt Partial Prerendering (PPR) — now that the app is actually on
  Next 16, this is worth revisiting sooner than previously thought.
- **#42** — "add matches support" — largely superseded by the tournament
  automation work merged in PR #80 and commits since; worth re-reading against
  current state and likely closing or narrowing rather than actioning as-is.
- **#24** — player statistics (kills/deaths/KD/HLTV rating) — a genuinely
  substantial feature (stats data model, ingestion from match/game server
  data, UI), not a quick add.

Closed: #9, #49, #66 (already implemented, no change needed), #67, #71, #81
(cron routing bug, found and fixed same day it was filed).

**Note on disclosure**: this repo is public. Security-vulnerability fixes
(broken access control across several API routes) were described in commit
messages but deliberately **not** filed as public GitHub issues, since a
detailed public issue describing an exploit is itself a disclosure risk for
anyone running an unpatched fork/clone.

**Note on the homepage**: the embedded stream is still a fixed YouTube video
ID, not tied to any tournament data — there's no `streamUrl`-type field on
`Cs2Tournament` yet. If per-tournament live streams are wanted, that's a
schema change (migration) plus organizer-facing UI to set it, not a quick
follow-up.

## Suggested prioritization

1. **Now**: merge PR #82, rotate the Steam token, smoke-test against a real
   deployment (Steam OAuth + the cron endpoint).
2. **Next**: add CI (build+test+lint on PR) and Dependabot — would have caught
   both the pre-existing lint failures and the unplanned Next 16 bump.
3. **Medium-term**: decide on Convex auth approach; plan the next-auth v4→v5
   migration as its own scoped change with real testing.
4. **Longer-term / product**: per-tournament stream URLs, player statistics
   (#24), PPR adoption (#68), InvitePlayerDialog refactor (#69), triage #42.

## Reference

- Security/dependency/quality audit, cron fix, Next.js 16 migration, homepage
  redesign: `development` branch, tracked by PR #82.
- Architecture and dev commands: `CLAUDE.md`.
- Role/permission model and API contracts: `ROLE_AND_API_GUIDE.md`.
- Tournament automation and game-server integration: `TOURNAMENT_GUIDE.md`.
