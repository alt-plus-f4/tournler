import type { LiveStatus } from '@/lib/cs2/server-live';
import type { AssignedMatch, ServersSummary } from '@/lib/admin/servers';

export type { LiveStatus, AssignedMatch, ServersSummary };

export type Availability = 'ACTIVE' | 'DRAINING' | 'DISABLED';

/** Registry fields about a server (never RCON host or password). `availability` is the admin switch; `status` on list items is the live RCON reading. */
export type PublicServer = {
	id: string;
	name: string;
	ip: string;
	port: number;
	address: string;
	availability: Availability;
	region: string | null;
	hostId: number | null;
	managed: boolean;
	/** False for servers that only exist in the legacy env config and have not been imported yet. */
	registered: boolean;
};

export type HostListItem = {
	id: number;
	slug: string;
	name: string;
	region: string;
	publicHost: string;
	agentUrl: string | null;
	hasAgent: boolean;
	portRangeStart: number;
	portStep: number;
	maxServers: number;
	serverCount: number;
};

export type HostHealth = {
	ok: boolean;
	hostname: string;
	mode: 'overlay' | 'copy';
	baseInstalled: boolean;
	baseUpdate: { state: 'idle' | 'running' | 'failed'; startedAt?: string; error?: string };
	diskFreeGb: number | null;
	diskTotalGb: number | null;
	servers: number;
};

export type HostWithHealth = HostListItem & { health: HostHealth | null; error: string | null };

export type ServerListItem = PublicServer & { lastHealthy: boolean | null; status: LiveStatus; match: AssignedMatch | null };
export type ServersResponse = {
	servers: ServerListItem[];
	hosts: HostListItem[];
	summary: ServersSummary;
	poolError: boolean;
	secretKeyMissing: boolean;
	envImportAvailable: boolean;
	suggestions: { id: string; port: number };
};

export type CurrentMatch = AssignedMatch & { password: string };
export type RecentMatch = { matchId: number; teamA: string; teamB: string; tournament: string; scoreTeamA: number | null; scoreTeamB: number | null; completedAt: string };

export type ServerDetail = {
	server: PublicServer;
	status: LiveStatus;
	raw: string | null;
	settings: Record<string, string | null> | null;
	current: CurrentMatch | null;
	recent: RecentMatch[];
};
