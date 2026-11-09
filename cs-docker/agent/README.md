# Tournler CS2 host agent

A small program you run on each game host. It lets Tournler create, start, stop and remove CS2
servers from **Admin → Servers**, so adding a server is a button instead of editing compose files.

It is plain Node (24+, no `npm install`) and talks to Docker on the host.

## Why servers here are cheap on disk

A CS2 install is about 50 GB. The old compose setup gave every server its own copy. The agent keeps
**one** copy (`<data>/base`) and mounts it into each server with overlayfs: the shared files are
read-only, and each server only stores what it changes (config, plugins, logs, demos), usually a few
hundred MB. Ten servers cost roughly 50 GB plus a few GB, not 500 GB.

- `SHARE_MODE=overlay` (default on Linux, needs root): one shared install.
- `SHARE_MODE=copy`: a full copy per server, for hosts without overlayfs. The app warns about it.

## What a host needs

- Linux with Docker, run as root (for the overlay mounts).
- Node 24+.
- ~60 GB free for the shared install, plus a few hundred MB per server.
- Ports open to players: each server uses its game port (TCP+UDP) and GOTV port (UDP). RCON (TCP) only
  needs to be reachable from wherever the Tournler app runs; firewall it from everyone else.
- One Steam game server login token per server (Steam ties a token to a single running server).
  Create them at <https://steamcommunity.com/dev/managegameservers> with app id 730.

## Install

```bash
# 1. get this repo on the host (the agent needs cs-docker/settings and agent/)
git clone https://github.com/alt-plus-f4/tournler /opt/tournler

# 2. configure
cp /opt/tournler/cs-docker/agent/agent.env.example /etc/tournler-agent.env
chmod 600 /etc/tournler-agent.env
$EDITOR /etc/tournler-agent.env        # AGENT_SECRET, SRCDS_TOKENS, SETTINGS_DIR

# 3. run it as a service
cp /opt/tournler/cs-docker/agent/tournler-agent.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now tournler-agent

# 4. TLS in front (the app refuses plain http agents in production)
#    see Caddyfile.example, or use WireGuard/Tailscale and a private address
```

## Connect it to Tournler

1. Set `SERVER_SECRET_KEY` in the app's environment (random, 32+ characters) and redeploy.
2. **Admin → Servers → Add host**: public IP, agent URL (`https://agent.example.com`) and the
   `AGENT_SECRET` you set above.
3. On the host card, press **Install game files** once (about 50 GB, runs in the background; progress
   shows on the card).
4. Press **Add server**. Tournler picks the next free ports, generates the passwords, and the agent
   creates and starts the container. CS2 takes a minute or two to come up, then the card turns green.

Add more servers the same way. When a host is full, raise its limit or add another host (another
region, another machine) and repeat.

## Performance settings

- `CPU_LIST` (e.g. `2-7`): each new server is pinned to its own core from the list (`--cpuset-cpus`),
  so servers can't steal time from each other. Leave a couple of cores for the OS, Docker and the
  agent. Once every listed core has a server, creating another is refused. Pinning is chosen at
  creation; existing servers keep theirs.
- `NETWORK_MODE=host`: containers use the host network instead of Docker NAT, which removes per-packet
  overhead on the game's UDP traffic. Each server already has distinct ports, so there are no clashes.
  Firewall RCON to the app's address either way. Default is `bridge`.

Both need a real Linux host to check; the tests only cover the arguments the agent builds.

## Updating CS2

Valve updates break old servers, so update the shared files when a new build ships: stop the
servers on the host, press **Update game files**, start them again. The agent refuses to update while
any of its servers is running, because changing the files under a live server breaks it.

## Things the agent does on purpose

- No Docker restart policy. After a reboot the overlay must be mounted **before** a container starts
  (an empty game directory would trigger a fresh 50 GB download), so the agent remounts and starts
  servers itself, and also restarts any that crash.
- Every request is signed (HMAC-SHA256 over timestamp, method, path and body) and rejected after 60 s.
  Everything that reaches a container argument is validated, and nothing goes through a shell.
- One operation that changes the fleet runs at a time, so two creates can't take the same port or token.

## HTTP API (used by the app)

All requests carry `x-agent-timestamp` and `x-agent-signature`.

| Method | Path                                  |                                           |
| ------ | ------------------------------------- | ----------------------------------------- |
| GET    | `/health`                             | disk, shared files state, update progress |
| GET    | `/servers`                            | managed servers and container state       |
| POST   | `/servers`                            | create and start one                      |
| POST   | `/servers/:slug/start\|stop\|restart` |                                           |
| DELETE | `/servers/:slug`                      | remove container and its data             |
| POST   | `/base/update`                        | install/update the shared game files      |

## Not verified in this repo's tests

The pure parts (signing, validation, argument building, routing, token and port picking) have unit
tests. The overlay mount, the Docker calls and the steamcmd install path (`STEAMCMD_PATH`) can only be
checked on a real Linux host with Docker, so test one server end to end before relying on it.
