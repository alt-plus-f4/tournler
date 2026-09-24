import 'server-only';
import { after } from 'next/server';
import { revalidateTag } from 'next/cache';

/**
 * Coarse data-domain cache tags. Cached reads declare every domain they touch (see cachedQuery);
 * any write to a model invalidates its domains (see the Prisma extension in src/lib/db.ts). Coarse
 * on purpose: the data is densely linked (one match result shows up on home, /matches, brackets,
 * team pages and profiles), so a domain-wide flush is always correct and cheap at this traffic.
 */
export const CACHE_TAGS = {
	matches: 'matches',
	tournaments: 'tournaments',
	teams: 'teams',
	users: 'users',
	news: 'news',
	forum: 'forum',
	homepage: 'homepage',
	/** External FACEIT lookups: keyed by Steam ID, refreshed on a timer only (no DB write affects them). */
	faceit: 'faceit',
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

const T = CACHE_TAGS;

/** Which cache domains a write to each Prisma model makes stale. */
export const MODEL_TAGS: Record<string, readonly CacheTag[]> = {
	Cs2Tournament: [T.tournaments],
	Matches: [T.matches, T.tournaments],
	MatchMap: [T.matches, T.tournaments],
	MatchMapAction: [T.matches],
	MatchParticipant: [T.matches],
	MatchDraftPick: [T.matches],
	PlayerMatchStat: [T.matches, T.tournaments, T.users],
	GameServer: [T.matches],
	Cs2Team: [T.teams, T.tournaments, T.matches],
	Cs2TeamInvitation: [T.teams],
	User: [T.users, T.teams],
	UserBadge: [T.users],
	Badge: [T.users],
	SteamAccount: [T.users],
	DiscordAccount: [T.users],
	UserBan: [T.users],
	NewsPost: [T.news, T.homepage],
	NewsComment: [T.news],
	ForumThread: [T.forum],
	ForumReply: [T.forum],
	ForumVote: [T.forum],
	HomepageSettings: [T.homepage],
};

function flush(tags: Iterable<string>) {
	for (const tag of tags) {
		try {
			// expire: 0 — the next request must see the change (e.g. the author of a new forum
			// thread). "max" (stale-while-revalidate) would show them the old page once more.
			revalidateTag(tag, { expire: 0 });
		} catch {
			// Outside a request (scripts, tests) or during a render: nothing is cached to flush there,
			// and the time-based revalidate on every cached query is the safety net.
		}
	}
}

/**
 * Invalidate now, and again once the response has finished. The second pass covers writes inside
 * interactive transactions: they flush before COMMIT, so a request landing in between could re-cache
 * the old rows; after() runs once the handler (and its transaction) is done.
 */
export function invalidateTags(tags: Iterable<string>) {
	const list = [...new Set(tags)];
	if (list.length === 0) return;
	flush(list);
	try {
		after(() => flush(list));
	} catch {
		// after() is only available inside a request scope.
	}
}
