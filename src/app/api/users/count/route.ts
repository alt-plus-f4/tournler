import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
	try {
		let count = await db.user.count() / 10;
		count = Math.ceil(count);

		return NextResponse.json(count, { status: 200 });
	} catch (error) {
		console.error('Error fetching User count:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
