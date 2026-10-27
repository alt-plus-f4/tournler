import type { LiveStatus } from '@/lib/cs2/server-live';
import type { AssignedMatch, ServersSummary } from '@/lib/admin/servers';

export type { LiveStatus, AssignedMatch, ServersSummary };

export type ServerListItem = { id: string; ip: string; port: number; address: string; status: LiveStatus; match: AssignedMatch | null };
export type ServersResponse = { servers: ServerListItem[]; summary: ServersSummary; poolError: boolean; suggestions: { id: string; port: number } };

export type CurrentMatch = AssignedMatch & { password: string };
export type RecentMatch = { matchId: number; teamA: string; teamB: string; tournament: string; scoreTeamA: number | null; scoreTeamB: number | null; completedAt: string };

export type ServerDetail = {
	server: { id: string; ip: string; port: number; address: string };
	status: LiveStatus;
	raw: string | null;
	settings: Record<string, string | null> | null;
	current: CurrentMatch | null;
	recent: RecentMatch[];
};
