# CS2 dedicated server pool

For a full step-by-step setup + testing walkthrough, see `../CS2_SERVER_GUIDE.md`. This file is
just the quick reference.

This runs a fixed-size pool of long-running CS2 dedicated server containers (`joedwards32/cs2`,
with Metamod, CounterStrikeSharp, and MatchZy auto-installed by `settings/pre.sh`) that the
Tournler app provisions matches onto — `docker-compose.yml` ships with two (`cs2-dedicated-01`,
`cs2-dedicated-02`), and you can add more by copying a service block. This is deliberately
**not** dynamic, per-match container creation — the pool is a fixed set of always-on servers,
and each one can only run one `LIVE`/`PAUSED` match at a time. Once every server in the pool is
busy, starting another match is rejected until one frees up (see
`src/lib/tournaments/game-server.ts`).

## Running locally

```bash
cd cs-docker
cp .env.example .env   # fill in real values for every CS2_SERVER_<N>_* var
docker compose up
```

Then point the Next.js app's own `.env` at the pool via `CS2_SERVER_POOL` (a JSON array, one
entry per server, matching each server's port/RCON port/passwords) — see the root `.examplenv`
and `TOURNAMENT_GUIDE.md`. (A single-server fallback via `CS2_SERVER_IP`/`CS2_SERVER_PORT`/etc.
still works if `CS2_SERVER_POOL` is unset.)

If the app is also running in Docker locally and needs to reach these containers by service name
rather than an IP, put both on a shared user-defined bridge network (`docker network create
tournler-dev`, then add `networks: [tournler-dev]` to both compose files) — not required when
running the Next.js app directly with `npm run dev` on the host, since `localhost`/`127.0.0.1`
already reaches the containers' published ports.

## Adding more servers to the pool

1. Copy the `cs2-dedicated-02` service block in `docker-compose.yml`, rename it
   (`cs2-dedicated-03`), and bump every `CS2_SERVER_2_*` reference to `CS2_SERVER_3_*`.
2. Add a `CS2_SERVER_3_*` block to `cs-docker/.env` with new, non-colliding ports.
3. Add a matching entry to `CS2_SERVER_POOL` in the app's `.env`.

## Production topology

Vercel (where the Next.js app is deployed) is serverless and cannot host long-running game
server processes. This pool needs a separate, always-on host (a small VPS or bare-metal box)
reachable over the internet — all servers in the pool can live on one host (they just need
distinct ports) or be spread across a few. The app and the CS2 servers talk to each other over
that host's public IP/hostname and normal HTTPS/RCON ports — not a shared Docker network — the
same way the app already talks to any other external service.

## Match config / RCON

The app pushes match configuration (teams, players, maps, connect password) to whichever server
in the pool a match was assigned to, via RCON (`matchzy_loadmatch_url` pointing back at the
app's own `GET /api/matches/[matchId]/game-server/match-config` endpoint) when a match starts —
see `src/lib/cs2/`. It does not edit any container's static `.cfg` files per match.
