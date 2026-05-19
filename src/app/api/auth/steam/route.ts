import { createHmac } from 'crypto';
import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';

function signState(value: string) {
	return createHmac('sha256', process.env.NEXTAUTH_SECRET || '')
		.update(value)
		.digest('hex');
}

export async function GET() {
	const session = await getAuthSession();

	if (!session?.user?.id) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const redirectUri = process.env.STEAM_REDIRECT_URI || 'http://localhost:3000/api/auth/steam/callback';
	const statePayload = Buffer.from(
		JSON.stringify({
			userId: session.user.id,
			exp: Date.now() + 10 * 60 * 1000,
		}),
	).toString('base64url');
	const state = `${statePayload}.${signState(statePayload)}`;
	const returnTo = encodeURIComponent(`${redirectUri}?state=${encodeURIComponent(state)}`);
	const realm = encodeURIComponent(redirectUri);

	const steamLoginUrl = `https://steamcommunity.com/openid/login?openid.mode=checkid_setup&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.return_to=${returnTo}&openid.realm=${realm}`;

	return NextResponse.json({ url: steamLoginUrl }, { status: 200 });
}
