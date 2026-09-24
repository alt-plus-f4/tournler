import type { Metadata } from 'next';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { AccessDenied } from '@/components/AccessDenied';
import BansClient from './BansClient';

export const metadata: Metadata = { title: 'Bans' };

export default async function BansPage() {
	const session = await getAuthSession();
	const allowed = session ? await userHasPermission(session.user.id, 'users:ban') : false;
	if (!allowed) return <AccessDenied resource='bans' />;

	return <BansClient />;
}
