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
import { ReactNode, Suspense, useEffect, useState } from 'react';
import { InviteConfirmationDialog } from './InviteConfirmationDialog';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ReducedUser } from '@/types/types';

interface UsersSearchProps {
	children: ReactNode;
	teamId: number;
	teamName: string;
	allUsers: ReducedUser[];
	invitedPlayers: any;
}

/**
 * Convex's `useMutation` depends on a client-only provider that isn't
 * available during SSR, which was causing this subtree (and its search
 * command palette) to render differently on the server than on the client —
 * a hydration mismatch that got reported against a nearby sibling
 * (LeaveTeamDialog's button) rather than this component itself. Rendering
 * `children` immediately but deferring everything that depends on Convex
 * until after mount (same pattern already used for TeamMemberAvatar's
 * HoverCard) avoids ever calling `useMutation` during the SSR pass.
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
	teamName,
	allUsers,
	invitedPlayers,
}: UsersSearchProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [dialog, setDialog] = useState<JSX.Element | undefined>();
    const [localInvitedUserIds, setLocalInvitedUserIds] = useState<string[]>([]);

	const inviteNotif = useMutation(
		api.notifications.createTeamInviteNotification
	);

	async function sendInviteNotification(userId: string, teamId: number) {
		try {
			await inviteNotif({
				text:
					'You have been invited to join the team ' + teamName + '.',
				userId,
				teamId,
			});
		} catch (error) {
			console.error('Failed to send invite notification:', error);
		}
	}

	const invitedPlayersData = invitedPlayers?.teamInvitations || [];
    const invitedUserIds = [...invitedPlayersData.map(
        (invitation: { userId: number }) => invitation.userId
    ), ...localInvitedUserIds];

	function completeSuccessfulInviteConfirmation(userId: string) {
        sendInviteNotification(userId, teamId);
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
								alt={`${user.name} avatar`}
							/>
						)}
						<AvatarFallback>
							{user.name?.charAt(0) ?? 'X'}
						</AvatarFallback>
					</Avatar>
				</div>
				<div>
					<p className='font-semibold'>{user.name}</p>
					<p>{user.email}</p>
					{isInvited && (
						<p className='text-sm text-green-500'>Invited</p>
					)}
				</div>
			</>
		);
	}

	return (
		<>
			<CommandDialog open={isOpen} onOpenChange={setIsOpen}>
				<CommandInput placeholder='Search for users...' />
				<CommandList>
					<CommandEmpty>No users found.</CommandEmpty>
					<Suspense
						fallback={<CommandGroup>Loading...</CommandGroup>}
					>
						{allUsers.length > 0 && (
							<CommandGroup heading='All Users'>
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
					</Suspense>
				</CommandList>
			</CommandDialog>

			{children && (
				<div onClick={() => setIsOpen(true)} className='cursor-pointer'>
					{children}
				</div>
			)}

			{dialog}
		</>
	);
}
