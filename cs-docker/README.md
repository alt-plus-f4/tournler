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

## Starting matches requires `pool-controller`

`pool-controller/index.js` must be running (`node pool-controller/index.js`, alongside this
compose stack — see its own header comment) before the app can start any match. A live RCON
`changelevel`/`map` command segfaults this Metamod build unconditionally, regardless of plugins
loaded — see "MatchZy / CounterStrikeSharp" below — so starting a match works by having
`pool-controller` recreate its assigned server's container booted directly onto the match's first
map (`CS2_STARTMAP`), never by changing the map on an already-running server. Set
`POOL_CONTROLLER_TOKEN` in both this directory's `.env` and the app's own `.env` (same value), and
`POOL_CONTROLLER_URL` in the app's `.env` pointing at wherever this runs. Never expose its port to
the public internet — it can trigger arbitrary container recreation on this host.

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

## MatchZy / CounterStrikeSharp: use the KHook-ported forks, not the official releases

The *official* `roflmuffin/CounterStrikeSharp` and `shobhit-pathak/MatchZy` releases cannot run
against a current CS2 engine build at all — this isn't a config problem, it's a real, open
upstream gap. `pre.sh` installs community forks that fix it instead
(`mrc4tt/CounterStrikeSharp`, `mrc4tt/MatchZy`); the sections below are the compatibility history
that led there, kept so it isn't re-discovered from scratch if these forks ever go stale too.

**The gap:** Metamod:Source bumped its plugin-interface version (17 → 18) on 2026-09-08, and in
the same change replaced its SourceHook hooking library with a new one called KHook. The official
CounterStrikeSharp is written directly against the old SourceHook API — its latest release
refuses to load against any interface-18 Metamod build ("Plugin uses old SourceHook Metamod build
... (17 < 18)"), while every interface-17 Metamod build available segfaults the server on the
first round reset (independently confirmed as `shobhit-pathak/MatchZy#380`; the only fix,
`alliedmodders/metamod-source@399ccf3`, is a `third_party/khook` submodule bump with no
SourceHook equivalent, so it can't be backported). We confirmed this isn't just CounterStrikeSharp's
own unmerged `#1314` fix ("Hook_StartupServer firing twice") by building it from source with that
patch applied — it loaded fine but crashed identically on the next round reset regardless.

**What actually works:** `mrc4tt/CounterStrikeSharp` is a maintained fork already ported to KHook
(its `v1.0.399` release notes: *"METAMOD v1461 or later REQUIRED!"*, *"KHook"* support) — paired
with Metamod `git1468` (interface 18, `pre.sh`'s current pin), it loads cleanly
(`meta list` shows no `<ERROR>` tag). The *official* MatchZy release still crashed the server on
a round reset when loaded on top of this CSS fork (caught as a diagnostic crash dump by the fork's
own handler rather than a hard kill, but still fatal) — swapping in the matching
`mrc4tt/MatchZy` fork resolved that too. Confirmed stable for 2+ minutes of real play (bot warmup,
round resets) with `mrc4tt/CounterStrikeSharp` + `mrc4tt/MatchZy` + `git1468` — every prior
combination crashed within about 15 seconds of the map loading.

Every other CS2 match-management plugin checked (MatchUp, ServerStats, cs2-admin-plus,
dreamleague, PugSharp, MatchZy-Enhanced, etc.) is also built on the *official* CounterStrikeSharp,
so none of them sidestep this on their own — swap in `mrc4tt/CounterStrikeSharp` underneath
whichever plugin you actually want to run.

### A second, separate bug: live map changes (`changelevel`) crash the server unconditionally

Independent of the round-reset issue above, a live `changelevel` (or `map`, which is just an
alias for it on this engine) segfaults the CS2 process 100% of the time on this Metamod build —
confirmed directly with CounterStrikeSharp fully unloaded (`meta unload counterstrikesharp`) and
zero plugins running, on multiple destination maps, including the map the server was already on.
This is a long-standing, still-open bug across the ecosystem, not something specific to this
stack or fixable from plugin config — see
[MatchZy#358](https://github.com/shobhit-pathak/MatchZy/issues/358),
[MatchZy#380](https://github.com/shobhit-pathak/MatchZy/issues/380), and
[CounterStrikeSharp#1139](https://github.com/roflmuffin/CounterStrikeSharp/issues/1139), none
resolved as of this writing.

Loading a match whose first map already matches whatever the server is currently sitting on does
**not** trigger a changelevel (MatchZy skips it — confirmed directly) and does not crash. So
instead of ever pushing a match config that might require a live map change, `pool-controller`
recreates the assigned server's container booted directly onto the match's first map before the
config is pushed (see "Starting matches requires `pool-controller`" above and
`src/lib/cs2/provisioning.ts`'s `restartServerOntoMap`). This is only proven out for pickups
(always single-map — see `src/lib/cs2/match-config.ts`). A multi-map series' own map 2/3
transition is still MatchZy's internal changelevel and would still hit this same crash — that
remains an open gap for non-pickup (bracket) matches.

If `pre.sh`'s current pins ever regress (a fork goes stale, or the official releases finally
catch up and you'd rather depend on those instead), the two checks that have each been
individually misleading at least once in this saga are worth repeating together, not separately:
`meta list` over RCON showing CounterStrikeSharp with no `<ERROR>` tag, **and** the server
surviving an actual live round reset, not just a clean boot.

If you want to attempt a from-source CounterStrikeSharp build yourself for some other reason, the
pieces below still apply — drop the result in `.build-cache/counterstrikesharp-custom/`
(gitignored, ~120MB, machine-specific — `pre.sh` prefers it over the fork download automatically
when it's present):

1. Clone with submodules: `git clone --recursive https://github.com/roflmuffin/CounterStrikeSharp.git`
   — do this on a case-sensitive filesystem with long-path support enabled (`git config --global
   core.longpaths true` on Windows still isn't enough on its own; building inside a Linux
   container's own filesystem, as below, sidesteps the whole problem).
2. Apply `roflmuffin/CounterStrikeSharp#1314`'s diff (`src/core/timer_system.{cpp,h}`,
   `src/mm_plugin.cpp` — small, ~40 lines; it doesn't apply cleanly with a plain `git apply`
   against a newer `main`, the conflicting hunk needs a manual one-line reapply — see the PR).
3. Native build, using the project's own `Dockerfile` image
   (`registry.gitlab.steamos.cloud/steamrt/sniper/sdk:latest` — this matters: it's the same
   environment official releases are built with, which is what avoids the ABI-staleness problem):
   ```bash
   cmake -G Ninja -DCMAKE_BUILD_TYPE=Release ..
   cmake --build . --config Release -- -j$(nproc)
   ```
   If `FetchContent` for `distorm` (a `libraries/funchook` dependency) fails with `could not read
   Username for 'https://github.com'` / `expected flush after ref listing`, that's GitHub
   rate-limiting anonymous git-protocol clones, not a real error — fetch
   `https://codeload.github.com/gdabah/distorm/tar.gz/refs/tags/3.5.2b` as a plain tarball instead
   and pass `-DFETCHCONTENT_SOURCE_DIR_DISTORM=<path to it>` to cmake.
4. Managed build (needs the .NET 10 SDK — this part doesn't need Linux or Docker, it's portable):
   `dotnet publish -c Release managed/CounterStrikeSharp.API/CounterStrikeSharp.API.csproj`
   (build the `.csproj` directly rather than the full `.sln` if you only copied out `managed/`,
   since the solution also references sibling `examples/`/`tooling/` projects you likely didn't
   fetch). If it fails on `git describe` (used for version metadata) because the copy isn't a git
   checkout, `git init && git add -A && git commit -m x` in that copy first — the actual commit
   contents don't matter, `git describe` just needs *a* commit to describe.
5. Assemble `addons/counterstrikesharp/{bin,api,dotnet,...}` and `addons/metamod/counterstrikesharp.vdf`
   from the two build outputs, plus the ASP.NET Core runtime the official CI bundles into its
   "with-runtime" package (currently `aspnetcore-runtime-10.0.3-linux-x64.tar.gz` from
   `https://builds.dotnet.microsoft.com/dotnet/aspnetcore/Runtime/10.0.3/` — check
   `.github/workflows/build-and-publish.yml` upstream for the current version if this drifts).
   Drop the result into `.build-cache/counterstrikesharp-custom/` here (mirroring that same
   `addons/` layout) and recreate the container.

Whatever you end up with, verify it two ways before trusting it — either check alone has been
misleading at least once in this file's history: `meta list` over RCON should show
CounterStrikeSharp with no `<ERROR>` tag, **and** the server needs to survive an actual live round
reset without crashing, not just a clean boot.
