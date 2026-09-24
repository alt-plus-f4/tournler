import 'server-only';
import { TournamentStatus, type TournamentFormat } from '@prisma/client';
import { db } from '@/lib/db';
import { cachedQuery, REVALIDATE } from '@/lib/cache/cached-query';
import { playerFlairSelect } from '@/lib/helpers/player-flair';
import type { Champion } from '@/components/tournament-tabs/types';

/**
 * Shared (non-viewer-specific) reads for the /tournaments pages, served from Next's data cache.
 * The Prisma extension in src/lib/db.ts flushes the tags below on every write.
 */

/** Same query GET /api/tournaments?status=active runs (first page of 10, prize pool first). */
export const getActiveTournaments = cachedQuery(
	async () =>
		db.cs2Tournament.findMany({
			where: { isSystem: false, status: { in: [TournamentStatus.UPCOMING, TournamentStatus.ONGOING] } },
			orderBy: { prizePool: 'desc' },
			take: 10,
			select: { id: true, name: true, bannerUrl: true, logoUrl: true, startDate: true, prizePool: true, location: true, teamCapacity: true, status: true, teams: { select: { id: true } } },
		}),
	['tournaments-active-list'],
	{ tags: ['tournaments', 'teams'], revalidate: REVALIDATE.standard },
);

/** Tournament detail with rostered teams and players (incl. the raw flair source rows). */
export const getTournamentDetail = cachedQuery(
	async (id: number) =>
		db.cs2Tournament.findUnique({
			where: { id },
			select: {
				id: true,
				name: true,
				description: true,
				prizePool: true,
				teamCapacity: true,
				location: true,
				startDate: true,
				endDate: true,
				bannerUrl: true,
				logoUrl: true,
				status: true,
				type: true,
				format: true,
				bestOf: true,
				mapPool: true,
				organizer: { select: { name: true } },
				teams: {
					select: {
						id: true,
						name: true,
						logo: true,
						background: true,
						capitanId: true,
						members: { select: { id: true, name: true, image: true, ...playerFlairSelect } },
					},
				},
			},
		}),
	['tournament-detail'],
	{ tags: ['tournaments', 'teams', 'users'], revalidate: REVALIDATE.standard },
);

/**
 * The champion is only named when the bracket itself decided one: the completed last-round match
 * of the winners bracket (single elimination) or of the grand final (double elimination, where a
 * bracket reset adds a round 2). Round robin has no final match, so nothing is claimed.
 */
export const getTournamentChampion = cachedQuery(
	async (tournamentId: number, format: TournamentFormat): Promise<Champion | null> => {
		if (format === 'ROUND_ROBIN') return null;
		const slot = format === 'DOUBLE_ELIMINATION' ? 'GRAND_FINAL' : 'WINNERS';
		const finals = await db.matches.findMany({
			where: { tournamentId, bracketSlot: slot },
			orderBy: { round: 'desc' },
			take: 2,
			select: { round: true, status: true, winner: { select: { id: true, name: true } } },
		});
		const [last, previous] = finals;
		if (!last || (previous && previous.round === last.round)) return null;
		return last.status === 'COMPLETED' && last.winner ? last.winner : null;
	},
	['tournament-champion'],
	{ tags: ['matches', 'tournaments', 'teams'], revalidate: REVALIDATE.standard },
);
