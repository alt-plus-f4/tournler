#!/usr/bin/env bash
# Add another CS2 server to the compose pool without re-downloading ~50 GB.
#
#   ./add-server.sh            # next free number
#   ./add-server.sh 4          # a specific number (2 or higher)
#
# It clones data/cs2-dedicated-01 (copy-on-write where the filesystem allows, so the extra disk is
# only what diverges), appends a service to docker-compose.yml and a CS2_SERVER_<N>_* block to .env,
# and prints the entry to add to CS2_SERVER_POOL in the app's own .env.
#
# Run it from anywhere; it works relative to this file. Stop server 01 first (the script refuses
# while it is running): cloning a live install can copy half-written files.
set -euo pipefail

cd "$(dirname "$0")"

COMPOSE=docker-compose.yml
ENVFILE=.env
SOURCE=data/cs2-dedicated-01

die() { echo "error: $*" >&2; exit 1; }

[[ -f $COMPOSE ]] || die "$COMPOSE not found"
[[ -f $ENVFILE ]] || die "$ENVFILE not found (cp .env.example .env first)"
[[ -d $SOURCE ]] || die "$SOURCE not found. Start server 01 once and let it finish downloading CS2."

# Pick the number.
if [[ $# -ge 1 ]]; then
  N=$1
  [[ $N =~ ^[0-9]+$ ]] && (( N >= 2 && N <= 99 )) || die "number must be between 2 and 99"
else
  N=2
  while [[ -e data/cs2-dedicated-$(printf '%02d' "$N") ]] || grep -q "^  cs2-dedicated-$(printf '%02d' "$N"):" "$COMPOSE"; do
    N=$((N + 1))
  done
fi
NN=$(printf '%02d' "$N")
NAME=cs2-dedicated-$NN

[[ ! -e data/$NAME ]] || die "data/$NAME already exists"
grep -q "^  $NAME:" "$COMPOSE" && die "$NAME is already in $COMPOSE"

# If .env already has this server's block (.env.example ships one for 02), reuse its values.
HAVE_ENV=0
envval() { grep -E "^CS2_SERVER_${N}_$1=" "$ENVFILE" | tail -1 | cut -d= -f2- | sed 's/[[:space:]]*#.*$//'; }
if grep -q "^CS2_SERVER_${N}_PORT=" "$ENVFILE"; then HAVE_ENV=1; fi

# Don't clone a running install.
if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' 2>/dev/null | grep -qx cs2-dedicated-01; then
  die "cs2-dedicated-01 is running. Run 'docker compose stop cs2-dedicated-01', then try again."
fi

# Ports follow the existing pattern: 01 = 27015/27016/27020, 02 = 27025/27026/27030, ...
rand() { openssl rand -hex 8; }
if (( HAVE_ENV )); then
  GAME=$(envval PORT); RCON=$(envval RCON_PORT); TV=$(envval TV_PORT)
  PW=$(envval PW); RCONPW=$(envval RCONPW); TVPW=""
  [[ -n $GAME && -n $RCON && -n $TV ]] || die "CS2_SERVER_${N}_* in $ENVFILE is incomplete (need PORT, RCON_PORT, TV_PORT)"
else
  GAME=$((27015 + 10 * (N - 1)))
  RCON=$((GAME + 1))
  TV=$((27020 + 10 * (N - 1)))
  for p in "$GAME" "$RCON" "$TV"; do
    grep -Eq "^CS2_SERVER_[0-9]+_(PORT|RCON_PORT|TV_PORT)=$p\b" "$ENVFILE" && die "port $p is already used in $ENVFILE"
  done
  PW=$(rand); RCONPW=$(rand); TVPW=$(rand)
fi

# Copy-on-write clone: APFS (macOS) and btrfs/xfs (Linux). Anywhere else this is a full 50 GB copy.
echo "Cloning $SOURCE -> data/$NAME ..."
case "$(uname -s)" in
  Darwin) cp -cR "$SOURCE" "data/$NAME" ;;
  *)
    if cp -a --reflink=always "$SOURCE" "data/$NAME" 2>/dev/null; then
      :
    else
      rm -rf "data/$NAME"
      echo "warning: this filesystem can't clone files; making a full copy (~50 GB)." >&2
      cp -a "$SOURCE" "data/$NAME"
    fi
    ;;
esac

if (( ! HAVE_ENV )); then
cat >>"$ENVFILE" <<EOF

# --- Server $N ---
CS2_SERVER_${N}_NAME=[Tournler] CS2 Dedicated Server $NN
CS2_SERVER_${N}_PORT=$GAME
CS2_SERVER_${N}_RCON_PORT=$RCON
CS2_SERVER_${N}_TV_PORT=$TV
CS2_SERVER_${N}_PW=$PW
CS2_SERVER_${N}_RCONPW=$RCONPW
CS2_SERVER_${N}_TV_PW=$TVPW
# Steam ties a login token to ONE running server. Set a token per server; this falls back to the
# shared SRCDS_TOKEN only if left empty.
CS2_SERVER_${N}_TOKEN=
EOF
fi

# Ensure the compose file ends with a newline before appending.
[[ -z $(tail -c1 "$COMPOSE") ]] || echo >>"$COMPOSE"

cat >>"$COMPOSE" <<EOF

  $NAME:
    <<: *cs2-server
    container_name: $NAME
    environment:
      - SRCDS_TOKEN=\${CS2_SERVER_${N}_TOKEN:-\${SRCDS_TOKEN}}
      - CS2_SERVERNAME=\${CS2_SERVER_${N}_NAME:-[Tournler] CS2 Dedicated Server $NN}
      - CS2_LAN=0
      - CS2_PORT=\${CS2_SERVER_${N}_PORT:-$GAME}
      - CS2_RCON_PORT=\${CS2_SERVER_${N}_RCON_PORT:-$RCON}
      - CS2_PW=\${CS2_SERVER_${N}_PW}
      - CS2_RCONPW=\${CS2_SERVER_${N}_RCONPW}
      - TV_PW=\${CS2_SERVER_${N}_TV_PW}
      - TV_ENABLE=1
      - CS2_MAPGROUP=\${CS2_MAPGROUP:-}
      - CS2_STARTMAP=\${CS2_SERVER_${N}_STARTMAP:-de_dust2}
    volumes:
      - ./data/$NAME:/home/steam/cs2-dedicated
      - ./settings/pre.sh:/home/steam/cs2-dedicated/pre.sh
      - ./settings/post.sh:/home/steam/cs2-dedicated/post.sh
      - ./settings/game/csgo/cfg/MatchZy:/home/steam/cs2-dedicated/game/csgo/cfg/MatchZy
      - ./.build-cache/counterstrikesharp-custom:/home/steam/cs2-dedicated/custom-counterstrikesharp:ro
    ports:
      - '\${CS2_SERVER_${N}_PORT:-$GAME}:\${CS2_SERVER_${N}_PORT:-$GAME}/tcp'
      - '\${CS2_SERVER_${N}_RCON_PORT:-$RCON}:\${CS2_SERVER_${N}_RCON_PORT:-$RCON}/tcp'
      - '\${CS2_SERVER_${N}_PORT:-$GAME}:\${CS2_SERVER_${N}_PORT:-$GAME}/udp'
      - '\${CS2_SERVER_${N}_TV_PORT:-$TV}:\${CS2_SERVER_${N}_TV_PORT:-$TV}/udp'
EOF

echo
echo "Added $NAME (game $GAME, rcon $RCON, gotv $TV)."
echo
echo "Next:"
echo "  1. Put this server's Steam token in $ENVFILE as CS2_SERVER_${N}_TOKEN"
echo "  2. docker compose up -d $NAME"
echo "  3. Add it to CS2_SERVER_POOL in the app's .env (or Admin -> Servers -> Import from env):"
echo "     {\"id\":\"$NN\",\"ip\":\"<your-host>\",\"port\":$GAME,\"rconPort\":$RCON,\"rconPassword\":\"$RCONPW\"}"
