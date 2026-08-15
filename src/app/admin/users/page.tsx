import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { AccessDenied } from '@/components/AccessDenied';
import UsersClient from './UsersClient';

export default async function UsersPage() {
	const session = await getAuthSession();
	const allowed = session ? await userHasPermission(session.user.id, 'users:manage') : false;

	if (!allowed) {
		return <AccessDenied resource='users' />;
	}

	return <UsersClient />;
}
