import type { Game } from '@prisma/client';
import { GAME_META } from '@/lib/games';
import { cn } from '@/lib/utils';

/**
 * Tournler's own geometric game marks (not Valve or Riot artwork): a squared crosshair for CS2, a
 * split diamond for League of Legends. Monochrome by design: game identity lives in shape and the
 * tag, never in hue (DESIGN.md On-Air Rule).
 */
export function GameGlyph({ game, className }: { game: Game; className?: string }) {
	return game === 'CS2' ? (
		<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.75} strokeLinecap='square' aria-hidden className={cn('h-4 w-4 shrink-0', className)}>
			<rect x='5' y='5' width='14' height='14' />
			<path d='M12 2v6M12 16v6M2 12h6M16 12h6' />
		</svg>
	) : (
		<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.75} strokeLinejoin='miter' aria-hidden className={cn('h-4 w-4 shrink-0', className)}>
			<path d='M12 2 22 12 12 22 2 12Z' />
			<path d='M12 2v20' />
		</svg>
	);
}

/** Glyph + short tag ("CS2" / "LoL"), the per-row game marker of the one feed. */
export function GameTag({ game, className, showLabel = true }: { game: Game; className?: string; showLabel?: boolean }) {
	return (
		<span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-border px-1.5 py-0.5 text-xs font-bold uppercase tracking-widest text-neutral-200', className)} title={GAME_META[game].label}>
			<GameGlyph game={game} className='h-3.5 w-3.5' />
			{showLabel ? GAME_META[game].short : <span className='sr-only'>{GAME_META[game].label}</span>}
		</span>
	);
}
