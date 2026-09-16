/**
 * Base URL the *real CS2 server* (not a browser) uses to call back into this app —
 * `matchzy_loadmatch_url`, `matchzy_demo_upload_url`, `matchzy_remote_log_url`. This is often a
 * different address than `NEXTAUTH_URL`: in local dev the app runs on the host as
 * `http://localhost:3000` (correct for the browser and for NextAuth redirects), but the CS2
 * server runs inside a Docker container where `localhost` refers to the container itself, not
 * the host — the container needs `http://host.docker.internal:3000` (Docker Desktop's fixed
 * name for the host machine) instead. Getting this wrong doesn't surface as an error anywhere in
 * the app: the game server's fetch just fails silently on its side, match config never loads,
 * and MatchZy's `matchzy_kick_when_no_match_loaded` then kicks every connecting player —
 * including ones who did join a side through the match page — because as far as MatchZy is
 * concerned no match ever loaded at all.
 *
 * Falls back to `NEXTAUTH_URL` so single-host/production deployments (where the app and the CS2
 * server pool are both reachable at the same public hostname) don't need to set this separately.
 */
export function gameServerCallbackUrl(): string | undefined {
	return process.env.GAME_SERVER_CALLBACK_URL || process.env.NEXTAUTH_URL;
}
