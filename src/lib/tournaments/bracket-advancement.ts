import { db } from '@/lib/db';
import { Matches, MatchSlot, Prisma } from '@prisma/client';
import { finalizeTournamentIfComplete } from './tournament-service';
import { ensureGameServer, NoAvailableGameServerError } from './game-server';
import { getVetoState } from './veto';
import { pushMatchConfigToServer, pushRconCommand } from '@/lib/cs2/provisioning';

type Tx = Prisma.TransactionClient;

/** Thrown when a match result conflicts with an already-recorded, different result. */
export class MatchResultConflictError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'MatchResultConflictError';
	}
}

export interface MatchResultInput {
	scoreTeamA?: number;
	scoreTeamB?: number;
	/** Non-pickup matches only — the winning Cs2Team's id. */
	winnerId?: number;
	/** Pickup matches only — which side won (they have no Cs2Team to use as winnerId). */
	winnerSide?: MatchSlot;
}

function slotField(slot: MatchSlot): 'teamAId' | 'teamBId' {
	return slot === 'TEAM_A' ? 'teamAId' : 'teamBId';
}

/** Fills an empty bracket slot on the target match. A no-op if the slot is already filled (idempotent against retries — each slot has exactly one designated feeder, wired once at generation time). */
async function fillSlot(tx: Tx, targetMatchId: number, slot: MatchSlot, teamId: number) {
	await tx.matches.updateMany({
		where: { id: targetMatchId, [slotField(slot)]: null },
		data: { [slotField(slot)]: teamId },
	});
}

/** Propagates a just-completed match's winner (and, for elimination brackets, its loser) into whatever it feeds. */
async function propagateWinner(tx: Tx, match: Matches) {
	if (match.winnerId === null || match.teamAId === null || match.teamBId === null) return;
	const loserId = match.winnerId === match.teamAId ? match.teamBId : match.teamAId;

	if (match.nextMatchId !== null && match.nextMatchSlot !== null) {
		await fillSlot(tx, match.nextMatchId, match.nextMatchSlot, match.winnerId);
	}

	if (match.nextLoserMatchId !== null && match.nextLoserMatchSlot !== null) {
		await fillSlot(tx, match.nextLoserMatchId, match.nextLoserMatchSlot, loserId);
	}

	// Grand Final bracket reset: TEAM_A is always the winners-bracket side by construction
	// (see bracket-generator.ts). If the losers-bracket side (TEAM_B) wins game 1, the
	// losers-bracket team has now beaten the winners-bracket team only once — double
	// elimination requires a second, deciding match. This is the one match created at
	// runtime rather than precomputed, since whether it's needed is only known now.
	if (match.bracketSlot === 'GRAND_FINAL' && match.round === 1 && match.winnerId === match.teamBId) {
		await tx.matches.create({
			data: {
				tournamentId: match.tournamentId,
				teamAId: match.teamAId,
				teamBId: match.teamBId,
				matchDate: new Date(),
				round: 2,
				position: 0,
				bracketSlot: 'GRAND_FINAL',
			},
		});
	}
}

/**
 * Records a match result (score and/or final winner), advancing the bracket and
 * finalizing the tournament as needed. The single write path shared by the
 * CS2 game-server ingestion route and the manual match-edit route.
 *
 * Idempotent: re-recording the same winner on an already-completed match is a
 * no-op (safe for game-server retries). Recording a *different* winner on an
 * already-completed match throws `MatchResultConflictError`.
 */
export async function recordMatchResult(matchId: number, input: MatchResultInput): Promise<Matches> {
	return db.$transaction(async (tx) => {
		const match = await tx.matches.findUniqueOrThrow({ where: { id: matchId } });

		// Pickup matches never have real teamAId/teamBId (sides are MatchParticipant rows, not
		// Cs2Teams), so score writes must be allowed without slots filled — and their winner is
		// recorded via winnerSide (which side, TEAM_A/TEAM_B) instead of winnerId (a Cs2Team id),
		// since there's no Cs2Team to be the winner.
		if (!match.isPickup && (match.teamAId === null || match.teamBId === null)) {
			throw new Error('Cannot record a result for a match whose bracket slots are not both filled yet');
		}

		if (match.isPickup) {
			if (input.winnerId !== undefined) {
				throw new Error('Pickup matches have no Cs2Team winner — pass winnerSide instead of winnerId');
			}
		} else {
			if (input.winnerSide !== undefined) {
				throw new Error('winnerSide only applies to pickup matches — pass winnerId instead');
			}
			if (input.winnerId !== undefined && input.winnerId !== match.teamAId && input.winnerId !== match.teamBId) {
				throw new Error('winnerId must be one of the match participants');
			}
		}

		const incomingWinner = match.isPickup ? input.winnerSide : input.winnerId;

		if (match.status === 'COMPLETED') {
			const currentWinner = match.isPickup ? match.winnerSide : match.winnerId;
			if (incomingWinner !== undefined && incomingWinner !== currentWinner) {
				throw new MatchResultConflictError(`Match ${matchId} is already completed with a different winner`);
			}
			return match;
		}

		const now = new Date();
		const isCompleting = incomingWinner !== undefined;

		const { count } = await tx.matches.updateMany({
			where: { id: matchId, status: { not: 'COMPLETED' } },
			data: {
				scoreTeamA: input.scoreTeamA,
				scoreTeamB: input.scoreTeamB,
				winnerId: match.isPickup ? undefined : input.winnerId,
				winnerSide: match.isPickup ? input.winnerSide : undefined,
				// A plain score update (no winner) must not disturb the match's current
				// LIVE/PAUSED state or its elapsed-time bookkeeping — forcing status back to LIVE
				// here used to silently un-pause a PAUSED match (clearing pausedAt without shifting
				// startedAt the way resumeMatch() does), corrupting the displayed timer.
				status: isCompleting ? 'COMPLETED' : match.status,
				startedAt: match.startedAt ?? now,
				pausedAt: isCompleting ? null : match.pausedAt,
				completedAt: isCompleting ? now : undefined,
			},
		});

		if (count === 0) {
			// Lost a race to another concurrent writer — re-check whether it converged to the
			// same result (idempotent) or a genuine conflict.
			const raced = await tx.matches.findUniqueOrThrow({ where: { id: matchId } });
			const racedWinner = match.isPickup ? raced.winnerSide : raced.winnerId;
			if (incomingWinner !== undefined && racedWinner !== incomingWinner) {
				throw new MatchResultConflictError(`Match ${matchId} was completed concurrently with a different winner`);
			}
			return raced;
		}

		const updated = await tx.matches.findUniqueOrThrow({ where: { id: matchId } });

		if (updated.status === 'COMPLETED') {
			await propagateWinner(tx, updated);
			await finalizeTournamentIfComplete(tx, updated.tournamentId);
		}

		return updated;
	});
}

/** Thrown when a lifecycle action (start/pause/resume) doesn't apply to the match's current status. */
export class MatchLifecycleError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'MatchLifecycleError';
	}
}

/**
 * Manually transitions a scheduled match to live, without requiring a score yet — used by
 * admin controls to test the live-match flow. Also provisions the match's game server (or
 * reuses one that already exists) in the same transaction, so the connect info the
 * game-state pipeline is keyed on exists as soon as the match goes live — this deployment runs
 * a fixed-size pool of real CS2 servers (see `src/lib/cs2/server-pool.ts`), so `ensureGameServer`
 * rejects starting the match if every server in the pool is already claimed by another
 * LIVE/PAUSED match, surfaced here as `MatchLifecycleError`. Once the transaction commits,
 * pushes the match config to the real server over RCON — a network side effect kept outside the
 * transaction, and treated as non-fatal (logged, not thrown) so a temporarily unreachable game
 * server never blocks the match itself from going live in the app.
 */
export interface MatchActionResult {
	match: Matches;
	/** Non-null if the DB write succeeded but pushing the corresponding action to the real game server over
	 * RCON failed — the caller should surface this so an organizer can retry (via the RCON console or the
	 * manual sync endpoint) instead of it only reaching a server log. */
	configPushError: string | null;
}

/** Runs `command` against `matchId`'s assigned server after its DB write already committed, treating a failure as non-fatal (logged and returned as `configPushError`, never thrown) — the app-side state change already succeeded and shouldn't be rolled back over a flaky RCON connection. */
async function pushRconAfterCommit(matchId: number, match: Matches, command: string): Promise<MatchActionResult> {
	let configPushError: string | null = null;
	try {
		await pushRconCommand(matchId, command);
	} catch (error) {
		console.error(`Failed to push RCON command "${command}" for match ${matchId}:`, error);
		configPushError = error instanceof Error ? error.message : `Failed to push "${command}" to game server`;
	}
	return { match, configPushError };
}

export async function startMatch(matchId: number): Promise<MatchActionResult> {
	const updated = await db.$transaction(async (tx) => {
		const match = await tx.matches.findUniqueOrThrow({ where: { id: matchId }, include: { tournament: true, mapActions: true } });
		if (match.status !== 'SCHEDULED') {
			throw new MatchLifecycleError(`Match ${matchId} is not scheduled (current status: ${match.status})`);
		}
		// Pickup matches have no Cs2Team slots to fill (sides are MatchParticipant rows).
		if (!match.isPickup && (match.teamAId === null || match.teamBId === null)) {
			throw new MatchLifecycleError('Cannot start a match whose bracket slots are not both filled yet');
		}
		// Pickup matches have no team-vs-team veto; every other match must finish map veto first.
		if (!match.isPickup) {
			const vetoState = getVetoState(match, match.tournament.mapPool, match.tournament.bestOf);
			if (vetoState.phase !== 'COMPLETE') {
				throw new MatchLifecycleError('Map veto is not complete');
			}
		}
		const updatedMatch = await tx.matches.update({ where: { id: matchId }, data: { status: 'LIVE', startedAt: new Date() } });
		try {
			await ensureGameServer(tx, matchId);
		} catch (error) {
			if (error instanceof NoAvailableGameServerError) {
				throw new MatchLifecycleError(error.message);
			}
			throw error;
		}
		return updatedMatch;
	});

	let configPushError: string | null = null;
	try {
		await pushMatchConfigToServer(matchId);
	} catch (error) {
		console.error(`Failed to push match config to game server for match ${matchId}:`, error);
		configPushError = error instanceof Error ? error.message : 'Failed to push match config to game server';
	}

	return { match: updated, configPushError };
}

/**
 * Pauses a live match, freezing its elapsed-time display until resumed, and pushes the equivalent
 * admin pause to the real server over RCON (`css_forcepause` — verified against MatchZy's `dev`
 * branch `ConsoleCommands.cs`; see `pushRconCommand`'s doc comment) so the actual game pauses too,
 * not just the app's record of it.
 */
export async function pauseMatch(matchId: number): Promise<MatchActionResult> {
	const match = await db.$transaction(async (tx) => {
		const match = await tx.matches.findUniqueOrThrow({ where: { id: matchId } });
		if (match.status !== 'LIVE') {
			throw new MatchLifecycleError(`Match ${matchId} is not live (current status: ${match.status})`);
		}
		return tx.matches.update({ where: { id: matchId }, data: { status: 'PAUSED', pausedAt: new Date() } });
	});
	return pushRconAfterCommit(matchId, match, 'css_forcepause');
}

/**
 * Resumes a paused match, shifting `startedAt` forward by the paused duration so elapsed-time
 * math stays correct across multiple pause/resume cycles, and pushes the equivalent admin
 * unpause to the real server over RCON (`css_forceunpause`).
 */
export async function resumeMatch(matchId: number): Promise<MatchActionResult> {
	const match = await db.$transaction(async (tx) => {
		const match = await tx.matches.findUniqueOrThrow({ where: { id: matchId } });
		if (match.status !== 'PAUSED') {
			throw new MatchLifecycleError(`Match ${matchId} is not paused (current status: ${match.status})`);
		}
		const pausedMs = match.pausedAt ? Date.now() - match.pausedAt.getTime() : 0;
		const newStartedAt = match.startedAt ? new Date(match.startedAt.getTime() + pausedMs) : new Date();
		return tx.matches.update({ where: { id: matchId }, data: { status: 'LIVE', startedAt: newStartedAt, pausedAt: null } });
	});
	return pushRconAfterCommit(matchId, match, 'css_forceunpause');
}

/**
 * Resets a LIVE/PAUSED match back to SCHEDULED — clears its score, winner, and timer state (and,
 * for bo1/bo3 series, every MatchMap's result and this match's player stats) so it can be started
 * fresh, e.g. after the server-side match got into a broken state. Team assignments, the map veto
 * result, and the assigned game server (see ensureGameServer — it reuses an existing GameServer
 * row) are left untouched: the admin re-runs Start Match afterwards, which re-pushes a clean
 * config to the same server. Also pushes the equivalent admin restart to the real server itself
 * over RCON (`css_restart`) so the live game resets immediately too, not just the app's record.
 *
 * Deliberately not allowed on a COMPLETED match — that already propagated its winner into the
 * bracket (propagateWinner) and possibly finalized the tournament; unwinding that safely is out
 * of scope here.
 */
export async function restartMatch(matchId: number): Promise<MatchActionResult> {
	const match = await db.$transaction(async (tx) => {
		const match = await tx.matches.findUniqueOrThrow({ where: { id: matchId } });
		if (match.status !== 'LIVE' && match.status !== 'PAUSED') {
			throw new MatchLifecycleError(`Match ${matchId} is not live or paused (current status: ${match.status}) — a completed match can't be restarted`);
		}

		// No-op for pickups (no MatchMap rows — see finalizeVeto) and for bo1 matches before any
		// map result was recorded; otherwise clears each map back to its pre-play state so
		// recordMapResult's "already completed" idempotency doesn't block replaying it.
		await tx.matchMap.updateMany({
			where: { matchId },
			data: { scoreTeamA: null, scoreTeamB: null, winnerId: null, status: 'SCHEDULED', startedAt: null, completedAt: null },
		});

		await tx.playerMatchStat.deleteMany({ where: { matchId } });

		return tx.matches.update({
			where: { id: matchId },
			data: {
				status: 'SCHEDULED',
				scoreTeamA: null,
				scoreTeamB: null,
				winnerId: null,
				winnerSide: null,
				startedAt: null,
				pausedAt: null,
				completedAt: null,
			},
		});
	});
	return pushRconAfterCommit(matchId, match, 'css_restart');
}

export interface RoundRobinStanding {
	teamId: number;
	wins: number;
	losses: number;
	played: number;
}

/** Computed on read (not persisted): wins desc, then head-to-head, then team id as a deterministic final tiebreak. */
export async function computeRoundRobinStandings(tournamentId: number): Promise<RoundRobinStanding[]> {
	const tournament = await db.cs2Tournament.findUniqueOrThrow({
		where: { id: tournamentId },
		include: { teams: true, matches: true },
	});

	const standings = new Map<number, RoundRobinStanding>();
	for (const team of tournament.teams) {
		standings.set(team.id, { teamId: team.id, wins: 0, losses: 0, played: 0 });
	}

	const completed = tournament.matches.filter((m) => m.status === 'COMPLETED' && m.winnerId !== null);
	for (const m of completed) {
		const loserId = m.winnerId === m.teamAId ? m.teamBId : m.teamAId;
		const winner = standings.get(m.winnerId as number);
		const loser = loserId !== null ? standings.get(loserId) : undefined;
		if (winner) {
			winner.wins += 1;
			winner.played += 1;
		}
		if (loser) {
			loser.losses += 1;
			loser.played += 1;
		}
	}

	const headToHeadWinner = (aId: number, bId: number): number | null => {
		const match = completed.find((m) => (m.teamAId === aId && m.teamBId === bId) || (m.teamAId === bId && m.teamBId === aId));
		return match?.winnerId ?? null;
	};

	return Array.from(standings.values()).sort((a, b) => {
		if (b.wins !== a.wins) return b.wins - a.wins;
		const h2h = headToHeadWinner(a.teamId, b.teamId);
		if (h2h === a.teamId) return -1;
		if (h2h === b.teamId) return 1;
		return a.teamId - b.teamId;
	});
}
