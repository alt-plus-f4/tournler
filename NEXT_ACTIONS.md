# Next Actions

Snapshot as of 2026-08-14, after a security/dependency/code-quality pass on
`main`. This file is a living plan — update it as items are done or reprioritized.

## Do these first (carried over from this session's work)

- [ ] **Rotate the Steam Web API token** that was hardcoded in
      `cs-docker/docker-compose.yml` (`SRCDS_TOKEN`) and committed to git
      history since `2b7e55e`. It's now read from an env var in the working
      tree, but the old value is still recoverable from git history — treat it
      as burned and get a new one from Steamworks.
- [ ] **Smoke-test the auth fixes against a real DB** before deploying: this
      session added session/permission checks to several previously-open API
      routes (team delete/leave, tournament PATCH/DELETE, tournament
      teams join/leave, team invites, accept/deny-invite, game-server GET) and
      added Steam OpenID `check_authentication` verification. These were
      verified via `npm run build`/`npm test` (both pass) but not against a
      live Postgres + real Steam OAuth round-trip — do that before shipping.
      In particular, confirm the Steam account-linking flow still completes
      end-to-end now that it calls back to Steam for verification.
- [ ] **Decide on Convex auth**: `convex/notifications.ts` has no identity
      checks at all — every query/mutation trusts a client-supplied `userId`.
      Fixing this properly requires wiring Convex Auth (or passing a verified
      NextAuth JWT into the Convex client) — bigger scope than this session's
      pass covered. Until it's fixed, treat notification data as
      not access-controlled.
- [ ] **`sharp` is still on a vulnerable version** (0.33.5, needs ≥0.35.0) —
      left alone deliberately since the fix is a breaking major bump. Schedule
      it as its own change with a manual test of avatar upload / image
      optimization afterward, rather than bundling it into an unrelated PR.

## Security / infra gaps (nothing currently in place)

- [ ] **No CI at all.** There's no `.github/workflows/` — `npm run build`,
      `npm test`, and `npm run lint` only run on someone's machine before a
      push, if at all. Add a GitHub Actions workflow that runs install + lint
      + test + build on every PR at minimum; this would have caught the
      pre-existing lint errors that were silently failing `next build` before
      this session fixed them.
- [ ] **No dependency update automation** (no Dependabot/Renovate config).
      13 vulnerabilities had accumulated before this pass. Add a
      `.github/dependabot.yml` for npm with at least a weekly schedule so this
      doesn't happen again silently.
- [ ] **`next-auth` v4 → v5 migration** is the real fix for the one
      irreducible vuln class from this session (the `uuid` dependency pinned
      inside next-auth v4 itself) — v4 is in maintenance mode. This is a
      genuine breaking migration (session/callback API changes), not a patch —
      plan it as its own project, not a quick follow-up.
- [ ] **Env var documentation is out of date**: `TOURNAMENT_GUIDE.md`
      references `GAME_SERVER_IP`, `GAME_SERVER_TOKEN`, and `CRON_API_KEY`,
      none of which are listed in `.examplenv`. Anyone setting up the project
      from scratch will hit missing-env-var failures on the tournament
      automation / game-server features without knowing why.

## Stale branches (cleanup)

- `origin/development` is 8 commits **behind** `main` with 0 ahead — it's
  stale. Either delete it or fast-forward/rebase it onto `main` if it's still
  meant to be the integration branch; right now it's just drift.
- `origin/feat/add-automated-matches` is fully merged (PR #80) with 0 commits
  ahead of `main` — safe to delete.

## Open GitHub issues (9 open, oldest from Oct 2024)

Grouped by what they actually are, since several have empty bodies (title-only):

**Real bugs / correctness**
- **#9** — remove `console.log`s before production. The file it originally
  named (`components/UserAuthForm.tsx`) no longer exists, but the underlying
  issue is still live: `console.log` calls remain in
  `src/app/admin/settings/page.tsx`, `src/app/admin/tournaments/page.tsx`,
  `src/app/api/user/onboarding/status/route.ts`, `src/app/api/profile/route.ts`,
  `src/lib/helpers/accept-team-invite.ts`, and
  `src/lib/helpers/deny-team-invitation.ts` (confirmed via grep this session).
- **#49** — admin dashboard charts don't load real data. This session found the
  root cause: `src/app/admin/page.tsx` renders hardcoded fake numbers with the
  real `fetch('/api/admin/users'|'/teams')` calls commented out, and there's no
  `/api/admin/tournaments` endpoint yet for the third chart. Needs: restore the
  two working fetches, and build the missing tournaments-stats endpoint.

**Refactors (no functional bug, but real technical debt)**
- **#71** — switch skeleton-covered images to `loading="eager"` (this session
  added `loading="lazy"` to match-row logos as a *perf* fix for off-screen
  images — reconcile these two: eager only makes sense for above-the-fold
  images with skeletons, lazy for everything else, they're not in conflict but
  worth a pass to apply consistently rather than ad hoc).
- **#69** — `InvitePlayerDialog` should fetch on demand instead of prefetching.
- **#68** — adopt Partial Prerendering (PPR) — worth revisiting once the
  Next.js version strategy above is settled, since PPR's stability/API has
  moved across Next versions.

**Features (no bug, product asks)**
- **#67** — cosmetic background treatment.
- **#66** — bio field on team member avatar.
- **#42** — "add matches support" — largely superseded by the tournament
  automation work merged in PR #80 and the `f9d9a1d`/`471d99e` commits since;
  worth re-reading against current state and likely closing or narrowing.
- **#24** — player statistics (kills/deaths/KD/HLTV rating) — a genuinely
  substantial feature (needs a stats data model, ingestion from match/game
  server data, and UI), not a quick add.

**Suggested triage**: close or narrow #42 (mostly done), fix #9 and #49 first
(both are quick, both are bugs not features), then take #71/#69 as part of any
future frontend cleanup pass rather than standalone.

## Suggested prioritization

1. **This week**: rotate the Steam token, smoke-test the auth changes from
   this session against a real environment, fix #9 (console.logs) and #49
   (admin dashboard).
2. **Next**: add CI (build+test+lint on PR) and Dependabot — both are one-time
   setup that pays off immediately and would have caught several of the issues
   fixed this session automatically.
3. **Medium-term**: decide on Convex auth approach; plan the next-auth v4→v5
   and `sharp` upgrades as their own scoped changes with manual testing.
4. **Longer-term / product**: player statistics (#24), PPR adoption (#68),
   the remaining refactor issues (#71, #69) — none are urgent, sequence
   opportunistically.

## Reference

- Security/dependency/quality audit performed 2026-08-14: see git history on
  `main` from that date for the full diff (route-handler auth fixes, dead code
  removal, dependency bumps, bracket-generation and tournament-service race
  condition fixes).
- Architecture and dev commands: `CLAUDE.md`.
- Role/permission model and API contracts: `ROLE_AND_API_GUIDE.md`.
- Tournament automation and game-server integration: `TOURNAMENT_GUIDE.md`.
