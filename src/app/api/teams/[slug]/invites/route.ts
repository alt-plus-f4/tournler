import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request, { params }: { params: { slug: string } }) {
    const { slug } = params;

    if (!slug) {
        return NextResponse.json({ error: 'Missing team ID' }, { status: 400 });
    }

    const numericId = parseInt(slug, 10);

    if (isNaN(numericId)) {
        return NextResponse.json({ error: 'Invalid team ID' }, { status: 400 });
    }

    const team = await db.cs2Team.findUnique({
        where: { id: numericId },
        select: {
            teamInvitations: true,
        },
    });

    if (!team) {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    return NextResponse.json({ teamInvitations: team.teamInvitations }, { status: 200 });
}

// POST
export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const { slug } = params;

  if (!slug) {
    return NextResponse.json({ error: 'Missing team ID' }, { status: 400 });
  }

  const numericId = parseInt(slug, 10);

  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid team ID' }, { status: 400 });
  }

  const { id } = await request.json();

  // console.log(id);

  if (!id) {
    return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
  }

  const team = await db.cs2Team.findUnique({
    where: { id: numericId },
    select: {
      id: true,
      name: true,
      logo: true,
      members: true,
      capitan: true,
    },
  });

  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  }

  const user = await db.user.findUnique({
    where: { id: id },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const teamInvitation = await db.cs2TeamInvitation.create({
    data: {
      teamId: numericId,
      userId: user.id,
    },
  });

  return NextResponse.json({ teamInvitation }, { status: 200 });
}