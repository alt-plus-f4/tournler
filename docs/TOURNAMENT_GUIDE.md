# Tournament Automation & Game Server Integration Guide

## Overview

This system provides automated tournament management, bracket generation, match creation, and game server integration for CS2 tournaments.

## Features

### 1. Tournament Automation

**Automatic Tournament Start**

- Tournaments automatically start when their scheduled start date/time is reached
- Can also be manually started by tournament organizers
- Automatically creates bracket matches based on registered teams

**Bracket Generation**
Three tournament formats supported:

- **Single Elimination**: Teams are paired off, losers are eliminated (recommended for standard tournaments)
- **Round-Robin**: Each team plays every other team once (best for groups)
- **Double Elimination**: Winners and losers brackets (good for competitive tournaments)

**Match Creation**

- When a tournament starts, matches are automatically created with all teams scheduled
- Matches are ordered and numbered for proper bracket flow
- Match dates are set but can be adjusted by organizers

### 2. Match Management

**Match Details**

- Team lineups with player information
- Score tracking (team A vs team B)
- Winner determination
- Game server connection information
- Match status (upcoming, live, completed)

**Match States**

- `Upcoming`: Match hasn't started yet
- `Live`: Match is in progress (scores are being updated)
- `Completed`: Match finished, winner determined

### 3. Game Server Integration

**Server Creation**

- Automatically assigns IP and port when match is started
- Generates connection credentials (IP:PORT and password)
- Creates Docker container (via separate API) with game server instance

**Server Management**

- Server status tracking (PENDING, RUNNING, COMPLETED, FAILED)
- Connection info accessible via match page
- Copy-to-clipboard for easy sharing

**Game State Updates**

- Game server sends real-time score updates
- System automatically updates match scores
- Winner is determined and stored when match completes
- Server status updates to COMPLETED when match ends

## API Endpoints

### Tournament APIs

**Start Tournament**

```
POST /api/tournaments/start
Authorization: Required (Admin)
Body: {
  "tournamentId": number
}
Response: {
  "success": true,
  "tournament": Cs2Tournament,
  "matchesCreated": number
}
```

**Check & Auto-Start Tournaments**

```
GET /api/tournaments/check-start
Authorization: Required (Admin or CRON_API_KEY header)
Response: {
  "success": true,
  "tournamentsProcessed": number,
  "results": [{
    "tournamentId": number,
    "success": boolean,
    "matchesCreated": number
  }]
}
```

**Fetch Tournament Matches**

```
GET /api/tournaments/[tournamentId]/matches
Response: {
  "matches": Match[]
}
```

### Match APIs

**List Matches (Admin)**

```
GET /api/matches?page=1&limit=10&search=teamOrTournamentName
Auth: matches:manage
Response: { "matches": Match[], "totalPages": number }
```

**List Matches (Public)**

```
GET /api/matches/public?status=ALL|SCHEDULED|LIVE|COMPLETED&tournamentId=number&page=1&limit=20
Response: { "matches": Match[], "totalPages": number }
```
Used by the public `/matches` page. No auth required.

**Create a Standalone Match (Admin)**

```
POST /api/matches
Auth: matches:manage
Body: {
  "tournamentId": number,
  "teamAId": number,
  "teamBId": number,
  "matchDate": ISO8601Date
}
Response: { "match": Match }
```
Creates a single `SCHEDULED` match not wired into any bracket (`nextMatchId`/`nextMatchSlot` are left null) — intended for manually testing the live-match/game-server flow without starting a whole tournament. `tournamentId` must reference an existing tournament (the schema requires it), but the two teams don't need to already be on that tournament's roster.

**Create an Open Pickup Match (Admin)**

```
POST /api/matches
Auth: matches:manage
Body: { "isPickup": true, "matchDate": ISO8601Date }
Response: { "match": Match }
```
No tournament or teams to pick — `tournamentId`/`teamAId`/`teamBId` are omitted. The match attaches internally to a hidden, auto-created "Pickup Matches" system tournament (`Cs2Tournament.isSystem: true`, created lazily on first use) so the required `tournamentId` FK is satisfied without a real tournament existing. `teamAId`/`teamBId` stay null — sides are filled by individual players via the join endpoint below, not by `Cs2Team`s. The system tournament is excluded from all tournament listings/counts (`isSystem: false` filters).

**Join / Leave a Pickup Match**

```
POST /api/matches/[matchId]/join
Auth: any signed-in user
Body: { "side": "TEAM_A" | "TEAM_B" }
Response: { "participants": MatchParticipant[] }
```
```
DELETE /api/matches/[matchId]/join
Auth: any signed-in user
Response: { "participants": MatchParticipant[] }
```
Only works on `isPickup` matches still `SCHEDULED`, max 5 players per side. Re-joining with a different `side` switches you rather than erroring (upsert on `matchId`+`userId`). Note: pickup matches can be started/paused/resumed/scored like any other match, but **cannot be completed with a winner** — there's no `Cs2Team` to be the winner, so `recordMatchResult` rejects any `winnerId` for them (the `winnerId` check requires it to equal `teamAId`/`teamBId`, which are always null here).

**Get Match Details**

```
GET /api/matches/[matchId]
Response: {
  "match": Match (with teams, scores, game server)
}
```

**Update Match**

```
PATCH /api/matches/[matchId]
Auth: matches:manage, or the tournament's organizer
Body: {
  "action": "START" | "PAUSE" | "RESUME",
  "scoreTeamA": number,
  "scoreTeamB": number,
  "winnerId": number,
  "matchDate": ISO8601Date
}
```
`action`, score/winner fields, and `matchDate` can each be sent independently (or combined in one request; `action` is applied first).

- `action: "START"` — `SCHEDULED` → `LIVE`, sets `startedAt`. Requires both `teamAId`/`teamBId` to be filled (skipped for pickup matches). Also provisions the match's `GameServer` (or reuses one that already exists) in the same transaction via `ensureGameServer()`, so connect IP/port/password — the data the game-state pipeline is keyed on — exist immediately, without a separate manual "create game server" step.
- `action: "PAUSE"` — `LIVE` → `PAUSED`, sets `pausedAt`.
- `action: "RESUME"` — `PAUSED` → `LIVE`, shifts `startedAt` forward by the paused duration (so elapsed-time math stays correct) and clears `pausedAt`.
- Sending `scoreTeamA`/`scoreTeamB` without `winnerId` updates the score and moves the match to `LIVE` (via `recordMatchResult`, the same write path the game server uses).
- Sending `winnerId` completes the match (`COMPLETED`), triggering bracket advancement — rejected with `409` if the match is already completed with a *different* winner.
- Invalid action / wrong-status transitions (e.g. pausing a non-live match) return `409`.

These are also exposed as an "Admin Controls" panel directly on the public match page (`/matches/[matchId]`) for `ADMIN`/`TOURNAMENT_ADMIN` users — Start/Pause/Resume buttons, live score editing, and an End Match (pick winner) action.

**Update Game State (From Game Server)**

```
POST /api/matches/game-state
Authorization: X-Game-Server-Token header
Body: {
  "matchId": number,
  "teamAScore": number,
  "teamBScore": number,
  "isCompleted": boolean,
  "winnerId": number (if completed)
}
```

### Game Server APIs

**Create Game Server**

```
POST /api/matches/[matchId]/game-server
Response: {
  "success": true,
  "gameServer": GameServer,
  "connectUrl": "IP:PORT",
  "password": string
}
```

**Get Game Server Info**

```
GET /api/matches/[matchId]/game-server
Response: {
  "gameServer": GameServer
}
```

## Database Schema

### GameServer Model

```prisma
model GameServer {
  id        Int
  matchId   Int (unique)
  connectIp String
  port      Int
  password  String
  status    GameServerStatus
  createdAt DateTime
  updatedAt DateTime
}

enum GameServerStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
}
```

### Match Model (Extended)

```prisma
model Matches {
  id          Int
  tournamentId Int
  teamAId     Int
  teamBId     Int
  winnerId    Int?
  scoreTeamA  Int?
  scoreTeamB  Int?
  matchDate   DateTime
  gameServer  GameServer? // NEW
}
```

## Configuration

### Environment Variables

```env
# Game Server Configuration
GAME_SERVER_IP=your-server-ip.com  # IP to show in match details (fallback if CS2_SERVER_IP unset)
GAME_SERVER_TOKEN=your-secret-token # Shared secret: game-state webhook, MatchZy remote-log header, match-config route
CRON_API_KEY=your-cron-secret        # For scheduled tournament checks

# CS2 dedicated server pool (see cs-docker/) — a fixed-size set of persistent servers, one
# match at a time each, NOT one container per match / dynamically created containers.
CS2_SERVER_POOL=[{"id":"01","ip":"your-cs2-server-ip.com","port":27015,"rconPort":27016,"rconPassword":"..."},{"id":"02","ip":"your-cs2-server-ip.com","port":27025,"rconPort":27026,"rconPassword":"..."}]

# If CS2_SERVER_POOL is unset, these define a single-server pool instead (backwards-compatible
# with earlier single-server setups):
CS2_SERVER_IP=your-cs2-server-ip.com   # Real server's public address (preferred over GAME_SERVER_IP)
CS2_SERVER_PORT=27015                  # Must match CS2_PORT in cs-docker/.env
CS2_RCON_HOST=your-cs2-server-ip.com   # Usually the same host as CS2_SERVER_IP
CS2_RCON_PORT=27016                    # Must match CS2_RCON_PORT in cs-docker/.env
CS2_RCON_PASSWORD=your-rcon-password   # Must match CS2_RCONPW in cs-docker/.env

CS2_DEFAULT_MAP=de_dust2               # Fallback map when a match has no completed veto (e.g. pickups)

# NEXTAUTH_URL (already required for auth) doubles as the base URL the CS2 server calls back to
# for GET /api/matches/[matchId]/game-server/match-config (and the demo-upload/remote-log
# webhooks) — it must be a URL reachable from the CS2 server's host, not just from browsers. If
# it isn't (e.g. local dev, where the CS2 server runs in a Docker container and NEXTAUTH_URL is
# http://localhost:3000 — "localhost" there is the container itself, not the host), set
# GAME_SERVER_CALLBACK_URL instead; see CS2_SERVER_GUIDE.md §4.
```

A fixed-size CS2 server pool also means only as many matches can be `LIVE` at once as there are
servers in the pool — `startMatch()` rejects starting another match once every server is already
claimed by a `LIVE`/`PAUSED` match (`NoAvailableGameServerError`, surfaced as a 409). See
`CS2_SERVER_GUIDE.md` for a full setup + testing walkthrough, and `cs-docker/README.md` for the
hosting topology (the CS2 containers need a separate always-on host; they cannot run on Vercel
alongside the Next.js app).

## Cron Jobs

### Auto-Start Tournaments

`GET /api/tournaments/check-start` finds every `UPCOMING` tournament whose `startDate` has
passed and starts it (generates the bracket, creates matches). There is no in-process
scheduler — something has to hit this endpoint periodically. Two ways are already wired up in
this repo; **use exactly one**, not both:

**Option A — Vercel's native Cron Jobs** (`vercel.json`, already in the repo):

```json
{ "crons": [{ "path": "/api/tournaments/check-start", "schedule": "0 0 * * *" }] }
```

Vercel calls this automatically once deployed — no extra setup beyond setting `CRON_SECRET` in
the project's environment variables (Vercel signs the request itself, `Authorization: Bearer
<CRON_SECRET>`, checked by `isValidCronRequest()` in the route). **Caveat:** Vercel's free
Hobby plan only allows daily-granularity cron schedules (`0 0 * * *` here) — a tournament won't
auto-start until up to ~24h after its scheduled time on that plan. Pro/Enterprise plans support
finer schedules; edit the `schedule` string in `vercel.json` accordingly.

**Option B — GitHub Actions** (`.github/workflows/check-tournaments.yml`, already in the repo),
runs every 5 minutes regardless of Vercel plan:

1. In the GitHub repo → Settings → Secrets and variables → Actions, add:
   - `APP_URL` — the deployed app's base URL (e.g. `https://tournler.example.com`)
   - `CRON_API_KEY` — must match the `CRON_API_KEY` env var set on the deployed app
2. Set `CRON_API_KEY` in the app's own environment variables (Vercel project settings, or
   wherever it's hosted) to the same value.
3. If you're using Option A (Vercel's native cron) instead, **delete or disable this workflow**
   (or just don't set the secrets) to avoid double-starting tournaments from two triggers.

Either way, `checkAndStartTournaments()` is idempotent per tournament (it only acts on
`UPCOMING` tournaments whose start date has passed, and flips status atomically), so overlapping
triggers are safe — but there's no reason to run both when one is enough.

## Usage Examples

### 1. Create a Tournament

1. Go to admin panel
2. Create tournament with teams
3. Set start date and time
4. Save

### 2. Auto-Start Tournament

- Tournament automatically starts at scheduled time
- OR admin can manually trigger: POST `/api/tournaments/start`
- Bracket is generated and matches are created

### 3. Launch a Match

1. Go to match page
2. Click "Create Server" button (for organizer)
3. System creates game server instance
4. Share connect IP:PORT with players
5. Game server listens to gamestate

### 4. Game Server Updates Scores

1. During match, game server tracks score
2. When round ends, server POSTs to `/api/matches/game-state`
3. Scores are updated in real-time
4. When match completes, winner is set automatically

### 5. View Match Results

1. Go to tournament page
2. Click Matches tab
3. Click on match to see details
4. View final scores and winner

## Performance Optimizations

### Implemented

- Database query optimization with selective `include` statements
- API response caching strategies
- Image optimization presets
- Debounce/throttle utilities for UI interactions
- Code splitting with dynamic imports
- Lazy loading for heavy components

### Recommended

1. Add Redis caching for frequently accessed tournament/match data
2. Implement WebSocket for live score updates instead of polling
3. Use CDN for match thumbnails and team logos
4. Batch game state updates from game servers
5. Archive old tournaments to separate database

## Security Considerations

1. **Game Server Token**: Required header for game state updates
2. **Tournament Organizer Check**: Only organizers can create game servers
3. **Admin Only**: Tournament start and bracket creation require admin role
4. **Match Updates**: Validate tournament ownership before allowing updates

## Troubleshooting

### Tournament Won't Start

- Check if start date has passed
- Verify tournament has at least 2 teams registered
- Check if tournament status is UPCOMING

### Matches Not Created

- Verify bracket generation succeeded
- Check database logs for creation errors
- Ensure team IDs are valid

### Game Server Not Responding

- Verify GAME_SERVER_TOKEN is correct
- Check game server logs for connection errors
- Ensure game server IP is publicly accessible
- Check firewall rules for port access

## Future Enhancements

1. **WebSocket Live Updates**: Real-time score updates without polling
2. **Automatic Maps**: Server selects maps based on tournament rules
3. **Demo Storage**: Save match demos on game server
4. **Anti-Cheat Integration**: Connect to VAC or BattlEye APIs
5. **Spectator Mode**: Broadcast matches to spectators
6. **Prediction System**: Allow predictions on match outcomes
7. **Stats Tracking**: Player stats across tournament
