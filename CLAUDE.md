# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # start dev server (Next.js App Router)
npm run build            # prisma generate + next build
npm run start            # start production server
npm run lint             # eslint src (eslint:recommended + @typescript-eslint + @next/next)
npm test                 # run all jest tests
npm run test:watch       # jest watch mode
npx jest path/to/file.test.tsx          # run a single test file
npx jest -t "test name substring"       # run tests matching a name

npx prisma generate                     # regenerate Prisma client after schema changes
npx prisma migrate dev --name <name>    # create + apply a migration in dev
npx prisma migrate deploy               # apply migrations in production
```

There is no separate typecheck script; `next build` / editor TS server surfaces type errors (`tsc --noEmit` also works directly).

## Architecture

Tournler is a CS2 esports tournament management platform built on Next.js 15 (App Router) with a **split persistence layer**:

- **Prisma + PostgreSQL** (`prisma/schema.prisma`, `src/lib/db.ts`) is the system of record for users, roles, teams, tournaments, matches, and game servers.
- **Convex** (`convex/schema.ts`, `convex/notifications.ts`, `src/convex/`) is used separately for real-time notifications only — it is not a replacement for Prisma, just an additional real-time channel.

### Auth

- NextAuth v4 (`src/lib/auth.ts`), JWT session strategy, with `PrismaAdapter`. Providers: Email (magic link via nodemailer) and Discord OAuth. Steam login is implemented manually via OpenID (`src/app/api/auth/steam/*`, verified against Steam's `check_authentication` endpoint) rather than through a NextAuth provider, and is linked to a user afterward.
- The `jwt` callback in `src/lib/auth.ts` does DB writes (creating/updating `DiscordAccount`/`SteamAccount` rows, looking up/creating users for email sign-in) and re-reads the user's `role` from the DB on every callback invocation — role changes take effect on next token refresh, not immediately.
- `src/proxy.ts` (Next 16's replacement for the deprecated `middleware.ts` convention) only gate-keeps `/admin/:path*` and `/profile/:path*` (requires *any* authenticated session via `getToken`, redirecting to `/sign-in` otherwise — it does not check roles). Role/permission enforcement for everything else (including all API routes) happens at the route-handler level, not here. It's a hand-written `getToken` check rather than `next-auth/middleware`'s default export, because next-auth v4 (unmaintained for Next 16) isn't recognized by Next 16's stricter proxy export validation.

### Roles & permissions

- Five roles in the Prisma `UserRole` enum: `USER`, `MODERATOR`, `TOURNAMENT_ADMIN`, `CONTENT_ADMIN`, `ADMIN`.
- Centralized permission checks live in `src/lib/helpers/permissions.ts` (`hasPermission`, `isAdminRole`, `userHasPermission`) against a `Permission` union (`admin:access`, `users:manage`, `teams:manage`, `tournaments:manage`, `matches:manage`, `servers:manage`, `content:manage`). Route handlers call these instead of checking `role` strings directly.
- Full permission matrix and per-endpoint auth requirements are documented in `ROLE_AND_API_GUIDE.md` — check it before adding/changing an API route's authorization.

### Tournament lifecycle

- `src/lib/tournaments/bracket-generator.ts` and `src/lib/tournaments/tournament-service.ts` implement bracket generation (single elimination, round-robin, double elimination) and match creation when a tournament starts.
- `POST /api/tournaments/start` manually starts a tournament (requires `tournaments:manage`); `GET /api/tournaments/check-start` is meant to be hit by an external cron (authenticated via `x-api-key` == `CRON_API_KEY`, or an admin session) to auto-start tournaments whose scheduled time has passed. There is no in-process scheduler — the cron trigger is external (see `TOURNAMENT_GUIDE.md`).
- Game servers are modeled by the `GameServer` Prisma model (1:1 with `Matches`) and are meant to be provisioned as CS2 dedicated server Docker containers (see `cs-docker/docker-compose.yml`, using the `joedwards32/cs2` image). The game server posts live score updates back to `POST /api/matches/game-state`, authenticated via an `x-game-server-token` header checked against `GAME_SERVER_TOKEN`, distinct from user/session auth.
- Full endpoint contracts, request/response shapes, and the game-server integration flow are documented in `TOURNAMENT_GUIDE.md`.

### Frontend

- App Router pages under `src/app/**`; parallel/intercepting routes are used for auth modals (`src/app/@authModal/(.)sign-in`, `(.)sign-up`) layered over `src/app/(auth)/sign-in`, `(auth)/sign-up`.
- UI is shadcn/ui-style components over Radix primitives (`src/components/ui/`), Tailwind CSS, `class-variance-authority` for variants.
- Client-global state: Redux Toolkit (`src/app/redux`, `src/lib/onboarding-slice.ts`) for onboarding flow state; SWR for server-state fetching/caching elsewhere. Forms use `react-hook-form` + `zod` via `@hookform/resolvers`.
- Radix-based Dialog/Drawer/DropdownMenu/Select components currently lack `suppressHydrationWarning` on their animated `data-state` elements — `DIALOG_USAGE_REPORT.md` has the full inventory of affected components if hydration warnings need addressing.

### Data-fetching helpers

- `src/lib/helpers/fetch-*.ts` are small server-side Prisma query wrappers (one function per read pattern: `fetch-team.ts`, `fetch-tournament.ts`, `fetch-user-team.ts`, `fetch-users-not-in-team.ts`, etc.) used from route handlers/server components rather than inlining Prisma calls everywhere.
- `src/lib/apifuncs.ts` holds client-side fetch wrappers for calling the app's own API routes.

## Environment

Copy `.examplenv` to `.env` and fill in real values. Required groups: `DATABASE_URL` (Postgres), `NEXTAUTH_URL`/`NEXTAUTH_SECRET`, `EMAIL_SERVER_*`/`EMAIL_FROM` (magic-link auth), `DISCORD_CLIENT_ID`/`DISCORD_CLIENT_SECRET`/`DISCORD_BOT_TOKEN`/`DISCORD_GUILD_ID`, `STEAM_API_KEY`/`STEAM_REDIRECT_URI`, `BLOB_READ_WRITE_TOKEN` (Vercel Blob, used for avatar/logo uploads). `TOURNAMENT_GUIDE.md` additionally references `GAME_SERVER_IP`, `GAME_SERVER_TOKEN`, and `CRON_API_KEY` for the game-server/cron integration.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
