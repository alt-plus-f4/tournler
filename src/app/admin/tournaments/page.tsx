import type { Metadata } from 'next';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { AccessDenied } from '@/components/AccessDenied';
import TournamentsClient from './TournamentsClient';

export const metadata: Metadata = { title: 'Tournaments' };

export default async function AdminTournamentsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
	const { create } = await searchParams;
	const session = await getAuthSession();
	const allowed = session ? await userHasPermission(session.user.id, 'tournaments:manage') : false;

	if (!allowed) {
		return <AccessDenied resource='tournaments' />;
	}

	return <TournamentsClient openCreate={create === '1'} />;
}
