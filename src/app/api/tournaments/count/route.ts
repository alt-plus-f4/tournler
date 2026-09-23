import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseStatusFilter } from '@/lib/helpers/tournament-status-filter';

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const limit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10) || 10);
		const search = searchParams.get('search')?.trim();

		const statusFilter = parseStatusFilter(searchParams.get('status'));

		const where = {
			isSystem: false,
			...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
			...(statusFilter ? { status: { in: statusFilter } } : {}),
		};

		const total = await db.cs2Tournament.count({ where });
		const count = Math.ceil(total / limit);

		return NextResponse.json(count, { status: 200 });
	} catch (error) {
		console.error('Error fetching Tournament count:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
