export interface TeamMember {
	id: string;
	name: string | null;
	image: string | null;
	createdAt?: string;
	// Real FACEIT CS2 level (src/lib/faceit.ts), looked up server-side by linked Steam account —
	// null if Steam isn't linked, no FACEIT account exists for CS2, or FACEIT_API_KEY is unset.
	faceitLevel: number | null;
}

export interface Team {
	id: number;
	name: string;
	logo: string | null;
	background?: string | null;
	capitanId?: string | null;
	members: TeamMember[];
}

export interface MatchMapRow {
	id: number;
	mapName: string;
	order: number;
	scoreTeamA: number | null;
	scoreTeamB: number | null;
	winnerId: number | null;
	status: string;
	demoUrl: string | null;
}

export type Side = 'TEAM_A' | 'TEAM_B';

export type VetoActionType = 'BAN' | 'PICK' | 'DECIDER';

export interface VetoActionRow {
	teamId: number | null;
	side: Side | null;
	action: VetoActionType;
	mapName: string;
	order: number;
}

export interface VetoState {
	phase: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';
	bestOf: 1 | 3;
	sequenceLength: number;
	mapPool: string[];
	availableMaps: string[];
	actions: VetoActionRow[];
	currentTurnTeamId: number | null;
	currentTurnSide: Side | null;
	nextActionType: 'BAN' | 'PICK' | null;
	confirmedMaps: string[];
}

export interface GameServer {
	id: number;
	matchId: number;
	connectIp: string;
	port: number;
	status: string;
	password?: string | null;
	matchConfigLoadedAt?: string | null;
}

export interface Participant {
	userId: string;
	side: Side | 'POOL';
	isCaptain: boolean;
	user: { id: string; name: string | null; image: string | null; faceitLevel: number | null };
}

export interface DraftState {
	phase: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';
	captainAUserId: string | null;
	captainBUserId: string | null;
	poolUserIds: string[];
	picks: { captainSide: Side; pickedUserId: string; order: number }[];
	currentTurnSide: Side | null;
}

export interface PlayerStatRow {
	userId: string;
	teamId: number | null;
	side: Side | null;
	kills: number;
	deaths: number;
	assists: number;
	user: { id: string; name: string | null; image: string | null };
}

export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'PAUSED' | 'COMPLETED';

export interface Match {
	id: number;
	tournament: {
		id: number;
		name: string;
		status: string;
	};
	teamA: Team | null;
	teamB: Team | null;
	scoreTeamA: number | null;
	scoreTeamB: number | null;
	winner: Team | null;
	// Pickup-match winner — see Matches.winnerSide. null for non-pickup matches (they use `winner`).
	winnerSide: Side | null;
	matchDate: string;
	status: MatchStatus;
	startedAt: string | null;
	pausedAt: string | null;
	completedAt: string | null;
	gameServer: GameServer | null;
	isPickup: boolean;
	pickupMode: 'OPEN' | 'CAPTAIN_DRAFT' | null;
	teamAName: string | null;
	teamBName: string | null;
	bestOf: number | null;
	maps: MatchMapRow[];
	participants: Participant[];
	playerStats: PlayerStatRow[];
	// Fallback demo for matches with no MatchMap rows (pickups/legacy) — series matches store one
	// demo per map on maps[].demoUrl instead.
	demoUrl: string | null;
}

export function formatDuration(ms: number) {
	const totalSeconds = Math.max(0, Math.floor(ms / 1000));
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	const pad = (n: number) => n.toString().padStart(2, '0');
	return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

export function formatKd(kills: number, deaths: number) {
	return (deaths > 0 ? kills / deaths : kills).toFixed(2);
}

export function getSideLabels(match: Match) {
	return {
		teamALabel: match.isPickup ? match.teamAName || 'Side A' : (match.teamA?.name ?? 'TBD'),
		teamBLabel: match.isPickup ? match.teamBName || 'Side B' : (match.teamB?.name ?? 'TBD'),
	};
}

/** Which side won a COMPLETED match — pickups record `winnerSide`, team matches record `winner`. */
export function getWinningSide(match: Match): Side | null {
	if (match.status !== 'COMPLETED') return null;
	if (match.isPickup) return match.winnerSide;
	if (match.winner && match.winner.id === match.teamA?.id) return 'TEAM_A';
	if (match.winner && match.winner.id === match.teamB?.id) return 'TEAM_B';
	return null;
}

/**
 * Pickups have no Cs2Team to group by — their stat rows carry `side` instead of `teamId` (see
 * PlayerMatchStat.side). Real matches do the reverse, so branch on match type once here.
 */
export function getStatsBySide(match: Match): Record<Side, PlayerStatRow[]> {
	if (match.isPickup) {
		return {
			TEAM_A: match.playerStats.filter((s) => s.side === 'TEAM_A'),
			TEAM_B: match.playerStats.filter((s) => s.side === 'TEAM_B'),
		};
	}
	return {
		TEAM_A: match.teamA ? match.playerStats.filter((s) => s.teamId === match.teamA?.id) : [],
		TEAM_B: match.teamB ? match.playerStats.filter((s) => s.teamId === match.teamB?.id) : [],
	};
}

export const MAP_STATUS_LABEL: Record<string, string> = { SCHEDULED: 'Upcoming', LIVE: 'Live', PAUSED: 'Paused', COMPLETED: 'Final' };
