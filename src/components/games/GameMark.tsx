import Image from 'next/image';
import type { Game } from '@prisma/client';
import { GAME_META, GAME_ICON_SRC } from '@/lib/games';
import { cn } from '@/lib/utils';

/**
 * Each game's real mark, everywhere a game is labeled: the white-on-transparent icons in /public
 * (the CS2 soldier icon, Ahri for LoL — GAME_ICON_SRC). The hue accent stays confined to the CS2/LoL
 * hub chrome (GAME_ACCENT, DESIGN.md's Hub Accent exception); this icon itself does not.
 */
export function GameGlyph({ game, className }: { game: Game; className?: string }) {
	return <Image src={GAME_ICON_SRC[game]} alt='' width={16} height={16} className={cn('h-4 w-4 shrink-0 object-contain', className)} />;
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
