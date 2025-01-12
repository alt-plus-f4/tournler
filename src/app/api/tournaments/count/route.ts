import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
	try {
		const count = await db.cs2Tournament.count();

		return NextResponse.json(count, { status: 200 });
	} catch (error) {
		console.error('Error fetching Tournament count:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
