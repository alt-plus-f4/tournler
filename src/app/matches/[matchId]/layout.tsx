import type { Metadata } from 'next';
import { cache } from 'react';
import { db } from '@/lib/db';
import { cachedQuery, REVALIDATE } from '@/lib/cache/cached-query';

// The match room is live; never prerender or cache its shell.
export const dynamic = 'force-dynamic';

/**
 * Title-only lookup (one PK read, three columns), served from the data cache and memoized per
 * request. Errors are caught outside the cached call so a failed read is never cached as null.
 */
const readMatchTitle = cachedQuery(
	async (id: number) =>
		db.matches.findUnique({
			where: { id },
			select: { isPickup: true, teamA: { select: { name: true } }, teamB: { select: { name: true } } },
		}),
	['match-room-title'],
	{ tags: ['matches', 'teams'], revalidate: REVALIDATE.standard },
);
const getMatchTitle = cache((id: number) => readMatchTitle(id).catch(() => null));

// The match room is a client component, so its <title> comes from this segment layout.
export async function generateMetadata({ params }: { params: Promise<{ matchId: string }> }): Promise<Metadata> {
	const { matchId } = await params;
	const id = Number(matchId);
	if (!Number.isInteger(id) || id <= 0) return { title: { absolute: 'Match · Tournler' } };

	const match = await getMatchTitle(id);

	if (!match) return { title: { absolute: 'Match · Tournler' } };
	if (match.isPickup) return { title: { absolute: 'Pickup match · Tournler' }, description: 'Open CS2 pickup lobby on Tournler: join a side, run the map veto and connect to the hosted server.' };
	const a = match.teamA?.name ?? 'TBD';
	const b = match.teamB?.name ?? 'TBD';
	// Absolute: the parent /matches layout sets a plain title, which stops the root template from applying here.
	return { title: { absolute: `${a} vs ${b} · Tournler` }, description: `${a} vs ${b} on Tournler: live score from the game server, rosters, map veto and results.` };
}

export default function MatchLayout({ children }: { children: React.ReactNode }) {
	return children;
}
