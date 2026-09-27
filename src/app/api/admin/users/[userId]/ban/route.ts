import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { BAN_DURATIONS, activeBanWhere, banBlockedReason, toActiveBan, type BanDuration } from '@/lib/bans';

const BanInput = z.object({
	reason: z.string().trim().min(3, 'Give a reason of at least 3 characters.').max(500, 'Keep the reason under 500 characters.'),
	duration: z.enum(Object.keys(BAN_DURATIONS) as [BanDuration, ...BanDuration[]]),
});

async function authorize(userId: string) {
	const session = await getAuthSession();
	if (!session) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
	if (!(await userHasPermission(session.user.id, 'users:ban'))) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };

	const [actor, target] = await Promise.all([
		db.user.findUnique({ where: { id: session.user.id }, select: { id: true, role: true } }),
		db.user.findUnique({ where: { id: userId }, select: { id: true, role: true, name: true } }),
	]);
	if (!actor) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
	if (!target) return { error: NextResponse.json({ error: 'User not found' }, { status: 404 }) };

	const blocked = banBlockedReason(actor, target);
	if (blocked) return { error: NextResponse.json({ error: blocked }, { status: 403 }) };
	return { actor, target };
}

/** POST /api/admin/users/[userId]/ban — suspend a user. Requires `users:ban`. */
export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
	const { userId } = await params;
	const auth = await authorize(userId);
	if ('error' in auth) return auth.error;

	const parsed = BanInput.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid ban' }, { status: 400 });

	const days = BAN_DURATIONS[parsed.data.duration];
	const expiresAt = days === null ? null : new Date(Date.now() + days * 24 * 60 * 60 * 1000);

	// One active ban at a time: a new ban replaces (lifts) the current one, keeping it in history.
	const ban = await db.$transaction(async (tx) => {
		await tx.userBan.updateMany({ where: { userId, ...activeBanWhere() }, data: { liftedAt: new Date(), liftedById: auth.actor.id } });
		return tx.userBan.create({ data: { userId, reason: parsed.data.reason, expiresAt, bannedById: auth.actor.id } });
	});

	return NextResponse.json({ ban: toActiveBan(ban) }, { status: 201 });
}

/** DELETE /api/admin/users/[userId]/ban — lift the active ban. Requires `users:ban`. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
	const { userId } = await params;
	const auth = await authorize(userId);
	if ('error' in auth) return auth.error;

	const { count } = await db.userBan.updateMany({ where: { userId, ...activeBanWhere() }, data: { liftedAt: new Date(), liftedById: auth.actor.id } });
	if (count === 0) return NextResponse.json({ error: 'This user is not banned' }, { status: 404 });
	return NextResponse.json({ lifted: count }, { status: 200 });
}
