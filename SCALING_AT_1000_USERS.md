# Scaling problems at ~1000 concurrent users

Findings from reading the current codebase, not generic scaling advice. Each item cites the file(s)
involved, what happens today, why it specifically breaks at this scale, and a one-line direction —
this is a punch list to act on, not a spec.

## 1. DB connection exhaustion on serverless (highest risk)

`src/lib/db.ts` creates a plain `PrismaClient()` against `DATABASE_URL` with no pooler in front of
it (`.examplenv`'s `DATABASE_URL` is a bare `postgresql://...` string). On Vercel, concurrent
requests can spin up many function instances, each holding its own Postgres connection; Postgres's
default `max_connections` (100–200 on most managed plans) is exhausted well before 1000 concurrent
users, and every route that touches `db` (which is nearly all of them) starts failing with
connection errors. A parallel change is adding pooled-connection support for this — see
`src/lib/db.ts` and `prisma/schema.prisma`.

## 2. `jwt` callback does 2–4 DB round trips on almost every authenticated request

`src/lib/auth.ts:154-254` — the NextAuth `jwt` callback runs on every request that touches a
session (which is most pages and API routes, via `getAuthSession`/`getSessionIncludingBanned`).
Every invocation ends with an unconditional `db.user.findUnique` to refresh `token.role`
(`auth.ts:243-252`), and OAuth sign-ins additionally do a `findUnique` + `create`/`update` for
`DiscordAccount`/`SteamAccount` (`auth.ts:182-241`). At 1000 concurrent users this becomes 1000+
extra `SELECT`s per JWT refresh cycle purely to re-check a role that changes rarely, on top of
whatever the page itself queries — directly compounds problem #1. `getAuthSession`/
`getSessionIncludingBanned` are already `React.cache`-wrapped per request (`auth.ts:265,274`), so
the duplication is across *users*, not within one request.
**Direction:** cache the role lookup (short TTL, e.g. via `cachedQuery`/a tagged cache keyed by user
id) instead of hitting Postgres on every JWT refresh.

## 3. No rate limiting on any of our own API routes

`grep -rn "rate" src/app/api` turns up nothing — the only rate limiter in the codebase
(`src/lib/riot/`) throttles *outbound* calls to Riot's API, not inbound traffic to ours. Notably
unprotected:
- `POST /api/matches/game-state` and `POST /api/matches/game-state/matchzy` — authenticated only by
  a static `x-game-server-token` header (`matchzy/route.ts:45-49`), no throttle on request volume.
- `GET /api/tournaments/check-start` — authenticated by `x-api-key`/`CRON_SECRET`
  (`check-start/route.ts:8-22`), but nothing stops it being hammered if a secret leaks or a cron
  misconfigures its interval; each call runs `checkAndStartTournaments()` (transactional bracket
  generation) for every due tournament.
- Auth endpoints, forum posting, team invites, etc. — standard credential-stuffing/spam exposure at
  any real user count, worse once there's enough traffic to hide abuse in the noise.
**Direction:** add IP/token-scoped rate limiting (e.g. Vercel Firewall rate-limit rules, or an
Upstash/Redis token-bucket middleware) at minimum on the game-server webhook and auth-adjacent
routes.

## 4. `startTournament`'s bracket-wiring loop is sequential inside one open transaction

`src/lib/tournaments/tournament-service.ts:39-100` — after inserting all matches, the function
`for`-loops over every generated match and does one `await tx.matches.update(...)` per match with a
feeder pointer (`tournament-service.ts:81-97`), all inside a single `db.$transaction`. For a large
bracket (many teams/rounds) this holds one Postgres connection + row locks open for N sequential
round-trips instead of a single batched write. Under concurrent tournament starts (multiple admins,
or the `check-start` cron racing a manual start) this extends lock hold time and connection
occupancy exactly when problem #1 already makes connections scarce.
**Direction:** batch the feeder-pointer updates (e.g. build the full update list first, then a
single `Promise.all` inside the transaction, or a raw multi-row `UPDATE ... FROM (VALUES ...)`).

## 5. `checkAndStartTournaments` runs tournament starts strictly sequentially

`tournament-service.ts:114-138` — `for (const tournament of tournamentsToStart)` awaits
`startTournament` one at a time. If several tournaments are due in the same 5-minute cron window
(`check-start/route.ts`'s comment confirms a 5-minute trigger interval), each carrying its own
transaction from #4, the whole cron invocation's wall-clock time (and thus the serverless function's
open connection) scales linearly with the number of simultaneously-due tournaments. Not a problem at
today's scale, but compounds with #1 and #4 as tournament volume grows alongside user count.
**Direction:** run independent tournament starts concurrently (bounded `Promise.all`), or accept the
current serial behavior but log/alert if a single cron run takes long enough to approach the
function timeout.

## 6. `POST /api/matches/game-state/matchzy` is an uncached hot write path with no volume limit

`src/app/api/matches/game-state/matchzy/route.ts` handles `round_end` events fired by MatchZy
**every round** of every live match (`route.ts:90-98`, `updateLiveScore`), not just at match end.
With many CS2 matches live concurrently, this is a steady stream of writes with no batching/queueing
and no rate limit (see #3) — each is a small write, but it's an always-on load floor that scales
directly with concurrent live matches, separate from user-driven traffic.
**Direction:** fine as-is today; watch it as a scaling dimension distinct from "concurrent users" —
it scales with concurrent *matches*, and would benefit from the same rate-limiting pass as #3 if a
misbehaving/malicious game server starts flooding it.

## Checked and NOT a problem (verified, worth noting so it isn't "fixed" again)

- **List endpoints already paginate and cap results:** `/api/matches` and `/api/tournaments`
  (`route.ts` in each, `skip`/`take` derived from validated `page`/`limit`, capped at 100), `/api/teams`
  (same pattern), and `/api/teams/[slug]/invitable-users` (hard-capped at `RESULT_LIMIT = 20`,
  replacing an earlier fetch-all-users approach per its own comment). No unbounded `findMany` found
  in the routes checked.
- **Blob uploads are size/type-validated:** avatar upload caps at 100KB and content-sniffs for
  dangerous SVG (`src/app/api/user/avatar/route.ts:41-48`); team logo upload caps at 5MB and checks
  `file.type` (`src/app/api/teams/logo/route.ts:31-34`). Storage growth is bounded per-upload, not a
  volume-driven risk beyond normal usage growth.
- **Convex notifications are per-user scoped, not fan-out:** `getMyNotifications` queries by a
  `by_user` index and takes 10 (`convex/notifications.ts:23-33`); nothing in `convex/notifications.ts`
  broadcasts one write to many readers. Load scales linearly with active users, not multiplicatively.
- **`cachedQuery`/tag invalidation (`src/lib/cache/cached-query.ts`, `src/lib/cache/tags.ts`) already
  covers the main list reads** (tournaments/matches/teams) with domain-tagged invalidation on every
  write via the Prisma extension in `src/lib/db.ts`, so the caching layer itself isn't the bottleneck
  — the gaps are the reads that bypass it (JWT role lookup in #2, per-request `db.user.findUnique`
  calls in upload routes).
