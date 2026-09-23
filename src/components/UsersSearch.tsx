'use client';

import { Avatar, AvatarImage, AvatarFallback } from '@radix-ui/react-avatar';
import {
	CommandDialog,
	CommandInput,
	CommandList,
	CommandEmpty,
	CommandGroup,
	CommandItem,
} from '@/components/ui/command';
import { ReactNode, useEffect, useState } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { InviteConfirmationDialog } from './InviteConfirmationDialog';
import { ReducedUser } from '@/types/types';

interface UsersSearchProps {
	children: ReactNode;
	teamId: number;
	teamName: string;
	invitedPlayers: any;
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

/**
 * Renders `children` immediately but defers the search palette until after mount (same pattern as
 * TeamMemberAvatar's HoverCard) — rendering it during SSR caused a hydration mismatch that got
 * reported against a nearby sibling (LeaveTeamDialog's button).
 */
export function UsersSearch(props: UsersSearchProps) {
	const [isMounted, setIsMounted] = useState(false);
	useEffect(() => setIsMounted(true), []);

	if (!isMounted) {
		return props.children ? <div className='cursor-pointer'>{props.children}</div> : null;
	}

	return <UsersSearchInner {...props} />;
}

function UsersSearchInner({
	children,
	teamId,
	invitedPlayers,
}: UsersSearchProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [dialog, setDialog] = useState<JSX.Element | undefined>();
    const [localInvitedUserIds, setLocalInvitedUserIds] = useState<string[]>([]);
	const [query, setQuery] = useState('');
	const { users: allUsers, loading } = useInvitableUsers(teamId, query, isOpen);

	const invitedPlayersData = invitedPlayers?.teamInvitations || [];
    const invitedUserIds = [...invitedPlayersData.map(
        (invitation: { userId: number }) => invitation.userId
    ), ...localInvitedUserIds];

	function completeSuccessfulInviteConfirmation(userId: string) {
        // The invite API route sends the Convex notification server-side.
        setLocalInvitedUserIds(prev => [...prev, userId]);
    }

	function openInviteConfirmation(user: ReducedUser) {
        setIsOpen(false);

        const currentDialog = (
            <InviteConfirmationDialog
                key={user.id}
                user={user}
                teamId={teamId}
                completeSuccessfulInviteConfirmation={() =>
                    completeSuccessfulInviteConfirmation(user.id)
                }
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
				<div className='mr-2'>
					<Avatar>
						{user.image && (
							<AvatarImage
								className='w-12 h-12'
								src={user.image}
								alt=''
							/>
						)}
						<AvatarFallback>
							{user.name?.charAt(0) ?? 'X'}
						</AvatarFallback>
					</Avatar>
				</div>
				<div>
					<p className='font-semibold'>{user.name}</p>
					<p className='text-sm text-muted-foreground'>{user.email}</p>
					{isInvited && (
						<p className='text-sm text-signal-ready-text'>Invited</p>
					)}
				</div>
			</>
		);
	}

	return (
		<>
			<CommandDialog open={isOpen} onOpenChange={setIsOpen}>
				<CommandInput placeholder='Search for players…' value={query} onValueChange={setQuery} />
				<CommandList>
					{loading ? (
						<CommandGroup><p className='px-2 py-3 text-sm text-muted-foreground' role='status'>Searching…</p></CommandGroup>
					) : (
						<>
							<CommandEmpty>No users found.</CommandEmpty>
							{allUsers.length > 0 && (
								<CommandGroup heading='Players'>
									{allUsers.map((user) => {
										const isInvited = invitedUserIds.includes(
											user.id
										);
										return (
											<CommandItem
												className='cursor-pointer'
												key={user.id}
												onSelect={() =>
													!isInvited &&
													openInviteConfirmation(user)
												}
												disabled={isInvited}
											>
												{commandItemProfile(
													user,
													isInvited
												)}
											</CommandItem>
										);
									})}
								</CommandGroup>
							)}
						</>
					)}
				</CommandList>
			</CommandDialog>

			{/* The trigger passed in (a Button) receives the click handler directly, so it stays a real, keyboard-operable button. */}
			{children && <Slot onClick={() => setIsOpen(true)}>{children}</Slot>}

			{dialog}
		</>
	);
}
