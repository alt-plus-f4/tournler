import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { createHmac } from 'crypto';

function verifyState(state: string | null) {
	if (!state) return null;

	const [payload, signature] = state.split('.');
	if (!payload || !signature) return null;

	const expectedSignature = createHmac('sha256', process.env.NEXTAUTH_SECRET || '')
		.update(payload)
		.digest('hex');
	if (signature !== expectedSignature) return null;

	try {
		const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { userId: string; exp: number };
		if (!parsed.userId || !parsed.exp || parsed.exp < Date.now()) return null;
		return parsed;
	} catch {
		return null;
	}
}

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);

	const openidMode = searchParams.get('openid.mode');
	const openidError = searchParams.get('openid.error');
	const openidClaimedId = searchParams.get('openid.claimed_id');
	const openidIdentity = searchParams.get('openid.identity');
	const state = verifyState(searchParams.get('state'));

	if (openidMode === 'error') {
		return new Response(JSON.stringify({ error: `Steam authentication failed: ${openidError}` }), { status: 400 });
	}

	if (openidMode !== 'id_res' || !openidClaimedId || !openidIdentity) {
		return new Response(JSON.stringify({ error: 'Invalid OpenID response' }), { status: 400 });
	}

	try {
		const steamId = openidClaimedId.split('/').pop();
		if (!steamId) {
			throw new Error('Failed to extract Steam ID');
		}

		if (!state?.userId) {
			return new Response(JSON.stringify({ error: 'Missing or invalid linking state' }), { status: 400 });
		}

		const existingUser = await db.user.findUnique({
			where: { id: state.userId },
		});

		if (!existingUser) {
			return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
		}

		// Update or create the steam account
		await db.steamAccount.upsert({
			where: { steamId },
			update: { userId: existingUser.id },
			create: {
				userId: existingUser.id,
				steamId,
			},
		});

		return new Response(null, { status: 302, headers: { Location: `/profile/${existingUser.id}` } });
	} catch (error) {
		console.error('Error during Steam callback:', error);
		return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
	}
}
