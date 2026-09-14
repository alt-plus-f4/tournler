import { db } from '@/lib/db';

const PICKUP_TOURNAMENT_NAME = 'Pickup Matches';

/**
 * Finds (or lazily creates) the single hidden system tournament that open pickup
 * matches attach to, since Matches.tournamentId is a required FK. `status: 'ONGOING'`
 * also keeps it out of the auto-start cron (tournament-service.ts only queries UPCOMING).
 * Callers filtering tournament listings for end users should exclude `isSystem: true`.
 */
export async function getOrCreatePickupTournament(organizerId: string) {
	const existing = await db.cs2Tournament.findFirst({ where: { isSystem: true } });
	if (existing) return existing;

	return db.cs2Tournament.create({
		data: {
			name: PICKUP_TOURNAMENT_NAME,
			startDate: new Date(0),
			endDate: new Date('2999-12-31'),
			teamCapacity: 0,
			location: 'Online',
			type: 'ONLINE',
			status: 'ONGOING',
			isSystem: true,
			organizerId,
		},
	});
}
