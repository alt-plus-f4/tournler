import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import TeamDrawer from '@/components/TeamDrawer';
import { getAuthSession } from '@/lib/auth';
import LoginButtons from '@/components/LoginButtons';
import { fetchUserTeams } from '@/lib/helpers/fetch-user-team';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { GameTag } from '@/components/games/GameMark';
import { GameFilterChips } from '@/components/teams/GameFilterChips';
import { GAME_FILTER_COOKIE, GAME_META, GAMES, parseGameParam } from '@/lib/games';
import { TeamsCards, TeamsCardsSkeleton } from './_components/TeamsCards';

export const metadata: Metadata = {
	title: 'Teams',
};

// Team list and the viewer's own team change constantly; never serve a build-time snapshot.
export const dynamic = 'force-dynamic';

interface TeamsPageProps {
	searchParams?: Promise<{ game?: string | string[] }>;
}

export default async function Page({ searchParams }: TeamsPageProps = {}) {
	const [session, params, cookieStore] = await Promise.all([getAuthSession(), searchParams ?? Promise.resolve({} as { game?: string | string[] }), cookies()]);
	// ?game= wins (links, shares); without it, the filter the viewer last picked (cookie).
	const rawGame = typeof params.game === 'string' ? params.game : cookieStore.get(GAME_FILTER_COOKIE)?.value;
	const filter = parseGameParam(rawGame);

	const userTeams = session?.user.id ? await fetchUserTeams(session.user.id) : null;
	// Games the viewer can still create (or be invited to) a team for: one team per game.
	const openGames = session?.user ? GAMES.filter((g) => !userTeams?.[g]) : [];
	const showCreate = openGames.length > 0 && (filter === null || openGames.includes(filter));

	return (
		<div className='mx-auto my-8 w-full px-4 sm:w-[78%] sm:px-0'>
			<h1 className='text-3xl font-black uppercase tracking-wide md:text-5xl'>Teams</h1>
			<p className='mt-2 text-sm text-muted-foreground'>Counter-Strike 2 and League of Legends rosters on Tournler: five players, one of them captain. You can play for one team per game.</p>

			{!session?.user ? (
				<div className='mt-6 flex flex-col gap-3 rounded-md border border-border bg-card px-4 py-3 md:flex-row md:items-center md:justify-between'>
					<p className='text-sm'>Sign in to create a team or accept an invite to one.</p>
					<LoginButtons className='flex shrink-0 gap-x-2' />
				</div>
			) : (
				<ul aria-label='Your teams' className='mt-6 divide-y divide-border rounded-md border border-border bg-card'>
					{GAMES.map((game) => {
						const team = userTeams?.[game];
						return (
							<li key={game} className='flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>
								<div className='flex min-w-0 items-center gap-3'>
									<GameTag game={game} />
									{team ? (
										<p className='min-w-0 truncate text-sm'>
											You play for <span className='font-bold uppercase'>{team.name}</span>.
										</p>
									) : (
										<p className='text-sm text-muted-foreground'>No {GAME_META[game].short} team yet. Create one, or ask a captain to invite you.</p>
									)}
								</div>
								{team && (
									<Link href={`/teams/${team.id}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'shrink-0 self-start sm:self-auto')}>
										Go to your team<span className='sr-only'> ({GAME_META[game].label})</span>
									</Link>
								)}
							</li>
						);
					})}
				</ul>
			)}

			<div className='mt-10 mb-4 flex flex-wrap items-center justify-between gap-3'>
				<h2 className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>{filter ? `${GAME_META[filter].label} teams` : 'All teams'}</h2>
				<GameFilterChips basePath='/teams' active={filter} label='Filter teams by game' />
			</div>

			<div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
				{showCreate && <TeamDrawer games={openGames} defaultGame={filter ?? openGames[0]} />}
				{/* The shell (heading + your-team banner) paints first; the card grid streams in. */}
				<Suspense key={filter ?? 'all'} fallback={<TeamsCardsSkeleton />}>
					<TeamsCards game={filter} />
				</Suspense>
			</div>
		</div>
	);
}
