import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { respond } from '@/lib/riot/respond';
import { verifyRiotId } from '@/lib/riot/service';

/**
 * Finish the ownership challenge: reads the summoner's current profile icon from Riot.
 * 200 verified · 409 wrong icon ("Set profile icon #N…") · 410 challenge expired / none open.
 */
export async function POST() {
	const session = await getAuthSession();
	if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	try {
		return respond(await verifyRiotId(session.user.id));
	} catch (error) {
		console.error('Error verifying Riot ID:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
