# Roles, Permissions, and API Contract Guide

This document describes the new role model, permission matrix, and API behavior updates.

## Roles

The application now supports five user roles:

- USER: Standard player access.
- MODERATOR: Team moderation and admin panel visibility.
- TOURNAMENT_ADMIN: Tournament, match, and game-server management.
- CONTENT_ADMIN: Content-focused admin permissions.
- ADMIN: Full administrative access.

These are defined in the Prisma enum `UserRole`.

## Permission Matrix

Permissions are centralized in `src/lib/helpers/permissions.ts`.

- admin:access: MODERATOR, TOURNAMENT_ADMIN, CONTENT_ADMIN, ADMIN
- users:manage: ADMIN
- teams:manage: MODERATOR, ADMIN
- tournaments:manage: TOURNAMENT_ADMIN, ADMIN
- matches:manage: TOURNAMENT_ADMIN, ADMIN
- servers:manage: TOURNAMENT_ADMIN, ADMIN
- content:manage: CONTENT_ADMIN, ADMIN
- forum:moderate: MODERATOR, CONTENT_ADMIN, ADMIN
- users:ban: MODERATOR, CONTENT_ADMIN, ADMIN

## Updated API Authorization

### Tournament lifecycle

- POST `/api/tournaments/start`
  - Requires: `tournaments:manage`
- GET `/api/tournaments/check-start`
  - Requires: valid `x-api-key` matching `CRON_API_KEY` OR `tournaments:manage`

### Tournament CRUD/list

- GET `/api/tournaments`
  - Public.
  - Query params:
    - `status=ACTIVE` -> UPCOMING + ONGOING
    - `status=UPCOMING|ONGOING|COMPLETED`
    - Backward compatible numeric values: `0`, `1`, `2`, `10`
- POST `/api/tournaments`
  - Requires: authenticated user with `tournaments:manage`
  - Organizer is now the current session user (`organizerId = session.user.id`), not a hardcoded ID.

### Match and game server management

- PATCH `/api/matches/[matchId]`
  - Requires organizer ownership OR `matches:manage`
- POST `/api/matches/[matchId]/game-server`
  - Requires organizer ownership OR `servers:manage`
- GET `/api/matches/[matchId]/game-server`
  - Public read (kept unchanged)
- POST `/api/matches/game-state`
  - Requires valid `x-game-server-token`
  - Payload is now explicitly validated before processing.

### User and admin endpoints

- GET `/api/admin/users`: `users:manage`
- GET `/api/admin/teams`: `teams:manage`
- GET `/api/users`: `users:manage`
- PATCH `/api/users/[slug]`: `users:manage`
- DELETE `/api/users/[slug]`: `users:manage`

### Riot ID linking (League of Legends)

Server-only Riot Games API client at `src/lib/riot/client.ts` (`RIOT_API_KEY`; dev keys from developer.riotgames.com expire every 24h, a production key needs Riot approval). If the key isn't configured, every endpoint below returns 503 `{ error: "Riot ID linking isn't set up on this server yet." }` rather than faking success. The client never trusts a client-sent PUUID — it's always re-resolved from Riot's `account-v1` API by Riot ID.

Linking proves ownership with a profile-icon challenge (Riot doesn't offer OAuth/"Sign On" to third parties yet): pick a random base icon (0–28) different from the player's current one, ask them to set it in the League client within 10 minutes, then confirm via `summoner-v4`.

- GET `/api/user/riot`: Any authenticated user. Returns `{ configured, account }` for the session user; `account` is `null` when nothing is linked, else `{ gameName, tagLine, region, status: 'linked' | 'pending', challenge }` (`challenge` only while a verification is open and unexpired).
- POST `/api/user/riot`: Any authenticated user. Body `{ gameName (3–16 chars), tagLine (3–5 alnum, with or without a leading #), region (a League platform routing value, e.g. "euw1") }`. Resolves the PUUID via Riot, 404s with a friendly message if no such Riot ID or no LoL summoner on that platform exists, 409s if the PUUID is already linked to a different Tournler account, otherwise upserts the account unverified and opens a new icon challenge. Re-submitting an already-verified account (e.g. fixing the region) keeps it verified. Rate-limited per user: 10 attempts / 10 minutes (429, `Retry-After`).
- POST `/api/user/riot/verify`: Any authenticated user. Reads the summoner's current profile icon and compares it to the open challenge. 200 + `{ configured, account }` on a match; 409 `"Set profile icon #N in the LoL client, then try again."` on a mismatch; 410 if the challenge expired or none is open ("Start again" — POST `/api/user/riot` again for a fresh icon). Same rate limit as linking.
- DELETE `/api/user/riot`: Any authenticated user. Unlinks (verified or pending).
- All Riot API failures (403/401 bad key, 429 rate limit, timeout, other upstream errors) map to an honest status (502/504/429) with a message the UI can show directly — never a fabricated "linked" state.

### Forum

- GET `/api/forum/threads?category=&page=`: Public. Returns 30 threads per page, pinned first, then by last activity. Each thread carries its net `score` and a `replyCount` that leaves out soft-deleted replies. Authors expose only `id`, `name`, `image`.
- POST `/api/forum/threads`: Any authenticated user. Title 3–120 chars, body 1–5000 chars, plain text. Rate limit: one new thread per user per 30s (429 otherwise).
- GET `/api/forum/threads/[threadId]`: Public. Thread (with `score`) plus a flat reply list, oldest first. Each reply has `parentId` (null = answers the thread) and `score`, so clients build the reply chain themselves. Soft-deleted replies show up as placeholders with `deletedAt` set, an empty `body`, `author: null` and `score: 0`.
- PATCH `/api/forum/threads/[threadId]`: `forum:moderate`. Body `{ isPinned?, isLocked? }`.
- DELETE `/api/forum/threads/[threadId]`: Thread author OR `forum:moderate`. Replies and votes cascade.
- POST `/api/forum/threads/[threadId]/replies`: Any authenticated user. Body `{ body, parentId? }`. `parentId` answers another reply, which must be in the same thread (404 otherwise) and not deleted (409). Locked threads return 423 (moderators may still reply). Rate limit: one reply per user per 10s. Bumps the thread's `lastActivityAt`.
- DELETE `/api/forum/replies/[replyId]`: Reply author OR `forum:moderate`. A reply that has answers is soft-deleted: `deletedAt` is set, the body is blanked, its votes are dropped, and the answers stay. A reply with no answers is hard-deleted, along with any soft-deleted ancestors it leaves with no answers. Returns `{ ok, mode: 'soft' | 'hard' }`.
- POST `/api/forum/threads/[threadId]/vote` and POST `/api/forum/replies/[replyId]/vote`: Any authenticated user (signed out → 401). Body `{ value: 1 | -1 | 0 }`, where 0 removes the vote. One vote per user per post; a repeat of the same value is a no-op. The stored `score` moves by the difference in the same transaction. Voting on your own post is allowed, and nothing is auto-voted. A soft-deleted reply can't be voted on (409). Rate limit: 30 vote changes per user per rolling minute (429). Returns `{ score, myVote }`. The viewer's own votes are read per request on `/forum/[id]` and never cached.
- `/admin/forum` moderation page: `forum:moderate`.

## Bans

A ban is a site-wide suspension (`UserBan`, with full history). While it's active, `getAuthSession()` returns `null` for that user, so every route and page that requires a signed-in user refuses them without its own check. They can still browse. The root layout reads the raw session with `getSessionIncludingBanned()` to show the suspension notice and a sign-out button. Never use that for authorization.

Rules: you can't ban yourself, admins can't be banned, and staff (any non-USER role) can only be banned by an ADMIN. One active ban at a time: a new ban lifts the previous one, which stays in the history.

- POST `/api/admin/users/[userId]/ban`: `users:ban`. Body `{ reason (3–500), duration: '1d' | '3d' | '7d' | '30d' | 'permanent' }`.
- DELETE `/api/admin/users/[userId]/ban`: `users:ban`. Lifts the active ban.
- GET `/api/admin/bans?status=active|all&page=`: `users:ban`. Ban history.
- GET `/api/admin/bans?q=<name>`: `users:ban`. Player search (id, name, image, role, active ban; no emails).
- `/admin/bans`: `users:ban`. Also available from the Users table (admins) and next to authors in forum threads (moderators).
- The homepage "Forum" block is toggled by `showForumPosts` on PATCH `/api/admin/homepage-settings` (`content:manage`).
- The whole homepage design is chosen with `pageLayout` on PATCH `/api/admin/homepage-settings` (`content:manage`): `CLASSIC` (default), `SEASON`, `DOORS`, `CAMPUS` or `WEEK`. Any other value returns 400. Writes invalidate the `homepage` cache tag through the Prisma extension. Picked in `/admin/featured` ("Homepage design"); previews live at `/home-preview/<layout in lowercase>`.

## Game servers admin

- `/admin/servers`: `servers:manage`. One card per server in the pool (`CS2_SERVER_POOL`, or the single-server `CS2_SERVER_IP`/`CS2_SERVER_PORT`/`CS2_RCON_PASSWORD` fallback), with live status read over RCON `status`: online or offline (with a short reason), hostname, map, players, version and latency. Tiles show servers, online, offline, in use (assigned to a PENDING/RUNNING game server whose match is not completed) and free. Auto-refreshes every 15 seconds while the tab is visible; there is also a Refresh button. Clicking a card opens a detail panel with a separate Match section (teams, tournament, status, scheduled and config-loaded time, masked connect password with reveal and copy, "Re-sync match config" via `POST /api/matches/[matchId]/game-server/sync`, last 5 finished matches) and Overview, Console and Settings tabs.
- Server ids come from the pool only. A request id is looked up in the pool (404 if absent, 400 if malformed); a host or port is never taken from the client. `rconHost` and `rconPassword` are never returned, and RCON passwords are scrubbed from any output.
- GET `/api/admin/servers`: `servers:manage`. Pool entries with `status` (live), `match` (assigned match summary, no password) and `summary` counts. Live status is probed in parallel with a 4 second timeout per server and cached in-process for 5 seconds. `Cache-Control: no-store`. `poolError: true` when `CS2_SERVER_POOL` is not valid JSON.
- GET `/api/admin/servers/[serverId]`: `servers:manage`. Fresh status plus the raw `status` output, current values of the allowlisted cvars (password cvars are never read), the active match including its connect password, and recent finished matches. Rate limited to 60 per minute per user.
- POST `/api/admin/servers/[serverId]/rcon`: `servers:manage`. Body `{ "command": "<max 512 chars>" }`, no control characters, `rcon_password` commands refused. Rate limited to 30 per minute per user. Errors are generic (for example "Command failed: RCON refused"). Logs only the user, server id and command name.
- PATCH `/api/admin/servers/[serverId]/settings`: `servers:manage`. Body `{ "settings": { "<cvar>": value } }`. Only the allowlist in `src/lib/cs2/server-settings.ts` is accepted (hostname, sv_password, tv_password, mp_maxrounds, mp_freezetime, mp_roundtime, mp_overtime_enable, tv_enable, sv_cheats, bot_quota, bot_quota_mode). Each value is type and range checked; any value containing `;`, quotes, backticks, backslashes, newlines or control characters is rejected (400), so no extra console command can be injected. Password cvars are write-only. Rate limited to 20 per minute per user; logs setting names only, never values.
- Retry and refresh: GET `/api/admin/servers?fresh=1` (the "Refresh all" button, 12 per minute per user) and GET `/api/admin/servers/[serverId]/status` (the per-server "Retry" button, 30 per minute per user) bypass the 5 second status cache. The list response also carries `suggestions` (next free id and game port, highest port plus 10) for the Add server form.
- Add server: servers stay defined in `CS2_SERVER_POOL`; the app cannot write env vars and stores no server or RCON data. The "Add server" panel only generates what to paste.
- POST `/api/admin/servers/test`: `servers:manage`, 10 per minute per user. Body `{ id, ip, port, rconHost?, rconPort?, rconPassword }`, every field validated with zod (ports 1-65535, host is a bare hostname or IP, password 1-128 chars without control characters). Runs one RCON `status` and returns `{ online, reason, map, hostname, humans, bots, maxPlayers, latencyMs }` without saving anything. Because it takes a host from the client it is an SSRF surface: in production the connect host (`rconHost`, else `ip`) must resolve only to public addresses (`src/lib/net/ssrf-guard.ts` `isPublicAddress`; `localhost`, `.local`, `.internal` names and private, loopback and link-local IPs are rejected with 400), and the connection goes to the resolved address. A host that the current pool already uses, or any host when `NODE_ENV` is not production, is allowed so local docker dev works. The password is never logged or echoed.
- POST `/api/admin/servers/preview`: `servers:manage`, 20 per minute per user, same body. No network access. Returns `{ entryJson, poolJson, compose, env }`: the new entry, the full merged `CS2_SERVER_POOL` value in which every EXISTING entry's `rconPassword` is replaced by `<keep existing>` (existing secrets never reach the browser), and the matching `cs-docker/docker-compose.yml` service block and `CS2_SERVER_<N>_*` variables. 409 if the id or address and port already exist. The ids `test`, `preview` and `status` are reserved.
- The old per-`GameServer`-row listing and `DELETE /api/admin/servers/[serverId]` stale-record route were removed; the page is about the pool, not database rows.

## Smoother Tournament Status Switching

The tournaments page (`/tournaments`) now uses:

- Cached results per tab state (`active` and `completed`)
- Soft visual transitions during tab switching
- Non-blocking status changes without full loading flashes

## Prisma Notes

After pulling these changes, run migration commands in your environment:

1. `npx prisma migrate dev --name add-granular-roles`
2. `npx prisma generate`

For production, use your deploy migration flow (`prisma migrate deploy`).

## Recommended Next Step

Backfill existing users currently marked `ADMIN` to one of:

- `ADMIN` (full power)
- `TOURNAMENT_ADMIN` (tournament ops)
- `MODERATOR` (team moderation)

You can do this with a one-time SQL or Prisma script.
