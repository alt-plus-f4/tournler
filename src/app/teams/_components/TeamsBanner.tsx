import Link from 'next/link';
import type { Game } from '@prisma/client';
import { getAuthSession } from '@/lib/auth';
import LoginButtons from '@/components/LoginButtons';
import { fetchUserTeams } from '@/lib/helpers/fetch-user-team';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GameTag } from '@/components/games/GameMark';
import { GAME_META } from '@/lib/games';

/**
 * Same wrapper classes as `TeamsBanner`'s own divs (border/padding/rounded/bg-card, flex-col
 * collapsing to flex-row at sm) so the box itself never resizes once the real content swaps in —
 * only the placeholder shapes inside it do. Sized to the "signed in with a team" variant (icon tag
 * + one text line + one button), the fullest of the three real outcomes.
 */
export function TeamsBannerSkeleton() {
	return (
		<div aria-hidden className='mt-6 flex flex-col gap-2 rounded-md border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>
			<div className='flex min-w-0 items-center gap-3'>
				<Skeleton className='h-[22px] w-7 shrink-0 rounded-sm' />
				<Skeleton className='h-4 w-48 max-w-full' />
			</div>
			<Skeleton className='h-9 w-32 shrink-0 self-start rounded-md sm:self-auto' />
		</div>
	);
}

/**
 * The viewer's own status for this game (signed out / no team yet / already on one) — its own
 * Suspense boundary (see the /teams page) so this personalized DB read (fetchUserTeams) never
 * blocks the page shell. getAuthSession and fetchUserTeams are both React-cached, so this costs
 * nothing extra alongside TeamsCreateSlot, which reads the same two things.
 */
export async function TeamsBanner({ game }: { game: Game }) {
	const session = await getAuthSession();
	if (!session?.user) {
		return (
			<div className='mt-6 flex flex-col gap-3 rounded-md border border-border bg-card px-4 py-3 md:flex-row md:items-center md:justify-between'>
				<p className='text-sm'>Sign in to create a team or accept an invite to one.</p>
				<LoginButtons className='flex shrink-0 gap-x-2' />
			</div>
		);
	}

	const userTeams = await fetchUserTeams(session.user.id);
	const team = userTeams?.[game];

	return (
		<div className='mt-6 flex flex-col gap-2 rounded-md border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>
			<div className='flex min-w-0 items-center gap-3'>
				<GameTag game={game} showLabel={false} />
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
		</div>
	);
}
