import { getAuthSession } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
	try {
		const session = await getAuthSession();

		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const user = await db.user.findUnique({
			where: { email: session?.user?.email || '' },
			select: { isOnboardingCompleted: true },
		});

		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		return NextResponse.json(user.isOnboardingCompleted, { status: 200 });
	} catch (error) {
		console.error('Error fetching onboarding completion:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

export async function PATCH() {
	try {
		const session = await getAuthSession();

		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const user = await db.user.findUnique({
			where: { email: session?.user?.email || '' },
			select: { id: true },
		});

		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		const updatedUser = await db.user.update({
			where: { email: session?.user?.email || '' },
			data: { isOnboardingCompleted: true },
			select: { isOnboardingCompleted: true },
		});

		return NextResponse.json(updatedUser.isOnboardingCompleted, { status: 200 });
	} catch (error) {
		console.error('Error updating onboarding completion:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
