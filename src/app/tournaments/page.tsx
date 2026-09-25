import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TournamentsSkeleton } from '@/components/public/TournamentsBrowser';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { TournamentsBrowser } from './_components/TournamentsBrowser';
import { TournamentList } from './_components/TournamentList';
import { getActiveTournaments } from './queries';
import { GAME_FILTER_COOKIE, GAME_META, parseGameParam } from '@/lib/games';
import { HubSubnav } from '@/components/shell/HubSubnav';
import { HubPageGlow } from '@/components/shell/HubPageGlow';

export const metadata: Metadata = { title: 'Tournaments' };

// Registrations and statuses change constantly; always render per request.
export const dynamic = 'force-dynamic';

/** Same query GET /api/tournaments?status=active runs (first page of 10, prize pool first), read directly. */
async function ActiveTournaments({ game }: { game: 'CS2' | 'LOL' }) {
	const tournaments = await getActiveTournaments(game);

	return (
		<TournamentList
			tournaments={tournaments.map((t) => ({ ...t, startDate: t.startDate.toISOString(), teams: t.teams as [] }))}
			empty={`No upcoming or live ${GAME_META[game].label} tournaments right now.`}
		/>
	);
}

export default async function Page({ searchParams }: { searchParams: Promise<{ game?: string }> }) {
	const [session, params, cookieStore] = await Promise.all([getAuthSession(), searchParams, cookies()]);
	const canCreate = session?.user ? await userHasPermission(session.user.id, 'tournaments:manage') : false;
	// ?game= wins (links, shares); without it, the channel the viewer last picked (cookie, set by the
	// navbar switch) — same rule as /matches and /teams. The list only ever shows one channel.
	const rawGame = params.game ?? cookieStore.get(GAME_FILTER_COOKIE)?.value;
	const game = parseGameParam(rawGame) ?? 'CS2';

	return (
		<>
			<HubPageGlow game={game} />
			<HubSubnav game={game} active='tournaments' />
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
				<TournamentsBrowser
					game={game}
					active={
						<Suspense fallback={<TournamentsSkeleton />} key={game}>
							<ActiveTournaments game={game} />
						</Suspense>
					}
				/>
			</div>
		</>
	);
}
