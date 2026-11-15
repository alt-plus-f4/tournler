/**
 * Live game log: the kill feed, bomb events and round results shown on the match page, built from
 * MatchZy's event webhook (see src/app/api/matches/game-state/matchzy/route.ts).
 *
 * This file is pure (no database, no server-only imports) so the client component can share its
 * types and helpers. Payload field names come from MatchZy's own event schema
 * (documentation/docs/event_schema.yml, Events.cs and LiveEvents.cs in shobhit-pathak/MatchZy):
 * `side` is "ct" | "t" | "spec" | null on players, `round_number` is 0-based, `round_time` is
 * milliseconds into the round, and `round_end.reason` is CounterStrikeSharp's RoundEndReason.
 */

export type LogSide = 'ct' | 't';
export type LogTeam = 'A' | 'B';

export interface LogPlayer {
	name: string;
	side: LogSide | null;
}

export type RoundEndKind = 'bomb_exploded' | 'bomb_defused' | 'elimination' | 'time' | 'surrender' | 'draw' | 'other';

export interface KillData {
	victim: LogPlayer;
	attacker: LogPlayer | null;
	weapon: string;
	headshot: boolean;
	thruSmoke: boolean;
	noScope: boolean;
	attackerBlind: boolean;
	/** Objects (walls or players) the bullet went through. */
	penetrated: number;
	assist: { player: LogPlayer; flash: boolean } | null;
	suicide: boolean;
	bomb: boolean;
	friendlyFire: boolean;
}

export interface BombData {
	player: LogPlayer;
	site: 'a' | 'b' | null;
	/** Milliseconds left on the bomb timer (defuse only). */
	timeRemaining: number | null;
}

export interface RoundEndData {
	kind: RoundEndKind;
	winnerSide: LogSide | null;
	winnerTeam: LogTeam | null;
	scoreA: number;
	scoreB: number;
}

export interface MapEndData {
	winnerTeam: LogTeam | null;
	scoreA: number;
	scoreB: number;
}

/** Marks rounds undone by a MatchZy round restore: rounds >= `toRound` on that map are replayed. */
export interface RollbackData {
	toRound: number;
}

export type GameLogPayload =
	| { type: 'live'; data: Record<string, never> }
	| { type: 'round_start'; data: Record<string, never> }
	| { type: 'kill'; data: KillData }
	| { type: 'bomb_planted'; data: BombData }
	| { type: 'bomb_defused'; data: BombData }
	| { type: 'round_end'; data: RoundEndData }
	| { type: 'map_end'; data: MapEndData }
	| { type: 'rollback'; data: RollbackData };

export type GameLogType = GameLogPayload['type'];

/** What the events endpoint returns for each row. */
export type GameLogEntry = GameLogPayload & {
	id: number;
	mapOrder: number | null;
	round: number | null;
	roundTime: number | null;
	createdAt: string;
};

/** A normalized event ready to be stored (everything but id/createdAt/matchId). */
export type NormalizedLogEvent = GameLogPayload & {
	mapOrder: number | null;
	round: number | null;
	roundTime: number | null;
};

/** MatchZy event names that belong in the log (in addition to the score-handling ones). */
export const GAME_LOG_EVENTS = new Set(['going_live', 'round_start', 'player_death', 'bomb_planted', 'bomb_defused', 'backup_loaded', 'round_end', 'map_result']);

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value);

function text(value: unknown, max: number): string {
	return typeof value === 'string' ? value.slice(0, max) : '';
}

function bool(value: unknown): boolean {
	return value === true;
}

function int(value: unknown): number | null {
	return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

/** MatchZy sends "ct"/"t"; CS2's own team numbers (3 = CT, 2 = T) are accepted too, as a string or number. */
export function normalizeSide(value: unknown): LogSide | null {
	const v = typeof value === 'string' ? value.trim().toLowerCase() : value;
	if (v === 'ct' || v === '3' || v === 3) return 'ct';
	if (v === 't' || v === '2' || v === 2) return 't';
	return null;
}

function player(value: unknown): LogPlayer | null {
	if (!isObject(value)) return null;
	const name = text(value.name, 32).trim();
	return { name: name || 'Unknown', side: normalizeSide(value.side) };
}

function weaponName(value: unknown): string {
	const raw = isObject(value) ? text(value.name, 32) : '';
	return raw.replace(/^weapon_/, '').toLowerCase();
}

function teamOf(value: unknown): LogTeam | null {
	if (value === 'team1') return 'A';
	if (value === 'team2') return 'B';
	return null;
}

/**
 * CounterStrikeSharp's RoundEndReason (https://github.com/roflmuffin/CounterStrikeSharp,
 * Modules/Entities/Constants/RoundEndReason.cs): which way the round ended, and which side that
 * means won when the reason alone settles it.
 */
export function roundEndKind(reason: unknown): { kind: RoundEndKind; side: LogSide | null } {
	switch (reason) {
		case 1: // TargetBombed
			return { kind: 'bomb_exploded', side: 't' };
		case 7: // BombDefused
			return { kind: 'bomb_defused', side: 'ct' };
		case 8: // CTsWin
			return { kind: 'elimination', side: 'ct' };
		case 9: // TerroristsWin
			return { kind: 'elimination', side: 't' };
		case 12: // TargetSaved: time ran out with the bomb not planted
			return { kind: 'time', side: 'ct' };
		case 17: // TerroristsSurrender
			return { kind: 'surrender', side: 'ct' };
		case 18: // CTsSurrender
			return { kind: 'surrender', side: 't' };
		case 10: // RoundDraw
			return { kind: 'draw', side: null };
		default:
			return { kind: 'other', side: null };
	}
}

/**
 * Turns one MatchZy webhook payload into a log event, or null when it is not a logged event or is
 * malformed. Never throws: the webhook must keep working whatever the server sends.
 */
export function normalizeMatchZyEvent(body: unknown): NormalizedLogEvent | null {
	if (!isObject(body) || typeof body.event !== 'string') return null;
	const mapOrder = int(body.map_number);
	const round = int(body.round_number);
	const roundTime = int(body.round_time);
	const base = { mapOrder, round, roundTime };

	switch (body.event) {
		case 'going_live':
			return { ...base, type: 'live', data: {} };
		case 'round_start':
			return { ...base, type: 'round_start', data: {} };
		case 'player_death': {
			const victim = player(body.player);
			if (!victim) return null;
			const assistRaw = isObject(body.assist) ? body.assist : null;
			const assistPlayer = assistRaw ? player(assistRaw.player) : null;
			return {
				...base,
				type: 'kill',
				data: {
					victim,
					attacker: player(body.attacker),
					weapon: weaponName(body.weapon),
					headshot: bool(body.headshot),
					thruSmoke: bool(body.thru_smoke),
					noScope: bool(body.no_scope),
					attackerBlind: bool(body.attacker_blind),
					penetrated: int(body.penetrated) ?? 0,
					assist: assistPlayer && assistRaw ? { player: assistPlayer, flash: bool(assistRaw.flash_assist) } : null,
					suicide: bool(body.suicide),
					bomb: bool(body.bomb),
					friendlyFire: bool(body.friendly_fire),
				},
			};
		}
		case 'bomb_planted':
		case 'bomb_defused': {
			const who = player(body.player);
			if (!who) return null;
			const site = body.site === 'a' || body.site === 'b' ? body.site : null;
			const timeRemaining = body.event === 'bomb_defused' ? int(body.bomb_time_remaining) : null;
			return { ...base, type: body.event, data: { player: who, site, timeRemaining } };
		}
		case 'round_end': {
			const { kind, side } = roundEndKind(body.reason);
			const winner = isObject(body.winner) ? body.winner : null;
			const team1 = isObject(body.team1) ? body.team1 : null;
			const team2 = isObject(body.team2) ? body.team2 : null;
			return {
				...base,
				type: 'round_end',
				data: {
					kind,
					winnerSide: side ?? (winner ? normalizeSide(winner.side) : null),
					winnerTeam: winner ? teamOf(winner.team) : null,
					scoreA: int(team1?.score) ?? 0,
					scoreB: int(team2?.score) ?? 0,
				},
			};
		}
		case 'map_result': {
			const winner = isObject(body.winner) ? body.winner : null;
			const team1 = isObject(body.team1) ? body.team1 : null;
			const team2 = isObject(body.team2) ? body.team2 : null;
			return { ...base, type: 'map_end', data: { winnerTeam: winner ? teamOf(winner.team) : null, scoreA: int(team1?.score) ?? 0, scoreB: int(team2?.score) ?? 0 } };
		}
		case 'backup_loaded':
			return { ...base, type: 'rollback', data: { toRound: round ?? 0 } };
		default:
			return null;
	}
}

/**
 * Appends `incoming` to `current` in id order, dropping duplicates and applying round restores: a
 * `rollback` removes the already-known entries of that map from the restored round onwards (those
 * rounds are replayed). Pure, so the client and any consumer agree on the result.
 */
export function applyGameLogEvents(current: GameLogEntry[], incoming: GameLogEntry[], limit = 2000): GameLogEntry[] {
	if (incoming.length === 0) return current;
	const seen = new Set(current.map((e) => e.id));
	let next = current;
	for (const event of incoming) {
		if (seen.has(event.id)) continue;
		seen.add(event.id);
		if (event.type === 'rollback') {
			next = next.filter((e) => !(e.mapOrder === event.mapOrder && e.round !== null && e.round >= event.data.toRound));
			continue;
		}
		next = [...next, event];
	}
	return next.length > limit ? next.slice(next.length - limit) : next;
}

const WEAPON_LABELS: Record<string, string> = {
	ak47: 'AK-47',
	m4a1: 'M4A4',
	m4a1_silencer: 'M4A1-S',
	awp: 'AWP',
	deagle: 'Desert Eagle',
	glock: 'Glock-18',
	usp_silencer: 'USP-S',
	hkp2000: 'P2000',
	famas: 'FAMAS',
	galilar: 'Galil AR',
	ssg08: 'SSG 08',
	mp9: 'MP9',
	mac10: 'MAC-10',
	mp7: 'MP7',
	mp5sd: 'MP5-SD',
	ump45: 'UMP-45',
	p90: 'P90',
	bizon: 'PP-Bizon',
	nova: 'Nova',
	xm1014: 'XM1014',
	sawedoff: 'Sawed-Off',
	mag7: 'MAG-7',
	negev: 'Negev',
	m249: 'M249',
	aug: 'AUG',
	sg556: 'SG 553',
	scar20: 'SCAR-20',
	g3sg1: 'G3SG1',
	tec9: 'Tec-9',
	fiveseven: 'Five-SeveN',
	elite: 'Dual Berettas',
	p250: 'P250',
	cz75a: 'CZ75-Auto',
	revolver: 'R8 Revolver',
	taser: 'Zeus x27',
	hegrenade: 'HE Grenade',
	inferno: 'Fire',
	molotov: 'Molotov',
	incgrenade: 'Incendiary',
	planted_c4: 'Bomb',
	c4: 'Bomb',
};

/** "ak47" -> "AK-47". Unknown names are shown as the game reports them, knives collapsed to "Knife". */
export function weaponLabel(name: string): string {
	if (!name) return 'Unknown';
	if (name.startsWith('knife') || name === 'bayonet') return 'Knife';
	return WEAPON_LABELS[name] ?? name.replace(/_/g, ' ');
}

export const ROUND_END_LABEL: Record<RoundEndKind, string> = {
	bomb_exploded: 'Bomb exploded',
	bomb_defused: 'Bomb defused',
	elimination: 'Eliminated the other team',
	time: 'Time ran out',
	surrender: 'Surrender',
	draw: 'Draw',
	other: 'Round over',
};

/** "0:42" from milliseconds into the round. */
export function formatRoundTime(ms: number | null): string {
	if (ms === null) return '';
	const total = Math.floor(ms / 1000);
	return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Rounds per half: 12 in regulation, then 3 per overtime half (MR12 with MR3 overtime). */
export function isHalfBoundary(roundsPlayed: number): boolean {
	return roundsPlayed === 12 || (roundsPlayed >= 24 && (roundsPlayed - 24) % 3 === 0);
}
