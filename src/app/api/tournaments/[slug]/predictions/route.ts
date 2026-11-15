import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const LEADERBOARD_SIZE = 50;

/**
 * GET /api/tournaments/:slug/predictions — public prediction leaderboard (`slug` is the numeric id
 * or the tournament name, like /standings).
 *
 * Only picks on COMPLETED matches with a winner count (`total` = those picks). A correct pick is 1
 * point, plus 1 bonus when the winner got strictly fewer picks than the loser (the lock-time split
 * isn't stored, so the final split is used). Ranked by points, then correct, then earliest pick.
 * Three queries regardless of size.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
	try {
		const { slug } = await params;
		const tournamentId = Number.parseInt(slug, 10);
		const isNumericSlug = Number.isInteger(tournamentId) && String(tournamentId) === slug;

		const tournament = await db.cs2Tournament.findFirst({ where: isNumericSlug ? { id: tournamentId } : { name: slug }, select: { id: true, predictionsEnabled: true } });
		if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });

		const predictions = await db.prediction.findMany({
			where: { match: { tournamentId: tournament.id } },
			select: { userId: true, matchId: true, pickedTeamId: true, createdAt: true, match: { select: { status: true, winnerId: true, teamAId: true, teamBId: true } } },
		});

		// Crowd split per match (all picks, finished or not).
		const picksByMatch = new Map<number, Map<number, number>>();
		for (const p of predictions) {
			const teams = picksByMatch.get(p.matchId) ?? new Map<number, number>();
			teams.set(p.pickedTeamId, (teams.get(p.pickedTeamId) ?? 0) + 1);
			picksByMatch.set(p.matchId, teams);
		}

		const scores = new Map<string, { correct: number; total: number; points: number; firstAt: number }>();
		for (const p of predictions) {
			const { status, winnerId, teamAId, teamBId } = p.match;
			if (status !== 'COMPLETED' || winnerId === null) continue;
			const row = scores.get(p.userId) ?? { correct: 0, total: 0, points: 0, firstAt: Infinity };
			row.total += 1;
			row.firstAt = Math.min(row.firstAt, p.createdAt.getTime());
			if (p.pickedTeamId === winnerId) {
				row.correct += 1;
				row.points += 1;
				const loserId = winnerId === teamAId ? teamBId : teamAId;
				const split = picksByMatch.get(p.matchId);
				if (loserId !== null && (split?.get(winnerId) ?? 0) < (split?.get(loserId) ?? 0)) row.points += 1;
			}
			scores.set(p.userId, row);
		}

		const top = [...scores.entries()].sort(([, a], [, b]) => b.points - a.points || b.correct - a.correct || a.firstAt - b.firstAt).slice(0, LEADERBOARD_SIZE);

		const users = await db.user.findMany({ where: { id: { in: top.map(([id]) => id) } }, select: { id: true, name: true, image: true } });
		const userById = new Map(users.map((u) => [u.id, u]));

		const leaderboard = top.map(([userId, s]) => ({
			userId,
			name: userById.get(userId)?.name ?? null,
			image: userById.get(userId)?.image ?? null,
			correct: s.correct,
			total: s.total,
			points: s.points,
		}));

		return NextResponse.json({ enabled: tournament.predictionsEnabled, leaderboard });
	} catch (error) {
		console.error('Error fetching prediction leaderboard:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
