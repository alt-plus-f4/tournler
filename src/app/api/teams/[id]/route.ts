import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET({ params }: { params: { id: string } }) {
    const { id } = params;

    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
        return NextResponse.json({ error: 'Invalid team ID' }, { status: 400 });
    }

    const team = await db.cs2Team.findUnique({
        where: { id: numericId },
        select: {
            id: true,
            name: true,
            logo: true,
            members: true,
        },
    });

    if (!team) {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    return NextResponse.json({ team }, { status: 200 });
}