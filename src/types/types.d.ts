export type UserRole = 'USER' | 'MODERATOR' | 'TOURNAMENT_ADMIN' | 'CONTENT_ADMIN' | 'ADMIN';
export type TournamentStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED';
export type TournamentType = 'ONLINE' | 'OFFLINE';
export type TournamentFormat = 'SINGLE_ELIMINATION' | 'ROUND_ROBIN' | 'DOUBLE_ELIMINATION';
export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'PAUSED' | 'COMPLETED';
export type BracketSlot = 'WINNERS' | 'LOSERS' | 'GRAND_FINAL';
export type MatchSlot = 'TEAM_A' | 'TEAM_B';

export interface ReducedUser {
	id: string;
	name?: string | null;
	email: string;
	image?: string | null;
	cs2TeamId?: number | null;
}

export interface User {
	id: string;
	email: string;
	name?: string;
	image?: string;
	isOnboardingCompleted: boolean;
	emailVerified?: string;
	role: UserRole;
	discord?: DiscordAccount;
	steam?: SteamAccount;
	cs2TeamId?: number;
	cs2Team?: Cs2Team;
	cs2TeamCaptain?: Cs2Team;
	cs2TeamInvitations: Cs2TeamInvitation[];
	organizedTournaments: Cs2Tournament[];
	accounts: Account[];
	sessions: Session[];
	badges?: { badge: { id: number; name: string; icon: string; color: string; isOverlay: boolean } }[];
	createdAt: string;
	updatedAt: string;
}

export interface Account {
	id: string;
	userId?: string;
	type: string;
	provider: string;
	providerAccountId: string;
	refresh_token?: string;
	access_token?: string;
	expires_at?: number;
	token_type?: string;
	scope?: string;
	id_token?: string;
	session_state?: string;
	createdAt: string;
	updatedAt: string;
	user?: User;
}

export interface Session {
	id: string;
	sessionToken: string;
	userId: string;
	expires: string;
	createdAt: string;
	updatedAt: string;
	user: User;
}

export interface ReducedTournament {
	id: number;
	name: string;
	bannerUrl: string | null;
	logoUrl: string | null;
	startDate: string;
	prizePool: number | null;
	teams: [];
	location: string;
	teamCapacity: number;
}

export interface Cs2Tournament {
	id: number;
	name: string;
	startDate: string;
	endDate: string;
	bannerUrl?: string;
	logoUrl?: string;
	description?: string | null;
	prizePool?: number;
	teams: Cs2Team[];
	teamCapacity: number;
	location: string;
	type: TournamentType;
	status: TournamentStatus;
	format: TournamentFormat;
	isFeatured: boolean;
	featuredOrder?: number | null;
	isSystem: boolean;
	organizerId: string;
	organizer: User;
	matches: Match[];
	createdAt: string;
	updatedAt: string;
}

export interface Cs2Team {
	id: number;
	name: string;
	logo?: string;
	background?: string;
	members: User[];
	capitanId?: string;
	capitan?: User;
	teamInvitations: Cs2TeamInvitation[];
	cs2TournamentId?: number;
	cs2Tournament?: Cs2Tournament;
	matchesAsTeamA: Match[];
	matchesAsTeamB: Match[];
	matchesAsWinner: Match[];
	createdAt: string;
	updatedAt: string;
}

export interface Cs2TeamInvitation {
	id: number;
	teamId: number;
	team: Cs2Team;
	userId: string;
	user: User;
	createdAt: string;
	updatedAt: string;
}

export interface SteamAccount {
	id: string;
	userId: string;
	steamId: string;
	user: User;
	createdAt: string;
	updatedAt: string;
}

export interface DiscordAccount {
	id: string;
	userId: string;
	discordId: string;
	accessToken: string;
	user: User;
	createdAt: string;
	updatedAt: string;
}

export interface VerificationToken {
	identifier: string;
	token: string;
	expires: string;
	createdAt: string;
	updatedAt: string;
}

export interface Match {
	id: number;
	tournamentId: number;
	tournament: Cs2Tournament;
	teamAId: number | null;
	teamA: Cs2Team | null;
	teamBId: number | null;
	teamB: Cs2Team | null;
	winnerId?: number;
	winner?: Cs2Team;
	scoreTeamA?: number;
	scoreTeamB?: number;
	matchDate: string;
	status: MatchStatus;
	round: number;
	position: number;
	bracketSlot: BracketSlot;
	startedAt?: string | null;
	pausedAt?: string | null;
	completedAt?: string | null;
	nextMatchId?: number | null;
	nextMatchSlot?: MatchSlot | null;
	nextLoserMatchId?: number | null;
	nextLoserMatchSlot?: MatchSlot | null;
	isPickup: boolean;
	teamAName?: string | null;
	teamBName?: string | null;
	participants?: MatchParticipant[];
	gameServer?: GameServer;
	createdAt: string;
	updatedAt: string;
}

export interface MatchParticipant {
	id: number;
	matchId: number;
	userId: string;
	user: { id: string; name: string | null; image: string | null };
	side: MatchSlot;
	joinedAt: string;
}

export interface GameServer {
	id: number;
	matchId: number;
	match?: Match;
	connectIp: string;
	port: number;
	password: string;
	status: GameServerStatus;
	createdAt: string;
	updatedAt: string;
}

export type GameServerStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface Tournament extends Cs2Tournament {
	teams: Cs2Team[];
	matches: Match[];
}
