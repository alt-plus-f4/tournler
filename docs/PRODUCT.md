# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: tournament organizers and community leads.** People who run CS2 events for a community, league, school, or LAN crowd. They create tournaments, pick a format, accept team registrations, schedule matches, and oversee them while they are live. They want the event to run itself. They don't want to rent servers, hand out IPs, or collect scores by hand.

**Secondary: the players and team captains** in those events. They sign in with Steam, Discord, or email, form teams and invite teammates, register for tournaments, join pickup matches, connect to the assigned server, and check brackets, live scores, stats, and their profile (including their FACEIT level).

**Internal: platform staff** use the admin area (`/admin`) with roles `MODERATOR`, `TOURNAMENT_ADMIN`, `CONTENT_ADMIN`, and `ADMIN`. They manage users, teams, tournaments, matches, servers, badges, news, and homepage curation.

## Product Purpose

Tournler runs a CS2 tournament end to end: registration, bracket, server, match, and result. The organizer declares the event and the platform does the rest. It generates the bracket, provisions a CS2 dedicated server for each match, configures it through MatchZy, streams live score updates back, advances the bracket when a series ends, and records per-player stats.

Success means an organizer can run a full event without touching a game server, and players always know where to connect and what's next.

## Positioning

**Hosted servers, zero setup.** Bracket tools like start.gg or Challengermode leave the actual game to the organizer, and FACEIT is built around its own ladder. Tournler owns the server. Each match gets a provisioned CS2 server (the `joedwards32/cs2` Docker image with MatchZy), the game server itself reports scores back, and admin controls send real RCON commands (pause, unpause, restart). The platform only records a match as live or finished when the server actually reports it.

## Operating Context

- **Tournament lifecycle:** create → registration → start (manual, or automatic via an external cron hitting `/api/tournaments/check-start`) → matches pre-warm 5 minutes before start → MatchZy `series_start` flips the match to LIVE → live scoreboard and game timer → `series_end` advances the bracket.
- **Formats:** single elimination, double elimination, and round robin. There are also pickup matches, which have no team entity: sides are `TEAM_A`/`TEAM_B` and there is no map veto.
- **Match page** is the live surface: map veto, rosters, live score, and a timer. Admins can pause, resume, restart, or end the match.
- **Identity:** Steam OpenID (required for connecting to servers and for the FACEIT lookup), Discord OAuth, and email magic link.
- **Content:** news posts and featured tournaments/news curated from the admin area onto the homepage.
- **Real-time notifications** go through Convex. Everything else is Prisma/Postgres.

## Capabilities and Constraints

- Stack: Next.js 16 App Router, React, TypeScript, Tailwind, shadcn/ui over Radix, Prisma/Postgres, Convex (notifications only), NextAuth v4, and Vercel Blob for avatars and logos. Deployed on Vercel.
- Game-specific: CS2 only. Terms like map veto, BO1/BO3, sides, MatchZy, and RCON are part of the product vocabulary.
- FACEIT level/Elo comes from the official FACEIT Data API through the user's linked Steam ID. **FACEIT's own icon assets must not be hotlinked or redistributed.** The level badge is Tournler's own SVG crest in FACEIT's color bands. If there's no API key or no linked account, no level is shown; there is no fake fallback.
- The account-age "level" on match-page rosters is a separate homegrown fallback and is not a FACEIT level.
- Permissions are enforced per route through `src/lib/helpers/permissions.ts`. UI shouldn't expose actions a role can't perform.
- Open decision: Convex notifications have no identity checks yet, so don't design features that assume notification privacy.

## Brand Commitments

- Name: **Tournler**. Logo at `public/logo.png`, favicon at `public/favicon.ico`.
- No other voice or identity commitments have been confirmed yet.

## Evidence on Hand

- Pre-launch personal project: **no real users, organizers, testimonials, partner communities, or usage numbers exist.** Future work must not invent any.
- Team logos shown on the homepage (e.g. G2, HEROIC) are demo content hosted on Vercel Blob. They don't mean those organizations endorse or use Tournler.
- `public/info-image.png` is a dashboard illustration used on `/information` and as the fallback tournament banner.
- README screenshots of the home, teams, tournaments, and admin pages are linked from `README.md`.

## Product Principles

1. **The server is the source of truth.** Match state, scores, and results come from the game server. The UI never implies live data the pipeline didn't report.
2. **Organizer effort goes toward zero.** Each extra manual step for the organizer counts as a product failure. Automation (auto-start, pre-warm, bracket advancement) should be visible and trustworthy, not hidden.
3. **Players always know their next action.** Where to connect, when their match is, and who they play next should be obvious from any match or tournament surface.
4. **Honest about what's real.** Real FACEIT data or nothing. No fabricated stats, levels, or social proof.
