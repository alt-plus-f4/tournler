# CS2 Server Setup Guide

How to stand up the real CS2 dedicated server pool this app controls, wire it up to the Next.js
app, and verify the whole match flow (map veto → server provisioning → RCON push → live match →
result reporting) end to end.

This deployment runs a **fixed-size pool of persistent CS2 servers** (two, out of the box —
`cs2-dedicated-01`/`02` in `cs-docker/docker-compose.yml`), not one container per match — see
`cs-docker/README.md` for why. Each match claims one free server from the pool for its whole
duration; once every server is busy, `startMatch()` rejects starting another match until one
frees up.

## 1. Prerequisites

- Docker + Docker Compose (`docker compose version`).
- A Steam Game Server Login Token for CS2: https://steamcommunity.com/dev/managegameservers
  (create an app-specific token for App ID 730) — shared by every server in the pool. This goes
  in `SRCDS_TOKEN`.
- Several GB of free disk *per server* — first boot downloads the CS2 dedicated server files,
  Metamod, CounterStrikeSharp, and MatchZy via `cs-docker/settings/pre.sh`.
- The Next.js app already running (or ready to run) with a working `DATABASE_URL`.

## 2. Start the CS2 server pool

```bash
cd cs-docker
cp .env.example .env
```

Edit `cs-docker/.env` — fill in real passwords for both servers (the ports can stay as the
defaults unless they collide with something else on the host):

```env
SRCDS_TOKEN=<your Steam Game Server token>

CS2_SERVER_1_PORT=27015
CS2_SERVER_1_RCON_PORT=27016
CS2_SERVER_1_PW=<pick a password>          # players' connect password (the app overwrites this per match)
CS2_SERVER_1_RCONPW=<pick a strong password>
CS2_SERVER_1_TV_PW=<pick a password>

CS2_SERVER_2_PORT=27025
CS2_SERVER_2_RCON_PORT=27026
CS2_SERVER_2_PW=<pick a different password>
CS2_SERVER_2_RCONPW=<pick a different strong password>
CS2_SERVER_2_TV_PW=<pick a different password>
```

Then:

```bash
docker compose up -d
docker compose logs -f          # watch first-boot download + install for both; Ctrl-C to stop tailing
```

Wait until the logs show both servers have fully started (map loaded, listening). Because
`matchzy_kick_when_no_match_loaded` is enabled, players (and you, testing manually) will be
kicked immediately on connect until the app loads a real match onto that specific server —
that's expected, not a bug; don't try to join before starting a match from the app.

Also start `pool-controller` (still from `cs-docker/`) — the app needs it to start any match at
all, since it's what boots a server directly onto a match's map instead of a live RCON map change
(which segfaults this Metamod build unconditionally — see `cs-docker/README.md`'s compatibility
section):

```bash
node pool-controller/index.js
```

Set `POOL_CONTROLLER_TOKEN` in `cs-docker/.env` and the app's own `.env` (same value in both),
and `POOL_CONTROLLER_URL` in the app's `.env` pointing at wherever this ends up running.

### Want more than two servers?

Copy the `cs2-dedicated-02` block in `docker-compose.yml`, rename it (`cs2-dedicated-03`), bump
every `CS2_SERVER_2_*` reference to `CS2_SERVER_3_*`, add a matching `CS2_SERVER_3_*` block to
`cs-docker/.env` with new non-colliding ports, and add a matching entry to `CS2_SERVER_POOL`
(§3) in the app's `.env`. Fewer than two works too — delete the `cs2-dedicated-02` block and its
`CS2_SERVER_POOL` entry if you only want one server.

## 3. Point the app at the pool

In the Next.js app's `.env` (see `.examplenv` for the full list), set:

```env
GAME_SERVER_TOKEN=<any strong shared secret you make up>

CS2_SERVER_POOL=[{"id":"01","ip":"<CS2 host IP/hostname>","port":27015,"rconPort":27016,"rconPassword":"<CS2_SERVER_1_RCONPW>"},{"id":"02","ip":"<CS2 host IP/hostname>","port":27025,"rconPort":27026,"rconPassword":"<CS2_SERVER_2_RCONPW>"}]

CS2_DEFAULT_MAP=de_dust2           # fallback map for matches with no completed veto (e.g. pickups)
```

Use `"localhost"` as the `ip` if both the app and the CS2 containers run on the same machine.
Each pool entry's `port`/`rconPort`/`rconPassword` must exactly match that server's
`CS2_SERVER_<N>_PORT`/`CS2_SERVER_<N>_RCON_PORT`/`CS2_SERVER_<N>_RCONPW` from §2.

(If you only run one server and don't want to bother with JSON, leave `CS2_SERVER_POOL` unset
and use the older `CS2_SERVER_IP`/`CS2_SERVER_PORT`/`CS2_RCON_HOST`/`CS2_RCON_PORT`/
`CS2_RCON_PASSWORD` vars instead — see `.examplenv`.)

`NEXTAUTH_URL` (already required for auth) doubles as the *default* base URL every CS2 server
calls back to for match config and result reporting — it must be a URL the CS2 host(s) can
actually reach, not just `localhost`, if they're on a different machine than the app (see §6). If
it isn't (see §4 for the common local-dev case), set `GAME_SERVER_CALLBACK_URL` instead —
`src/lib/cs2/callback-url.ts` prefers it over `NEXTAUTH_URL` whenever it's set.

Restart the Next.js dev server after editing `.env` so it picks up the new values.

## 4. Local network wrinkle

If you run the Next.js app directly with `npm run dev` on your host machine (not in Docker),
`localhost`/`127.0.0.1` reaches the CS2 containers' published ports fine *from the app's side* —
but the reverse direction (the CS2 container fetching `matchzy_loadmatch_url` back into the app)
does **not** just work with `NEXTAUTH_URL=http://localhost:3000`: `localhost` inside a container
is the container itself, not the host, on every platform (confirmed directly — `curl
http://localhost:3000` from inside the container fails, `curl
http://host.docker.internal:3000` from the same container succeeds). A previous version of this
guide claimed Docker Desktop maps container `localhost` to the host on Mac/Windows — it does not.

Set `GAME_SERVER_CALLBACK_URL=http://host.docker.internal:3000` in the app's `.env` (Docker
Desktop's fixed DNS name for the host machine; on Linux, use your host's LAN IP instead if
`host.docker.internal` isn't available). Getting this wrong doesn't throw anywhere visible: the
container's own fetch just fails silently (`[MatchZy] [LoadMatchFromURL - FATAL] Async fetch
error: Connection refused`), no match config ever loads, and
`matchzy_kick_when_no_match_loaded` then kicks *every* connecting player — including ones who
did join a side through the match page — because MatchZy never actually has a match loaded to
check them against. The same broken URL also silently breaks the `matchzy_remote_log_url` score
webhook, so scores drift and never show live on the match page. If you're seeing either symptom,
check this first — `docker logs <container> | grep -i "connection refused"` confirms it.

If you *also* run the app in Docker, put both compose stacks on one shared network so they can
address each other by service name:

```bash
docker network create tournler-dev
```

then add `networks: [tournler-dev]` (declared as `external: true`) to both compose files, and
use the app's service name instead of an IP for `NEXTAUTH_URL`.

## 5. Verify RCON connectivity works before testing a real match

Fastest check: create any match in the app, then hit the manual sync endpoint as an
organizer/admin —

```bash
curl -X POST http://localhost:3000/api/matches/<matchId>/game-server/sync \
  -H "Cookie: <your session cookie>"
```

A `200` with `serverStatus` text back means RCON auth is working for whichever server that match
got assigned to. A connection error usually means the matching `CS2_SERVER_POOL` entry's
`port`/`rconPort` don't line up with that container's published ports, or its `rconPassword`
doesn't match that server's `CS2_SERVER_<N>_RCONPW` in `cs-docker/.env`.

## 6. Full end-to-end walkthrough

1. **Create a tournament** as an admin/organizer with `bestOf: 3` and a map pool selected, add
   at least 4 teams (each with a Steam-linked member), start the tournament.
2. **Open a match page** as a member of each team — the map veto panel should enforce turn
   order (ban, ban, pick, pick, ban, ban, auto-decider for bo3) and end with 3 confirmed maps.
3. **Start the match** as an admin — the Start button stays disabled until veto completes. Once
   started, the app:
   - creates a `GameServer` row pointed at whichever server in `CS2_SERVER_POOL` is currently
     free,
   - opens RCON to that specific server and runs `matchzy_loadmatch_url` (pointing back at
     `GET /api/matches/[matchId]/game-server/match-config`) plus `sv_password`,
   - sets `GameServer.matchConfigLoadedAt` on success.
   Check `docker compose logs -f` on the CS2 side — you should see the assigned server (and only
   that one) load the match.
4. **Connect in-game** using the connect string shown on the match page (now a real, working
   password since RCON just set it).
5. **Play/finish a map.** Two ways the result gets back to Tournler:
   - MatchZy's event webhook hits `POST /api/matches/game-state/matchzy` automatically (set via
     `matchzy_remote_log_url` in the pushed match config).
   - If that doesn't fire (`matchzy_remote_log_*` convars are known to be flaky on some setups —
     see the caveat comment in that route), use the sync endpoint from §5, read the score off
     the raw `status` output, and enter it manually via the existing admin score-update control.
6. **Finish the series** — bracket propagation (and, for single-elimination, the 3rd-place
   match between both semifinal losers) should fire automatically once a team clinches it, and
   the server it used becomes free again for the next match.
7. **Start two matches at once** (needs ≥2 teams-worth of extra matches ready to go) — each
   should get a *different* server from the pool. Then try starting one more than you have
   servers for — it should be rejected with an "All N CS2 server(s) in the pool are currently in
   use" error, confirming the pool-exhaustion guard.

I have not been able to run this walkthrough myself end-to-end (it needs real CS2 clients and
live servers) — the automated test suite (`npx jest`) covers the veto engine and bracket logic
in isolation, but steps 2–7 above need to be verified manually by someone with a CS2 install.

## 7. Production

Vercel (where the Next.js app is meant to deploy) is serverless and can't host long-running game
server processes. Run `cs-docker/` on a separate always-on host (small VPS or bare metal) with a
public IP — all pool servers can live on one host (they just need distinct ports, as shipped) or
be split across a few hosts (update each pool entry's `ip` accordingly). Open every server's
game/RCON ports on the relevant firewall, and point the app's `CS2_SERVER_POOL` at the public
IP(s) — the app and the CS2 servers talk over the public internet, not a shared Docker network,
in production.

## 8. Troubleshooting

- **Kicked immediately on connect**: no match loaded yet (see §2) — start a match from the app
  first, don't join manually.
- **RCON auth fails**: the `CS2_SERVER_POOL` entry's `rconPassword` doesn't match that server's
  `CS2_SERVER_<N>_RCONPW` (cs-docker), or the RCON port isn't reachable (firewall, wrong `ip`).
- **Match config never loads on the server, or you're kicked despite having joined a side**:
  check the CS2 server can reach `GAME_SERVER_CALLBACK_URL`/`NEXTAUTH_URL` (§4) —
  `matchzy_loadmatch_url` is an HTTP GET *from the game server*, so `localhost` only works if
  they're genuinely on the same machine/network namespace (never true for a Dockerized CS2
  server — see §4). When this fetch fails, MatchZy never actually loads a match, so
  `matchzy_kick_when_no_match_loaded` kicks *everyone*, including players who did join a side —
  it isn't whitelist logic being wrong. `docker logs <container> | grep -i "connection refused"`
  confirms it.
- **Starting a match fails, or the server crashes/disappears right as a match starts**: check
  `pool-controller` is actually running and reachable (`POOL_CONTROLLER_URL`/`POOL_CONTROLLER_TOKEN`
  — see §2). Without it, starting a match falls back to a live RCON map change, which segfaults
  this Metamod build unconditionally (`cs-docker/README.md`'s compatibility section) — the
  container will show `Exited (0)` shortly after `docker ps -a` and its logs end with
  `Segmentation fault (core dumped)` right after a `Host activate: Changelevel` line.
- **Score never updates in the app**: MatchZy's remote-log webhook may not be firing (see §6
  step 5) — use the manual sync endpoint as a stopgap and enter the score by hand.
- **"All N CS2 server(s) in the pool are currently in use"**: expected once every server is
  claimed by a live/paused match — finish or manually complete one before starting the next, or
  add another server to the pool (§2).
