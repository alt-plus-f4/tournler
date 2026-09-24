'use client';

import { useState } from 'react';
import type { Game } from '@prisma/client';
import { Check } from 'lucide-react';
import { Button } from '../ui/button';
import { DialogFooter } from '../ui/dialog';
import { GameGlyph } from '@/components/games/GameMark';
import { GAMES, GAME_META } from '@/lib/games';
import { cn } from '@/lib/utils';

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
		<div className='w-full max-w-md'>
			<h2 className='text-center text-2xl font-semibold'>Which games do you play?</h2>
			<p className='mt-1 text-center text-sm text-muted-foreground'>We&apos;ll ask you to link the right account next. You can add the other game any time from Settings.</p>

			<div role='group' aria-label='Games you play' className='mt-6 space-y-3'>
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
								selected ? 'border-foreground bg-foreground/5' : 'border-border hover:bg-muted',
							)}
						>
							<span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border', selected ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground')}>
								<GameGlyph game={game} className='h-4 w-4' />
							</span>
							<span className='min-w-0 flex-1'>
								<span className='flex items-center gap-2'>
									<span className='font-bold uppercase tracking-wide'>{GAME_META[game].label}</span>
								</span>
								<span className='mt-0.5 block text-xs text-muted-foreground'>{BLURB[game]}</span>
							</span>
							<span className={cn('mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border', selected ? 'border-foreground bg-foreground text-background' : 'border-border')} aria-hidden>
								{selected && <Check className='h-3.5 w-3.5' />}
							</span>
						</button>
					);
				})}
			</div>

			<p className='mt-4 text-center text-xs text-muted-foreground'>{nextHint(games)}</p>

			<DialogFooter className='mt-6 flex justify-around'>
				<Button onClick={previousStep} variant='secondary' className='sm:w-48' disabled={loading}>
					Previous
				</Button>
				<Button onClick={() => nextStep(games)} variant='outline' className='sm:w-48' disabled={games.length === 0 || loading}>
					{loading ? 'Saving…' : 'Continue'}
				</Button>
			</DialogFooter>
		</div>
	);
}
