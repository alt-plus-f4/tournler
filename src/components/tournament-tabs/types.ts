import type { TournamentFormat, TournamentStatus, TournamentType } from '@prisma/client';

export interface TournamentTeamMember {
	id: string;
	name: string | null;
	image: string | null;
	role: string;
}

export interface TournamentTeam {
	id: number;
	name: string;
	logo: string | null;
	background: string | null;
	capitanId: string | null;
	members: TournamentTeamMember[];
}

/** The serializable tournament shape the detail page hands to its client tabs. */
export interface TournamentDetail {
	id: number;
	name: string;
	description: string | null;
	startDate: string;
	endDate: string;
	bannerUrl: string | null;
	logoUrl: string | null;
	prizePool: number | null;
	teamCapacity: number;
	location: string;
	type: TournamentType;
	status: TournamentStatus;
	format: TournamentFormat;
	bestOf: number;
	mapPool: string[];
	organizer: { name: string | null };
	teams: TournamentTeam[];
}

export interface Champion {
	id: number;
	name: string;
}

export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'PAUSED' | 'COMPLETED';
export type BracketSlot = 'WINNERS' | 'LOSERS' | 'GRAND_FINAL' | 'THIRD_PLACE';

export const FORMAT_LABEL: Record<TournamentFormat, string> = {
	SINGLE_ELIMINATION: 'Single elimination',
	DOUBLE_ELIMINATION: 'Double elimination',
	ROUND_ROBIN: 'Round robin',
};

export const STATUS_LABEL: Record<TournamentStatus, string> = {
	UPCOMING: 'Upcoming',
	ONGOING: 'In progress',
	COMPLETED: 'Completed',
};

export const TYPE_LABEL: Record<TournamentType, string> = {
	ONLINE: 'Online',
	OFFLINE: 'Offline (LAN)',
};

export const SLOT_LABEL: Record<BracketSlot, string> = {
	WINNERS: 'Winners',
	LOSERS: 'Losers',
	GRAND_FINAL: 'Grand final',
	THIRD_PLACE: '3rd place',
};
