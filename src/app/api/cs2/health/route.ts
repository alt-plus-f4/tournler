import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { safeEqual } from '@/lib/helpers/safe-equal';
import { checkFleetHealth } from '@/lib/cs2/health-check';

function isValidCronRequest(request: Request): boolean {
	const apiKey = request.headers.get('x-api-key');
	if (apiKey && process.env.CRON_API_KEY && safeEqual(apiKey, process.env.CRON_API_KEY)) return true;
	const authHeader = request.headers.get('authorization');
	return Boolean(authHeader?.startsWith('Bearer ') && process.env.CRON_SECRET && safeEqual(authHeader.slice('Bearer '.length), process.env.CRON_SECRET));
}

/**
 * GET /api/cs2/health
 * Probes every registered server over RCON and records the result (`lastHealthy`), which the match
 * allocator uses to skip servers that are down. Same auth as the tournament cron: `x-api-key` ==
 * CRON_API_KEY, `Authorization: Bearer <CRON_SECRET>`, or an admin with `servers:manage`. The
 * tournament cron (/api/tournaments/check-start) runs the same check on every tick, so a separate
 * trigger is only needed for a faster interval.
 */
export async function GET(request: Request) {
	try {
		const session = await getAuthSession();
		const authorized = isValidCronRequest(request) || (session ? await userHasPermission(session.user.id, 'servers:manage') : false);
		if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		return NextResponse.json(await checkFleetHealth());
	} catch (error) {
		console.error('Error running game server health check:', error instanceof Error ? error.message : 'unknown error');
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
