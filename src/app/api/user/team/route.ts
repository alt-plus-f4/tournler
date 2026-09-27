import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseGameParam } from '@/lib/games';
import { getUserTeams } from '@/lib/teams/membership';

/**
 * GET /api/user/team?id=<userId> | ?email=<email> [&game=cs2|lol]
 *
 * `{ team, teams }`: `teams` is the user's team per game (`{ CS2: {...} | null, LOL: {...} | null }`,
 * each `{ id, name, game, logo, capitanId }`). `team` is kept for older callers that assumed a
 * single team: the one for `?game=` (CS2 when omitted), or null.
 */
export async function GET(request: Request) {
	const url = new URL(request.url);
	const email = url.searchParams.get('email');
	const id = url.searchParams.get('id');
	const game = parseGameParam(url.searchParams.get('game')) ?? 'CS2';

	if (!email && !id) return NextResponse.json({ error: 'Missing email or id' }, { status: 400 });

	try {
		const user = await db.user.findUnique({ where: id ? { id } : { email: email! }, select: { id: true } });
		if (!user) return NextResponse.json({ team: null, teams: { CS2: null, LOL: null } }, { status: 200 });
		const teams = await getUserTeams(user.id);
		return NextResponse.json({ team: teams[game], teams }, { status: 200 });
	} catch (err) {
		console.error('Error fetching user team:', err);
		return NextResponse.json({ error: 'User not found' }, { status: 404 });
	}
}
