import type { Metadata } from 'next';
import { cache } from 'react';
import { db } from '@/lib/db';

// The match room is live; never prerender or cache its shell.
export const dynamic = 'force-dynamic';

/** Title-only lookup (one PK read, three columns), memoized per request. */
const getMatchTitle = cache((id: number) =>
	db.matches
		.findUnique({
			where: { id },
			select: { isPickup: true, teamA: { select: { name: true } }, teamB: { select: { name: true } } },
		})
		.catch(() => null),
);

// The match room is a client component, so its <title> comes from this segment layout.
export async function generateMetadata({ params }: { params: Promise<{ matchId: string }> }): Promise<Metadata> {
	const { matchId } = await params;
	const id = Number(matchId);
	if (!Number.isInteger(id) || id <= 0) return { title: { absolute: 'Match · Tournler' } };

	const match = await getMatchTitle(id);

	if (!match) return { title: { absolute: 'Match · Tournler' } };
	if (match.isPickup) return { title: { absolute: 'Pickup match · Tournler' } };
	// Absolute: the parent /matches layout sets a plain title, which stops the root template from applying here.
	return { title: { absolute: `${match.teamA?.name ?? 'TBD'} vs ${match.teamB?.name ?? 'TBD'} · Tournler` } };
}

export default function MatchLayout({ children }: { children: React.ReactNode }) {
	return children;
}
