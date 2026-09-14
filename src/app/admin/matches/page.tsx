import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { AccessDenied } from '@/components/AccessDenied';
import MatchesClient from './MatchesClient';

export default async function AdminMatchesPage() {
	const session = await getAuthSession();
	const allowed = session ? await userHasPermission(session.user.id, 'matches:manage') : false;

	if (!allowed) {
		return <AccessDenied resource='matches' />;
	}

	return <MatchesClient />;
}
