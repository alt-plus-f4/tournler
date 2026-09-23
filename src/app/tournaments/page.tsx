import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TournamentsBrowser } from '@/components/public/TournamentsBrowser';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';

export const metadata: Metadata = { title: 'Tournaments' };

export default async function Page() {
	const session = await getAuthSession();
	const canCreate = session?.user ? await userHasPermission(session.user.id, 'tournaments:manage') : false;

	return (
		<div className='container mx-auto max-w-[1400px] px-4 py-8 lg:px-8'>
			<div className='mb-6 flex flex-wrap items-center justify-between gap-4'>
				<h1 className='text-3xl font-black uppercase tracking-wide text-white sm:text-4xl'>Tournaments</h1>
				{canCreate && (
					<Button asChild>
						<Link href='/admin/tournaments?create=1'>
							<Plus className='h-4 w-4' aria-hidden />
							Create tournament
						</Link>
					</Button>
				)}
			</div>
			<TournamentsBrowser />
		</div>
	);
}
