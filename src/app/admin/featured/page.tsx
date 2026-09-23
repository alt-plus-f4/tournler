import type { Metadata } from 'next';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { AccessDenied } from '@/components/AccessDenied';
import FeaturedClient from './FeaturedClient';

export const metadata: Metadata = { title: 'Featured' };

export default async function AdminFeaturedPage() {
	const session = await getAuthSession();
	const allowed = session ? await userHasPermission(session.user.id, 'content:manage') : false;

	if (!allowed) {
		return <AccessDenied resource='featured content' />;
	}

	return <FeaturedClient />;
}
