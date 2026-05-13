# Roles, Permissions, and API Contract Guide

This document describes the new role model, permission matrix, and API behavior updates.

## Roles

The application now supports five user roles:

- USER: Standard player access.
- MODERATOR: Team moderation and admin panel visibility.
- TOURNAMENT_ADMIN: Tournament, match, and game-server management.
- CONTENT_ADMIN: Content-focused admin permissions.
- SUPER_ADMIN: Full administrative access.

These are defined in the Prisma enum `UserRole`.

## Permission Matrix

Permissions are centralized in `src/lib/helpers/permissions.ts`.

- admin:access: MODERATOR, TOURNAMENT_ADMIN, CONTENT_ADMIN, SUPER_ADMIN
- users:manage: SUPER_ADMIN
- teams:manage: MODERATOR, SUPER_ADMIN
- tournaments:manage: TOURNAMENT_ADMIN, SUPER_ADMIN
- matches:manage: TOURNAMENT_ADMIN, SUPER_ADMIN
- servers:manage: TOURNAMENT_ADMIN, SUPER_ADMIN
- content:manage: CONTENT_ADMIN, SUPER_ADMIN

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

- `SUPER_ADMIN` (full power)
- `TOURNAMENT_ADMIN` (tournament ops)
- `MODERATOR` (team moderation)

You can do this with a one-time SQL or Prisma script.
