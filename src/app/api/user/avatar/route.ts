import { getAuthSession } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await db.user.findUnique({
        where: { email: session?.user?.email || '' },
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const hasImage = !!user.image;

    return NextResponse.json({ user, hasImage }, { status: 200 });
}

export async function PATCH(request: Request) {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await db.user.findUnique({
        where: { email: session?.user?.email || '' },
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const { avatar } = await request.json();
    if (!avatar || typeof avatar !== 'string') return NextResponse.json({ error: 'Invalid avatar' }, { status: 400 });

    await db.user.update({
        where: { email: session.user.email || '' },
        data: { image: avatar },
    });

    return NextResponse.json({ message: 'Avatar updated successfully' }, { status: 200 });
}