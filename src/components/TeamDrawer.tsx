'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Plus } from 'lucide-react';
import type { Game } from '@prisma/client';
import { GameGlyph } from '@/components/games/GameMark';
import { GAME_META } from '@/lib/games';

const loadPanel = () => import('./TeamDrawerPanel');
// The drawer + form (vaul, react-hook-form, zod) are fetched on first hover/focus/tap of the tile,
// not shipped with the teams page.
const TeamCreationDrawerPanel = dynamic(loadPanel, { ssr: false });

/** `games`: the games the viewer has no team for yet (one team per game); the form offers only those. */
export function TeamCreationDrawer({ games, defaultGame }: { games: Game[]; defaultGame?: Game }) {
	const [open, setOpen] = useState(false);
	// Stays true after the first open so the drawer stays mounted and can animate closed.
	const [mounted, setMounted] = useState(false);
	const triggerRef = useRef<HTMLButtonElement>(null);

	return (
		<>
			<button
				ref={triggerRef}
				type='button'
				aria-haspopup='dialog'
				aria-expanded={open}
				onPointerEnter={loadPanel}
				onFocus={loadPanel}
				onClick={() => {
					setMounted(true);
					setOpen(true);
				}}
				className='flex min-h-[200px] w-full flex-col items-center justify-center gap-3 rounded-md border border-dashed border-neutral-600 bg-transparent px-4 text-center transition-colors hover:border-neutral-400 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
			>
				<Plus aria-hidden className='h-10 w-10 text-neutral-300' />
				<span className='text-lg font-black uppercase tracking-wide text-white'>{games.length === 1 ? `Create a ${GAME_META[games[0]].short} team` : 'Create a team'}</span>
				<span className='flex items-center gap-2 text-neutral-400' aria-hidden>
					{games.map((g) => (
						<GameGlyph key={g} game={g} />
					))}
				</span>
				<span className='text-sm text-muted-foreground'>You become captain and can invite up to 4 players.</span>
			</button>
			{mounted && <TeamCreationDrawerPanel open={open} onOpenChange={setOpen} triggerRef={triggerRef} games={games} defaultGame={defaultGame && games.includes(defaultGame) ? defaultGame : games[0]} />}
		</>
	);
}

export default TeamCreationDrawer;
