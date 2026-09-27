'use client';

import { useState } from 'react';
import type { Game } from '@prisma/client';
import { Check } from 'lucide-react';
import { GameGlyph } from '@/components/games/GameMark';
import { GAMES, GAME_META } from '@/lib/games';
import { cn } from '@/lib/utils';
import { StepHeading, StepFooter } from './StepChrome';

interface GamesStepProps {
	initialGames: Game[];
	previousStep: () => void;
	nextStep: (games: Game[]) => void;
	loading: boolean;
}

const BLURB: Record<Game, string> = {
	CS2: 'Hosted CS2 servers, map veto, live scores and your FACEIT level on your profile.',
	LOL: 'League events with tournament-code lobbies and pick/ban draft.',
};

function nextHint(games: Game[]): string {
	const cs2 = games.includes('CS2');
	const lol = games.includes('LOL');
	if (cs2 && lol) return 'Next: Steam, then your Riot ID';
	if (cs2) return 'Next: sign in with Steam';
	if (lol) return 'Next: link your Riot ID';
	return 'Pick at least one game to continue';
}

/** Onboarding "Which games do you play?": multi-select, at least one, drives which link steps follow. */
export function GamesStep({ initialGames, previousStep, nextStep, loading }: GamesStepProps) {
	const [games, setGames] = useState<Game[]>(initialGames);

	const toggle = (game: Game) => setGames((prev) => (prev.includes(game) ? prev.filter((g) => g !== game) : [...prev, game]));

	return (
		<div className='flex flex-1 flex-col px-6 py-10 sm:px-12'>
			<StepHeading title='Which games do you play?' description="We'll ask you to link the right account next. You can add the other game any time from Settings." />

			<div role='group' aria-label='Games you play' className='space-y-3'>
				{GAMES.map((game) => {
					const selected = games.includes(game);
					return (
						<button
							key={game}
							type='button'
							aria-pressed={selected}
							onClick={() => toggle(game)}
							className={cn(
								'flex w-full items-start gap-3 rounded-md border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
								selected ? 'border-white bg-white/[0.06]' : 'border-border hover:border-neutral-600 hover:bg-white/[0.02]',
							)}
						>
							<span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border bg-black', selected ? 'border-white' : 'border-border')}>
								<GameGlyph game={game} className='h-4 w-4' />
							</span>
							<span className='min-w-0 flex-1'>
								<span className='font-bold uppercase tracking-wide text-white'>{GAME_META[game].label}</span>
								<span className='mt-0.5 block text-xs text-neutral-400'>{BLURB[game]}</span>
							</span>
							<span className={cn('mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border', selected ? 'border-white bg-white text-black' : 'border-border')} aria-hidden>
								{selected && <Check className='h-3.5 w-3.5' />}
							</span>
						</button>
					);
				})}
			</div>

			<p className='mt-4 text-center text-xs font-medium uppercase tracking-wide text-neutral-500'>{nextHint(games)}</p>

			<StepFooter onPrevious={previousStep} onNext={() => nextStep(games)} nextDisabled={games.length === 0} loading={loading} />
		</div>
	);
}
