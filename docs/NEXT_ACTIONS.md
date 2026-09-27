# Next Actions

Updated 2026-09-27. Everything actionable by an agent from this list has been done (PR #82 merge,
Dependabot, issues #69/#42, the Convex auth gap — see git history and closed issues). What's left
all needs either a human with account/deployment access, or is a deliberately-scoped future
project too large for an incidental pass. Update this file as items are done or reprioritized.

Note: PR-check CI (`.github/workflows/pr-checks.yml`) was disabled by renaming the file to
`.pr-checks` (commit `9b6a391`) — GitHub Actions won't pick up a dotfile, so no CI currently runs
on PRs. The workflow content itself is intact if it needs to come back; rename it back to end in
`.yml`.

## Needs a human (not something an agent can do here)

- **Rotate the Steam Web API token** that was hardcoded in `cs-docker/docker-compose.yml`
  (`SRCDS_TOKEN`) and committed to git history since `2b7e55e`. It's now read from an env var in
  the working tree, but the old value is still recoverable from git history — treat it as burned
  and get a new one from Steamworks.
- **Smoke-test against a real deployment**, not just local dev: a live Steam OAuth round-trip and
  an actual `/api/tournaments/check-start` cron invocation. Both need a real deployed environment
  and, for Steam, an interactive OAuth login — not reproducible from here.

## Scoped future projects (deliberately not attempted piecemeal)

- **`next-auth` v4 → v5 migration**: still on v4, which is unmaintained and wasn't updated for
  Next 16 (hence `src/proxy.ts`'s workaround for `next-auth/middleware`, and the `uuid`
  vulnerability pinned inside v4 that couldn't be patched around). A genuine breaking migration —
  plan it as its own project with real testing, not a forced-by-something-else scramble.
- **Player statistics** (issue #24, open): kills/deaths/KD/HLTV rating — a real feature (stats
  data model, ingestion from match/game-server data, UI), not a quick add.
- **Partial Prerendering adoption** (issue #68, open): worth it now that the app is actually on
  Next 16, but it's an architecture change touching how every page is rendered — its own project.

## Known, accepted limitation

- The API rate limiter (`src/lib/rate-limit.ts`) is a per-instance in-memory fixed window, not a
  distributed one — see that file's own docstring for the exact tradeoff. Fine as a stopgap;
  revisit with Vercel Firewall rate-limit rules or an Upstash Redis token bucket if real abuse
  shows up (no such store is currently provisioned — `.examplenv` has no Redis/Upstash env vars).

## Reference

- Architecture and dev commands: `CLAUDE.md`.
- Role/permission model and API contracts: `docs/ROLE_AND_API_GUIDE.md`.
- Tournament automation and game-server integration: `docs/TOURNAMENT_GUIDE.md`.
