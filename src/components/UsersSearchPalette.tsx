'use client';

import { Avatar, AvatarImage, AvatarFallback } from '@radix-ui/react-avatar';
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { useEffect, useState } from 'react';
import { InviteConfirmationDialog } from './InviteConfirmationDialog';
import type { InvitedPlayers, ReducedUser } from '@/types/types';
import type { Game } from '@prisma/client';
import { GAME_META } from '@/lib/games';

interface UsersSearchPaletteProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	teamId: number;
	teamName: string;
	game: Game;
	invitedPlayers: InvitedPlayers | null;
}

/**
 * Debounced as-you-type player search, backed by `GET /api/teams/[slug]/invitable-users` — the
 * previous version received every invitable user prefetched into the page as an `allUsers` prop
 * (see GitHub issue #69), which meant fetching and shipping the entire non-team-member user list
 * on every team page load whether or not the captain ever opened the invite dialog.
 */
function useInvitableUsers(teamId: number, query: string, isOpen: boolean) {
	const [users, setUsers] = useState<ReducedUser[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!isOpen) return;
		let cancelled = false;
		setLoading(true);
		const timer = setTimeout(async () => {
			try {
				const response = await fetch(`/api/teams/${teamId}/invitable-users?search=${encodeURIComponent(query)}`);
				if (!response.ok) throw new Error('Search failed');
				const data = await response.json();
				if (!cancelled) setUsers(data.users ?? []);
			} catch (error) {
				console.error('Failed to search invitable users:', error);
				if (!cancelled) setUsers([]);
			} finally {
				if (!cancelled) setLoading(false);
			}
		}, 250);

		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [teamId, query, isOpen]);

	return { users, loading };
}

/** The search palette and invite confirmation, loaded by UsersSearch the first time its trigger is clicked. */
export default function UsersSearchPalette({ open: isOpen, onOpenChange: setIsOpen, teamId, game, invitedPlayers }: UsersSearchPaletteProps) {
	const [dialog, setDialog] = useState<JSX.Element | undefined>();
	const [localInvitedUserIds, setLocalInvitedUserIds] = useState<string[]>([]);
	const [query, setQuery] = useState('');
	const { users: allUsers, loading } = useInvitableUsers(teamId, query, isOpen);

	const invitedUserIds = [...(invitedPlayers?.teamInvitations ?? []).map((invitation) => invitation.userId), ...localInvitedUserIds];

	function completeSuccessfulInviteConfirmation(userId: string) {
		// The invite API route sends the Convex notification server-side.
		setLocalInvitedUserIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
	}

	function undoInvite(userId: string) {
		setLocalInvitedUserIds((prev) => prev.filter((id) => id !== userId));
	}

	function openInviteConfirmation(user: ReducedUser) {
		setIsOpen(false);

		const currentDialog = (
			<InviteConfirmationDialog
				key={user.id}
				user={user}
				teamId={teamId}
				completeSuccessfulInviteConfirmation={() => completeSuccessfulInviteConfirmation(user.id)}
				onInviteStart={() => completeSuccessfulInviteConfirmation(user.id)}
				onInviteFailed={() => undoInvite(user.id)}
				onOpenChange={(isOpen) => {
					if (!isOpen) {
						setDialog(undefined);
					}
				}}
			/>
		);

		setDialog(currentDialog);
	}

	function commandItemProfile(user: ReducedUser, isInvited: boolean = false) {
		return (
			<>
				<Avatar className='relative mr-3 flex h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted'>
					{user.image && <AvatarImage className='h-full w-full object-cover' src={user.image} alt='' />}
					<AvatarFallback className='flex h-full w-full items-center justify-center text-xs font-semibold'>{user.name?.charAt(0) ?? 'X'}</AvatarFallback>
				</Avatar>
				<div className='min-w-0 flex-1'>
					<p className='truncate font-semibold'>{user.name}</p>
					<p className='truncate text-xs text-muted-foreground'>{user.email}</p>
				</div>
				{isInvited && <span className='ml-3 shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-signal-ready-text'>Invited</span>}
			</>
		);
	}

	return (
		<>
			<CommandDialog open={isOpen} onOpenChange={setIsOpen} shouldFilter={false}>
				<CommandInput placeholder={`Search players without a ${GAME_META[game].short} team…`} value={query} onValueChange={setQuery} />
				<CommandList>
					{loading ? (
						<CommandGroup>
							<p className='px-2 py-3 text-sm text-muted-foreground' role='status'>
								Searching…
							</p>
						</CommandGroup>
					) : (
						<>
							<CommandEmpty>No players found. Anyone already on a {GAME_META[game].short} team can&apos;t be invited.</CommandEmpty>
							{allUsers.length > 0 && (
								<CommandGroup heading='Players'>
									{allUsers.map((user) => {
										const isInvited = invitedUserIds.includes(user.id);
										return (
											<CommandItem className='cursor-pointer rounded-md px-3' key={user.id} onSelect={() => !isInvited && openInviteConfirmation(user)} disabled={isInvited}>
												{commandItemProfile(user, isInvited)}
											</CommandItem>
										);
									})}
								</CommandGroup>
							)}
						</>
					)}
				</CommandList>
				<div className='border-t border-border px-4 py-2.5 text-xs text-muted-foreground'>↑↓ to move · Enter to invite · Esc to close</div>
			</CommandDialog>

			{dialog}
		</>
	);
}
