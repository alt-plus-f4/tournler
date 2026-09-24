import type { Game } from '@prisma/client';
import type { DbTx } from '@/lib/db';
import { db } from '@/lib/db';
import { GAME_META } from '@/lib/games';

type Db = DbTx | typeof db;

/**
 * Which games Tournler runs the hosted-server pipeline for: provisioning a server from the pool,
 * MatchZy config pushes, RCON, map veto and captain draft. Only CS2. League of Legends is played
 * in the Riot client, so a LoL match never touches a game server; staff record its result instead
 * (Phase 1 — see PRODUCT.md "the server is the source of truth", which doesn't hold for LoL).
 */
export function hostsGameServers(game: Game): boolean {
	return game === 'CS2';
}

/** Thrown when a CS2-only server action (provision, config push, RCON, veto, draft) is attempted for a game Tournler doesn't host. */
export class HostedServerUnsupportedError extends Error {
	readonly game: Game;
	constructor(game: Game, action: string) {
		super(`${GAME_META[game].label} matches have no hosted server, so there's nothing to ${action}. Play in the game client; an organizer records the result.`);
		this.name = 'HostedServerUnsupportedError';
		this.game = game;
	}
}

export function assertHostsGameServers(game: Game, action: string): void {
	if (!hostsGameServers(game)) throw new HostedServerUnsupportedError(game, action);
}

/** The game a match belongs to, read off its tournament (matches don't carry their own game column). */
export async function getMatchGame(tx: Db, matchId: number): Promise<Game> {
	const match = await tx.matches.findUniqueOrThrow({ where: { id: matchId }, select: { tournament: { select: { game: true } } } });
	return match.tournament.game;
}

/** `assertHostsGameServers` for a match id: throws `HostedServerUnsupportedError` unless the match's tournament is CS2. */
export async function assertMatchHostsGameServer(tx: Db, matchId: number, action: string): Promise<void> {
	assertHostsGameServers(await getMatchGame(tx, matchId), action);
}
