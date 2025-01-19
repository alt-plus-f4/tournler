export enum UserRole {
  USER = "USER",
  ADMIN = "ADMIN",
  MODERATOR = "MODERATOR",
}

export enum TournamentStatus {
  PENDING = "PENDING",
  ONGOING = "ONGOING",
  COMPLETED = "COMPLETED",
}

export enum TournamentType {
  ONLINE = "ONLINE",
  OFFLINE = "OFFLINE",
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
	bannerUrl: string;
  logoUrl: string;
	startDate: string;
	prizePool: number;
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
  prizePool?: number;
  teams: Cs2Team[];
  teamCapacity: number;
  location: string;
  type: TournamentType;
  status: TournamentStatus;
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
  teamAId: number;
  teamA: Cs2Team;
  teamBId: number;
  teamB: Cs2Team;
  winnerId?: number;
  winner?: Cs2Team;
  scoreTeamA?: number;
  scoreTeamB?: number;
  matchDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tournament extends Cs2Tournament {
  teams: Cs2Team[];
  matches: Match[];
}