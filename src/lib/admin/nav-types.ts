/** Client-safe shape of the admin sidebar's data (see getAdminSidebarData). */
export interface AdminSidebarData {
	user: { name: string; image: string | null; role: string };
	counts: {
		tournaments: number;
		matches: number;
		liveMatches: number;
		users: number;
		teams: number;
		badges: number;
		activeBans: number;
		forumThreads: number;
		/** Configured pool size; null when CS2_SERVER_POOL is malformed. */
		servers: number | null;
	};
}
