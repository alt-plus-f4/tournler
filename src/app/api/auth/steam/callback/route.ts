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

  // console.log('Received Steam OpenID response:', Object.fromEntries(searchParams));


  if (openidMode === 'error') {
    // Handle the error returned by Steam
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

    const existingSteamAccount = await db.steamAccount.findUnique({
      where: { steamId },
    });

    if (existingSteamAccount) {
      return new Response(null, { status: 302, headers: { Location: '/' } }); // Redirect to the home page
    }

    await db.steamAccount.create({
      data: {
        userId: existingUser.id,
        steamId,
      },
    });

    return new Response(null, { status: 302, headers: { Location: '/' } }); // Redirect to the home page

  } catch (error) {
    console.error('Error during Steam callback:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
