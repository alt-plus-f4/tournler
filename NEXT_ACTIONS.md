# Next Actions

Updated 2026-08-14 (second pass, same day) after fixing #9, #49, #66, #67, #71,
and the tournament auto-start cron routing bug (#81). This file is a living
plan — update it as items are done or reprioritized.

## Do these first

- [ ] **Rotate the Steam Web API token** that was hardcoded in
      `cs-docker/docker-compose.yml` (`SRCDS_TOKEN`) and committed to git
      history since `2b7e55e`. It's now read from an env var in the working
      tree, but the old value is still recoverable from git history — treat it
      as burned and get a new one from Steamworks.
- [ ] **Smoke-test the auth fixes and the cron endpoint against a real DB**
      before deploying: session/permission checks were added to several
      previously-open API routes, and `GET /api/tournaments/check-start` moved
      to its own route file (it used to 404 — see #81). Verified via
      `npm run build`/`npm test`/`npm run dev` against the real Postgres in
      `.env` (home page and admin dashboard render correctly), but not against
      a live Steam OAuth round-trip or an actual cron invocation — do that
      before relying on auto-start in production. Set `CRON_API_KEY` and/or
      `CRON_SECRET`, and enable either `vercel.json`'s cron or
      `.github/workflows/check-tournaments.yml` (not both).
- [ ] **Decide on Convex auth**: `convex/notifications.ts` has no identity
      checks at all — every query/mutation trusts a client-supplied `userId`.
      Fixing this properly requires wiring Convex Auth (or passing a verified
      NextAuth JWT into the Convex client) — bigger scope than a quick patch.
      Until it's fixed, treat notification data as not access-controlled.
- [ ] **`sharp` is still on a vulnerable version** (0.33.5, needs ≥0.35.0) —
      left alone deliberately since the fix is a breaking major bump. Schedule
      it as its own change with a manual test of avatar upload / image
      optimization afterward, rather than bundling it into an unrelated PR.
- [ ] **Review/merge `feature/ui-upgrade`**: local branch with the #71/#67
      fixes (eager-loading images behind skeletons, a subtle hero background
      glow) plus a stale-doc correction. Not pushed to origin yet.

## Security / infra gaps

- [ ] **No CI on PRs** for build+test+lint (separate from the tournament
      auto-start cron workflow added this pass, which only calls one
      endpoint). Add a `.github/workflows/ci.yml` running install + lint +
      test + build on every PR — would have caught the lint errors that were
      silently failing `next build` before an earlier pass fixed them.
- [ ] **No dependency update automation** (no Dependabot/Renovate config).
      Add a `.github/dependabot.yml` for npm with at least a weekly schedule.
- [ ] **`next-auth` v4 → v5 migration** is the real fix for the one
      irreducible vuln class (the `uuid` dependency pinned inside next-auth v4
      itself) — v4 is in maintenance mode. Genuine breaking migration, plan it
      as its own project.

## Stale branches (cleanup)

- `origin/development` is 8 commits **behind** `main` with 0 ahead — stale.
  Delete it or fast-forward/rebase it onto `main`.
- `origin/feat/add-automated-matches` is fully merged (PR #80) — safe to
  delete.

## Open GitHub issues (4 open)

- **#69** — `InvitePlayerDialog` should fetch on demand instead of
  prefetching.
- **#68** — adopt Partial Prerendering (PPR) — revisit once the Next.js
  version strategy is settled (PPR's API has moved across Next versions).
- **#42** — "add matches support" — largely superseded by the tournament
  automation work merged in PR #80 and commits since; worth re-reading against
  current state and likely closing or narrowing rather than actioning as-is.
- **#24** — player statistics (kills/deaths/KD/HLTV rating) — a genuinely
  substantial feature (stats data model, ingestion from match/game server
  data, UI), not a quick add.

Closed this pass: #9, #49, #66 (already implemented, no change needed), #67,
#71, #81 (new issue filed and fixed same session — tournament auto-start cron
was 404ing because its handler lived in the wrong route file).

**Note on disclosure**: this repo is public. Security-vulnerability fixes from
the first pass (broken access control across several API routes) were
described in commit messages but deliberately **not** filed as public GitHub
issues, since a detailed public issue describing an exploit is itself a
disclosure risk for anyone running an unpatched fork/clone.

## Suggested prioritization

1. **Now**: rotate the Steam token, decide whether to merge `feature/ui-upgrade`,
   configure and test the cron scheduler for real.
2. **Next**: add CI (build+test+lint on PR) and Dependabot.
3. **Medium-term**: decide on Convex auth approach; plan the next-auth v4→v5
   and `sharp` upgrades as their own scoped changes with manual testing.
4. **Longer-term / product**: player statistics (#24), PPR adoption (#68),
   InvitePlayerDialog refactor (#69), triage #42.

## Reference

- Security/dependency/quality audit: `main` commits from 2026-08-14 (route-
  handler auth fixes, dependency bumps, bracket-generation and
  tournament-service race condition fixes, cron routing fix).
- UI polish: `feature/ui-upgrade` branch, commit `f10f7fa`.
- Architecture and dev commands: `CLAUDE.md`.
- Role/permission model and API contracts: `ROLE_AND_API_GUIDE.md`.
- Tournament automation and game-server integration: `TOURNAMENT_GUIDE.md`.
