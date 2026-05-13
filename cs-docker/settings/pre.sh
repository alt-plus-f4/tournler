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
wget -q -O /tmp/mmsource.tar.gz https://mms.alliedmods.net/mmsdrop/2.0/mmsource-2.0.0-git1293-linux.tar.gz
ensure_directory "${ServerFilesPath}/game/csgo"
extract_content "/tmp/mmsource.tar.gz" "${ServerFilesPath}/game/csgo"

# Step 2: Download and Install CounterStrikeSharp Plugin
cssharp_url=$(curl -s https://api.github.com/repos/roflmuffin/CounterStrikeSharp/releases/latest | grep "with-runtime-build" | grep "linux" | grep "browser_download_url" | cut -d '"' -f 4)
echo $cssharp_url
if [ -z "$cssharp_url" ]; then
  echo "Error: Unable to find CounterStrikeSharp download URL."
  exit 1
fi

wget -q -O /tmp/cssharp.zip "$cssharp_url"
extract_content "/tmp/cssharp.zip" "${ServerFilesPath}/game/csgo"

# Step 3: Download and Install MatchZy Plugin
matchzy_url=$(curl -s https://api.github.com/repos/shobhit-pathak/MatchZy/releases/latest | grep "MatchZy-[d+].[d+].[d+].zip" | grep "browser_download_url" | cut -d '"' -f 4)
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
