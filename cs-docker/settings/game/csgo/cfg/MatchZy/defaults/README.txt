MatchZy - reference defaults
============================

This folder holds the default config files of the MatchZy version that is
currently installed. MatchZy rewrites it every time the plugin loads, so it
always matches the running version.

  - Nothing in this folder is executed or read by MatchZy.
  - Do NOT edit files here. Your changes are overwritten on the next load.
    Edit the files one folder up instead (the folder that contains this
    "defaults" folder).

What it is for
--------------
Your own config files are never overwritten by an update. When a release
changes a default (the changelog says which file and which setting), compare
your file with the copy in this folder and copy over the lines you want.

  Linux:    diff ../live.cfg live.cfg
  Windows:  fc ..\live.cfg live.cfg

Getting a fresh default
-----------------------
Delete (or rename) your own file, for example warmup.cfg, and restart the
server or reload the plugin. MatchZy writes the current default in its place.
For config.cfg this resets every plugin setting: keep a copy and copy your own
values back afterwards.

Your own changes to a mode
--------------------------
Instead of editing warmup.cfg (or any other mode cfg), you can put only the
lines you want to change in a file named after it with "_override" added,
for example warmup_override.cfg, one folder up. MatchZy runs it right after
warmup.cfg, so its values win. MatchZy never creates or changes these files.
Works for warmup, knife, live, live_wingman, scrim, hill, prac, dryrun and
sleep. Settings from a loaded match config's "cvars" block still apply on top.

config.cfg
----------
New settings are added to the bottom of your existing config.cfg
automatically, under a "// --- Added by MatchZy update" header. Settings you
already have, including commented-out ones, are left alone. Changed defaults of
existing settings are not applied for you: compare with config.cfg here.
The only lines MatchZy removes are settings that no longer exist (renamed or
retired), so the server does not log "Unknown command" for them.

database.json.example
---------------------
Example of database.json with the MySQL fields. MatchZy creates the real
database.json (SQLite) one folder up on first load if it does not exist.
To use MySQL, copy the MySQL fields into that file, set "DatabaseType" to
"MySQL" and restart the server.

Files
-----
One copy of every default cfg this version ships: config.cfg holds the plugin
settings (matchzy_* convars), matchzymaps.cfg the map rotation, and each other
file is the game-mode config it is named after (warmup.cfg, knife.cfg,
live.cfg, prac.cfg, ...).

admins.json, whitelist.cfg and savednades.json are not here: MatchZy creates
them one folder up the first time they are needed, and they have no defaults
to compare with.
