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
Body: {
  "scoreTeamA": number,
  "scoreTeamB": number,
  "winnerId": number,
  "matchDate": ISO8601Date
}
```

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
GAME_SERVER_IP=your-server-ip.com  # IP to show in match details
GAME_SERVER_TOKEN=your-secret-token # Token for game server authentication
CRON_API_KEY=your-cron-secret        # For scheduled tournament checks
```

## Cron Jobs

### Auto-Start Tournaments

Set up a cron job to periodically check for tournaments that should be started:

```bash
# Run every 5 minutes
*/5 * * * * curl -X GET https://yoursite.com/api/tournaments/check-start \
  -H "x-api-key: $CRON_API_KEY"
```

Or use a service like:

- AWS EventBridge
- Google Cloud Scheduler
- GitHub Actions
- Node-cron in background worker

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
