import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';

/** Session + `content:manage` gate shared by the news write routes. */
export async function requireContentManager() {
	const session = await getAuthSession();
	if (!session) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;
	if (!(await userHasPermission(session.user.id, 'content:manage'))) {
		return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) } as const;
	}
	return { session } as const;
}

export function parseId(raw: string): number | null {
	if (!/^\d{1,9}$/.test(raw)) return null;
	return Number(raw);
}
