import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { AccessDenied } from '@/components/AccessDenied';
import TournamentsClient from './TournamentsClient';

export default async function AdminTournamentsPage() {
	const session = await getAuthSession();
	const allowed = session ? await userHasPermission(session.user.id, 'tournaments:manage') : false;

	if (!allowed) {
		return <AccessDenied resource='tournaments' />;
	}

	return <TournamentsClient />;
}
