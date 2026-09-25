import Link from 'next/link';
import type { Game } from '@prisma/client';
import { GAME_META, gameParam } from '@/lib/games';
import { GameGlyph } from '@/components/games/GameMark';
import { cn } from '@/lib/utils';

export type HubTab = 'tournaments' | 'matches' | 'teams';

const TABS: { key: HubTab; label: string; path: string }[] = [
	{ key: 'tournaments', label: 'Tournaments', path: '/tournaments' },
	{ key: 'matches', label: 'Matches', path: '/matches' },
	{ key: 'teams', label: 'Teams', path: '/teams' },
];

/**
 * Direction B's "the other stuff" row: a second navbar, full width and sticky right under the
 * global one, for the hub pages (Tournaments/Matches/Teams). Names the active hub on the left and
 * switches between its three lists on the right, without losing the game — every link carries
 * `?game=` so a bookmark or share stays in the right hub.
 */
export function HubSubnav({ game, active }: { game: Game; active: HubTab }) {
	const q = gameParam(game);

	return (
		<div className='sticky top-16 z-40 w-full border-b navbar-color xl:top-14'>
			<div className='mx-auto flex h-11 max-w-[1400px] items-center gap-x-6 px-4 lg:px-8'>
				<span className='flex shrink-0 items-center gap-2 text-sm'>
					<span className='hidden text-neutral-500 sm:inline'>Tournler</span>
					<span className='hidden text-neutral-600 sm:inline' aria-hidden>
						/
					</span>
					<span className='flex items-center gap-1.5 font-bold text-white'>
						<GameGlyph game={game} className='h-4 w-4' />
						{GAME_META[game].label} hub
					</span>
				</span>
				<nav aria-label='Hub sections' className='flex h-full items-center gap-1 overflow-x-auto text-sm'>
					{TABS.map((t) => {
						const isActive = t.key === active;
						return (
							<Link
								key={t.key}
								href={`${t.path}?game=${q}`}
								aria-current={isActive ? 'page' : undefined}
								className={cn(
									'flex h-full shrink-0 items-center border-b-2 border-transparent px-3 font-medium transition-colors',
									isActive ? 'border-white text-white' : 'text-neutral-400 hover:text-white',
								)}
							>
								{t.label}
							</Link>
						);
					})}
				</nav>
			</div>
		</div>
	);
}

/**
 * Same box, same tab labels, same active tab as HubSubnav — the route (so the tab) is always known
 * before the page loads, only the game (hence the hue and the hub name) isn't yet, since that reads
 * cookies/searchParams the fallback can't wait on without losing its instantness. So nothing here
 * reflows or relabels when the real bar swaps in: the active tab just turns from neutral to its hue,
 * and the hub name/glyph fade in from a same-sized placeholder.
 */
export function HubSubnavSkeleton({ active }: { active: HubTab }) {
	return (
		<div className='sticky top-16 z-40 w-full border-b navbar-color xl:top-14' aria-hidden>
			<div className='mx-auto flex h-11 max-w-[1400px] items-center gap-x-6 px-4 lg:px-8'>
				<span className='flex shrink-0 items-center gap-2 text-sm'>
					<span className='hidden text-neutral-500 sm:inline'>Tournler</span>
					<span className='hidden text-neutral-600 sm:inline'>/</span>
					<span className='flex items-center gap-1.5 font-bold text-neutral-400'>
						<span className='h-4 w-4 animate-pulse rounded-full bg-neutral-800' />
						<span className='h-3.5 w-24 animate-pulse rounded bg-neutral-800' />
					</span>
				</span>
				<nav className='flex h-full items-center gap-1 overflow-x-auto text-sm'>
					{TABS.map((t) => (
						<span
							key={t.key}
							className={cn(
								'flex h-full shrink-0 items-center border-b-2 border-transparent px-3 font-medium',
								t.key === active ? 'text-white' : 'text-neutral-400',
							)}
						>
							{t.label}
						</span>
					))}
				</nav>
			</div>
		</div>
	);
}
