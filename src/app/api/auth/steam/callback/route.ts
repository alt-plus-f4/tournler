import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const session = await getAuthSession();

  const openidMode = searchParams.get('openid.mode');
  const openidError = searchParams.get('openid.error');
  const openidClaimedId = searchParams.get('openid.claimed_id');
  const openidIdentity = searchParams.get('openid.identity');

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

    const existingUser = await db.user.findUnique({
      where: { email: session?.user?.email || '' },
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

    return new Response(null, { status: 302, headers: { Location: '/' } });

  } catch (error) {
    console.error('Error during Steam callback:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
