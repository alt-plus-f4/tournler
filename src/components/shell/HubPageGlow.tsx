import type { Game } from '@prisma/client';
import { GAME_ACCENT } from '@/lib/games';

/**
 * The hub accent hue (GAME_ACCENT), on the page rather than the nav: a very soft, fixed radial
 * wash behind the hub's content (Tournaments/Matches/Teams), fading out well before the fold. Sits
 * above the sitewide InteractiveBackground grid and below everything else — content, cards and text
 * paint over it untouched.
 */
export function HubPageGlow({ game }: { game: Game }) {
	const { hex } = GAME_ACCENT[game];
	return <div aria-hidden className='pointer-events-none fixed inset-0 -z-10' style={{ background: `radial-gradient(2000px circle at 50% -10%, ${hex}10, transparent 70%)` }} />;
}
