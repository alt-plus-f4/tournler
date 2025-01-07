import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  const sessionUser = session?.user;

  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = await db.user.findFirst({
    where: { email: sessionUser.email ?? '' },
    select: { role: true },
  });

  if (role?.role !== 1) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  if (isNaN(page) || isNaN(limit)) {
    return NextResponse.json({ error: 'Invalid pagination parameters' }, { status: 400 });
  }

  const users = await db.user.findMany({
    skip: (page - 1) * limit,
    take: limit,
  });

  const totalUsers = await db.user.count();

  return NextResponse.json({ users, totalPages: Math.ceil(totalUsers / limit) });
}

export async function PUT(req: NextRequest) {
  const session = await getAuthSession();
  const sessionUser = session?.user;

  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = await db.user.findFirst({
    where: { email: sessionUser.email ?? '' },
    select: { role: true },
  });

  if (role?.role !== 1) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { pathname } = new URL(req.url);
  const userId = pathname.split('/').pop();

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const data = await req.json();

  const updatedUser = await db.user.update({
    where: { id: userId },
    data,
  });

  return NextResponse.json(updatedUser);
}

export async function DELETE(req: NextRequest) {
  const session = await getAuthSession();
  const sessionUser = session?.user;

  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = await db.user.findFirst({
    where: { email: sessionUser.email ?? '' },
    select: { role: true },
  });

  if (role?.role !== 1) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { pathname } = new URL(req.url);
  const userId = pathname.split('/').pop();

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  await db.user.delete({
    where: { id: userId },
  });

  return NextResponse.json({ message: 'User deleted successfully' });
}