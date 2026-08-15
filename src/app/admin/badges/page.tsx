import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { AccessDenied } from '@/components/AccessDenied';
import BadgesClient from './BadgesClient';

export default async function AdminBadgesPage() {
	const session = await getAuthSession();
	const allowed = session ? await userHasPermission(session.user.id, 'content:manage') : false;

	if (!allowed) {
		return <AccessDenied resource='badges' />;
	}

	return <BadgesClient />;
}
