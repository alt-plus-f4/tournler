import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { respond } from '@/lib/riot/respond';
import { getRiotStatus, linkRiotId, linkRiotIdSchema, unlinkRiotId } from '@/lib/riot/service';

/** The session user's Riot ID: `{ configured, account }` (account is null when none is linked). */
export async function GET() {
	const session = await getAuthSession();
	if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	try {
		return NextResponse.json(await getRiotStatus(session.user.id));
	} catch (error) {
		console.error('Error reading Riot ID:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

/**
 * Link (or re-link) a Riot ID: `{ gameName, tagLine, region }`. Resolves the PUUID with Riot, saves
 * it unverified and opens a 10-minute profile-icon challenge (finish it with POST ./verify).
 */
export async function POST(request: Request) {
	const session = await getAuthSession();
	if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const parsed = linkRiotIdSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid Riot ID' }, { status: 400 });

	try {
		return respond(await linkRiotId(session.user.id, parsed.data));
	} catch (error) {
		console.error('Error linking Riot ID:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

/** Unlink the session user's Riot ID (verified or pending). */
export async function DELETE() {
	const session = await getAuthSession();
	if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	try {
		await unlinkRiotId(session.user.id);
		return NextResponse.json({ configured: true, account: null });
	} catch (error) {
		console.error('Error unlinking Riot ID:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
