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

  const formData = await request.formData();
  const avatarFile = formData.get('avatar') as File;

  if (!avatarFile || avatarFile.type !== 'image/svg+xml')
    return NextResponse.json({ error: 'Invalid avatar' }, { status: 400 });

  try {
    const arrayBuffer = await avatarFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const blob = await put(`avatars/${user.id}.svg`, buffer, {
      access: 'public',
    });

    const imageUrl = blob.url;

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