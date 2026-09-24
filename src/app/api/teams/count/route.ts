import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseGameParam } from '@/lib/games';

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const limit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10) || 10);
		const search = searchParams.get('search')?.trim();

		const game = parseGameParam(searchParams.get('game'));
		const where = { ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}), ...(game ? { game } : {}) };

		const total = await db.cs2Team.count({ where });
		const count = Math.ceil(total / limit);

		return NextResponse.json(count, { status: 200 });
	} catch (error) {
		console.error('Error fetching Team count:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
