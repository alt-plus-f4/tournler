import { getAuthSession } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { put } from '@vercel/blob';

export async function GET() {
  const session = await getAuthSession();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await db.user.findUnique({
    where: { email: session?.user?.email || '' },
  });

  if (!user)
    return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const hasImage = !!user.image;

  return NextResponse.json({ hasImage }, { status: 200 });
}

export async function PATCH(request: Request) {
  const session = await getAuthSession();
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await db.user.findUnique({
    where: { email: session?.user?.email || '' },
  });

  if (!user)
    return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { avatar } = await request.json();

  if (!avatar || typeof avatar !== 'string')
    return NextResponse.json({ error: 'Invalid avatar' }, { status: 400 });

  const MAX_AVATAR_BYTES = 100 * 1024;
  const trimmed = avatar.trim();
  const looksLikeSvg = trimmed.startsWith('<svg') || trimmed.startsWith('<?xml');
  const hasDangerousContent = /<script|on[a-z]+\s*=|javascript:|<foreignObject/i.test(avatar);

  if (avatar.length > MAX_AVATAR_BYTES || !looksLikeSvg || hasDangerousContent) {
    return NextResponse.json({ error: 'Invalid avatar' }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(avatar, 'utf-8');

    const blob = await put(`avatars/${user.email}.svg`, buffer, {
      access: 'public',
    });

    const imageUrl = blob.url;
    session.user.image = imageUrl; // Update session user image

    await db.user.update({
      where: { email: session.user.email || '' },
      data: { image: imageUrl },
    });

    return NextResponse.json(
      { message: 'Avatar updated successfully', imageUrl },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process avatar: ' + error },
      { status: 500 }
    );
  }
}