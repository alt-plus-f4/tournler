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

### Forum

- GET `/api/forum/threads?category=&page=`: Public. Returns 30 threads per page, pinned first, then by last activity. Authors expose only `id`, `name`, `image`.
- POST `/api/forum/threads`: Any authenticated user. Title 3–120 chars, body 1–5000 chars, plain text. Rate limit: one new thread per user per 30s (429 otherwise).
- GET `/api/forum/threads/[threadId]`: Public. Thread plus replies, oldest first.
- PATCH `/api/forum/threads/[threadId]`: `forum:moderate`. Body `{ isPinned?, isLocked? }`.
- DELETE `/api/forum/threads/[threadId]`: Thread author OR `forum:moderate`.
- POST `/api/forum/threads/[threadId]/replies`: Any authenticated user; rejected with 423 when the thread is locked (moderators may still reply). Rate limit: one reply per user per 10s. Bumps the thread's `lastActivityAt`.
- DELETE `/api/forum/replies/[replyId]`: Reply author OR `forum:moderate`.
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
