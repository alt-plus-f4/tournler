#!/bin/bash
# PRE HOOK
#  Make your customisation here
echo gosho

ensure_directory() {
  local dir_path="$1"
  if [ ! -d "$dir_path" ]; then
    echo "Error: Directory $dir_path does not exist."
    exit 1
  fi
}

extract_content() {
  local source_file="$1"
  local target_dir="$2"
  local exclude_dir="$3"

  if [[ $source_file == *.zip ]]; then
    echo "Extracting $source_file to $target_dir..."
    unzip -q -o "$source_file" -d "$target_dir" -x "$exclude_dir"
  elif [[ $source_file == *.tar.gz ]]; then
    echo "Extracting $source_file to $target_dir..."
    tar -xzf "$source_file" -C "$target_dir" --exclude "$exclude_dir"
  else
    echo "Error: Unknown file extension for $source_file."
    return 1
  fi
  echo "Extracted content to $target_dir"
  return 0
}

# Step 0: Parameters
ServerFilesPath=$STEAMAPPDIR

# Step 1: Download and Install Metamod
# git1468 (2026-09-15, SourceHook interface 18, includes upstream commit 399ccf3 "Tentative fix
# for shutdown crash"): the newest build confirmed to boot the current CS2 engine cleanly, under
# real play, with no crash. The *official* CounterStrikeSharp/MatchZy releases can't load against
# an interface-18 Metamod at all (they're still on SourceHook/interface 17) — see Step 2/3 for the
# forks that actually work here, and cs-docker/README.md for the full compatibility history this
# pin comes out of.
wget -q -O /tmp/mmsource.tar.gz https://mms.alliedmods.net/mmsdrop/2.0/mmsource-2.0.0-git1468-linux.tar.gz
ensure_directory "${ServerFilesPath}/game/csgo"
extract_content "/tmp/mmsource.tar.gz" "${ServerFilesPath}/game/csgo"

# Step 2: Install CounterStrikeSharp Plugin
# Prefers a locally-built package (mounted read-only at custom-counterstrikesharp — see
# docker-compose.yml) if one is present, otherwise installs mrc4tt/CounterStrikeSharp — a
# maintained fork ported to Metamod's new KHook hooking library (its v1.0.399 release notes:
# "METAMOD v1461 or later REQUIRED!", "KHook" support). The *official* roflmuffin release is still
# built against the old SourceHook API and can't load against git1468 at all ("Plugin uses old
# SourceHook Metamod build ... (17 < 18)") — see cs-docker/README.md for why. Confirmed working
# with this Metamod pin: `meta list` shows CounterStrikeSharp with no <ERROR> tag, and the server
# survives real play (round resets, bot warmup) — the actual bar that kept failing before this.
custom_cssharp_dir="${ServerFilesPath}/custom-counterstrikesharp"
if [ -d "$custom_cssharp_dir" ] && [ -n "$(ls -A "$custom_cssharp_dir" 2>/dev/null)" ]; then
  echo "Installing CounterStrikeSharp from the locally-built package at $custom_cssharp_dir"
  mkdir -p "${ServerFilesPath}/game/csgo/addons"
  cp -r "$custom_cssharp_dir"/. "${ServerFilesPath}/game/csgo/addons/"
else
  cssharp_url=$(curl -s https://api.github.com/repos/mrc4tt/CounterStrikeSharp/releases/latest | grep "with-runtime" | grep "linux" | grep "browser_download_url" | cut -d '"' -f 4)
  echo $cssharp_url
  if [ -z "$cssharp_url" ]; then
    echo "Error: Unable to find CounterStrikeSharp download URL."
    exit 1
  fi

  wget -q -O /tmp/cssharp.zip "$cssharp_url"
  extract_content "/tmp/cssharp.zip" "${ServerFilesPath}/game/csgo"
fi

# Step 3: Download and Install MatchZy Plugin
# Using mrc4tt/MatchZy (a fork by the same author as the CounterStrikeSharp fork above, kept in
# sync with it) instead of the official shobhit-pathak/MatchZy release: paired with the official
# MatchZy, the mrc4tt CounterStrikeSharp fork still loaded fine but the server segfaulted on the
# very next round reset (caught as a diagnostic crash dump by this CSS fork's own handler rather
# than a hard kill, but still fatal to the process). Swapping in this matching MatchZy fork
# resolved it — confirmed stable for 2+ minutes of real play (bot warmup, round resets), where
# every prior combination crashed within ~15 seconds. Asset naming here is plain "MatchZy-X.Y.zip"
# (no bracket-expression regex or with-cssharp bundle to exclude like the official release has).
matchzy_url=$(curl -s https://api.github.com/repos/mrc4tt/MatchZy/releases/latest | grep "browser_download_url" | grep -E "MatchZy-[0-9]+\.[0-9]+(\.[0-9]+)?\.zip" | cut -d '"' -f 4)
if [ -z "$matchzy_url" ]; then
  echo "Error: Unable to find MatchZy download URL."
  exit 1
fi

wget -q -O /tmp/matchzy.zip "$matchzy_url"
extract_content "/tmp/matchzy.zip" "${ServerFilesPath}/game/csgo" "cfg/*"

# Step 4: Modify the gameinfo.gi File
gameinfo_path="${ServerFilesPath}/game/csgo/gameinfo.gi"
echo "Checking if gameinfo.gi file exists at $gameinfo_path"
if [ -f "$gameinfo_path" ]; then
  echo "File exists. Attempting to modify..."

  NEW_ENTRY="                        Game    csgo/addons/metamod"

  if grep -Fxq "$NEW_ENTRY" "$gameinfo_path"; then
    echo "The entry '$NEW_ENTRY' already exists in ${gameinfo_path}. No changes were made."
  else
    awk -v new_entry="$NEW_ENTRY" '
            BEGIN { found=0; }
            // {
                if (found) {
                    print new_entry;
                    found=0;
                }
                print;
            }
            /Game_LowViolence/ { found=1; }
        ' "$gameinfo_path" >"$gameinfo_path.tmp" && mv "$gameinfo_path.tmp" "$gameinfo_path"

    echo "The file ${gameinfo_path} has been modified successfully. '$NEW_ENTRY' has been added."
  fi

else
  echo "Error: gameinfo.gi file not found at $gameinfo_path."
  exit 1
fi

# Step 5: Done
echo "pre-hook: done"
