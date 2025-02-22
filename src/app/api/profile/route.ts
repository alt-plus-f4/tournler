import { getAuthSession } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(request: Request) {
  const session = await getAuthSession();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { displayName, bio, avatarUrl } = await request.json();

    if (!displayName || typeof displayName !== 'string') {
      return NextResponse.json({ error: 'Invalid displayName' }, { status: 400 });
    }

    if (bio && (typeof bio !== 'string' || bio.length > 160)) {
      return NextResponse.json({ error: 'Invalid bio' }, { status: 400 });
    }

    if (avatarUrl && typeof avatarUrl !== 'string') {
      return NextResponse.json({ error: 'Invalid avatarUrl' }, { status: 400 });
    }


    session.user.name = displayName;
    session.user.bio = bio || '';
    session.user.image = avatarUrl;

    // console.log(session);

    const updatedUser = await db.user.update({
      where: { email: session.user.email || '' },
      data: {
        name: displayName,
        bio: bio || '',
        image: avatarUrl
      },
    });

    return NextResponse.json(
      { message: 'User updated successfully', updatedUser },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: error.message || 'Error updating profile' },
      { status: 500 }
    );
  }
}