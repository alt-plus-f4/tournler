import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { checkAndStartTournaments } from '@/lib/tournaments/tournament-service';
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

function safeEqual(provided: string, expected: string): boolean {
	const providedBuf = Buffer.from(provided);
	const expectedBuf = Buffer.from(expected);
	if (providedBuf.length !== expectedBuf.length) return false;

	return timingSafeEqual(providedBuf, expectedBuf);
}

function isValidCronRequest(request: Request): boolean {
	// Custom scheme, e.g. for a GitHub Actions-triggered cron: `x-api-key: <CRON_API_KEY>`.
	const apiKey = request.headers.get('x-api-key');
	if (apiKey && process.env.CRON_API_KEY) {
		if (safeEqual(apiKey, process.env.CRON_API_KEY)) return true;
	}

	// Vercel's native Cron Jobs convention: sends `Authorization: Bearer <CRON_SECRET>`.
	const authHeader = request.headers.get('authorization');
	if (authHeader?.startsWith('Bearer ') && process.env.CRON_SECRET) {
		if (safeEqual(authHeader.slice('Bearer '.length), process.env.CRON_SECRET)) return true;
	}

	return false;
}

/**
 * GET /api/tournaments/check-start
 * Check for tournaments that should be started based on their start date,
 * and start them. Meant to be hit periodically by a scheduler (see
 * vercel.json `crons` / .github/workflows/check-tournaments.yml) via the
 * `x-api-key` header, or manually by a tournament admin.
 */
export async function GET(request: Request) {
	try {
		const session = await getAuthSession();

		const isAuthorized = isValidCronRequest(request) || (session ? await userHasPermission(session.user.id, 'tournaments:manage') : false);

		if (!isAuthorized) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const result = await checkAndStartTournaments();

		return NextResponse.json({
			success: true,
			...result,
		});
	} catch (error) {
		console.error('Error checking tournaments:', error);
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
	}
}
