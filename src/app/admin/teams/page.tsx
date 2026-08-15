import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { AccessDenied } from '@/components/AccessDenied';
import TeamsClient from './TeamsClient';

export default async function AdminTeamsPage() {
	const session = await getAuthSession();
	const allowed = session ? await userHasPermission(session.user.id, 'teams:manage') : false;

	if (!allowed) {
		return <AccessDenied resource='teams' />;
	}

	return <TeamsClient />;
}
