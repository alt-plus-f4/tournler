import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { activeBanWhere, toActiveBan } from '@/lib/bans';

const PAGE_SIZE = 25;
const person = { select: { id: true, name: true, image: true, role: true } } as const;

/**
 * GET /api/admin/bans — requires `users:ban`.
 *   ?q=<name>             player search (no emails: moderators don't get users:manage data)
 *   ?status=active|all    ban history, newest first, paginated with ?page=
 */
export async function GET(request: Request) {
	const session = await getAuthSession();
	if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	if (!(await userHasPermission(session.user.id, 'users:ban'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

	const { searchParams } = new URL(request.url);
	const q = searchParams.get('q')?.trim();

	if (q !== undefined) {
		if (q.length < 2) return NextResponse.json({ users: [] });
		const users = await db.user.findMany({
			where: { name: { contains: q, mode: 'insensitive' } },
			orderBy: { name: 'asc' },
			take: 10,
			select: { id: true, name: true, image: true, role: true, bans: { where: activeBanWhere(), take: 1, orderBy: { createdAt: 'desc' } } },
		});
		return NextResponse.json({ users: users.map(({ bans, ...u }) => ({ ...u, ban: toActiveBan(bans[0]) })) });
	}

	const status = searchParams.get('status') === 'all' ? 'all' : 'active';
	const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);
	const where = status === 'active' ? activeBanWhere() : {};

	const [bans, total] = await Promise.all([
		db.userBan.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			skip: (page - 1) * PAGE_SIZE,
			take: PAGE_SIZE,
			include: { user: person, bannedBy: { select: { id: true, name: true } }, liftedBy: { select: { id: true, name: true } } },
		}),
		db.userBan.count({ where }),
	]);

	const now = Date.now();
	return NextResponse.json({
		bans: bans.map((b) => ({
			id: b.id,
			reason: b.reason,
			createdAt: b.createdAt.toISOString(),
			expiresAt: b.expiresAt?.toISOString() ?? null,
			liftedAt: b.liftedAt?.toISOString() ?? null,
			active: !b.liftedAt && (!b.expiresAt || b.expiresAt.getTime() > now),
			user: b.user,
			bannedBy: b.bannedBy,
			liftedBy: b.liftedBy,
		})),
		totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
	});
}
