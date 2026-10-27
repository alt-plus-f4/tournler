import type { Metadata } from 'next';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { AccessDenied } from '@/components/AccessDenied';
import ServersClient from './ServersClient';

export const metadata: Metadata = { title: 'Game servers' };

export default async function AdminServersPage() {
	const session = await getAuthSession();
	const allowed = session ? await userHasPermission(session.user.id, 'servers:manage') : false;

	if (!allowed) {
		return <AccessDenied resource='game servers' />;
	}

	return <ServersClient />;
}
