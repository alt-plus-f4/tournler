'use client';

import { ReactNode, useState } from 'react';
import dynamic from 'next/dynamic';
import { Slot } from '@radix-ui/react-slot';
import type { Game } from '@prisma/client';
import { useHydrated } from '@/lib/hooks/use-hydrated';

interface UsersSearchProps {
	children: ReactNode;
	teamId: number;
	teamName: string;
	/** The team's game: only players without a team of this game can be invited. */
	game: Game;
	invitedPlayers: any;
}

const loadPalette = () => import('./UsersSearchPalette');
// The command palette (cmdk + Radix Dialog) and invite dialog are fetched on first hover/focus/click of
// the trigger. ssr: false also keeps the palette out of SSR, which used to cause a hydration mismatch
// reported against a nearby sibling (LeaveTeamDialog's button).
const UsersSearchPalette = dynamic(loadPalette, { ssr: false });

/**
 * Renders `children` (the trigger) right away; the player-search palette mounts on first open.
 *
 * Radix's Slot (asChild) attaches its onPointerEnter/onFocus/onClick props to the child only on the
 * client, which never matches the plain SSR markup no matter what — same issue and same fix as
 * TeamMemberAvatar's HoverCardTrigger: render the identical plain trigger for the first
 * (server-matching) client render, then swap in the Slot-wrapped, interactive one post-mount. That
 * swap is an ordinary client re-render, so it can't itself cause a hydration mismatch.
 */
export function UsersSearch({ children, teamId, teamName, game, invitedPlayers }: UsersSearchProps) {
	const [isOpen, setIsOpen] = useState(false);
	// Stays true after the first open so the palette keeps its state and can animate closed.
	const [mounted, setMounted] = useState(false);
	const isHydrated = useHydrated();

	return (
		<>
			{mounted && <UsersSearchPalette open={isOpen} onOpenChange={setIsOpen} teamId={teamId} teamName={teamName} game={game} invitedPlayers={invitedPlayers} />}
			{/* The trigger passed in (a Button) receives the click handler directly, so it stays a real, keyboard-operable button. */}
			{children && !isHydrated && children}
			{children && isHydrated && (
				<Slot
					onPointerEnter={loadPalette}
					onFocus={loadPalette}
					onClick={() => {
						setMounted(true);
						setIsOpen(true);
					}}
				>
					{children}
				</Slot>
			)}
		</>
	);
}
