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
import { ReactNode, Suspense, useState } from 'react';
import { InviteConfirmationDialog } from './InviteConfirmationDialog';
import { User } from '@prisma/client';

interface UsersSearchProps {
	children: ReactNode;
	teamId: number;
	allUsers: User[];
	invitedPlayers: any;
}

export function UsersSearch({
	children,
	teamId,
	allUsers,
	invitedPlayers,
}: UsersSearchProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [dialog, setDialog] = useState<JSX.Element | undefined>();

	const invitedPlayersData = invitedPlayers?.teamInvitations || [];
	const invitedUserIds = invitedPlayersData.map(
		(invitation: { userId: number }) => invitation.userId
	);

	function completeSuccessfulInviteConfirmation(userId: string) {
		console.log(userId);
		// ! = = SEND NOTIFICATION
	}

	function openInviteConfirmation(user: User) {
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

	function commandItemProfile(user: User, isInvited: boolean = false) {
		return (
			<>
				<div className='mr-2'>
					<Avatar>
						<AvatarImage
							src={user.image ?? ''}
							alt={`${user.name} avatar`}
						/>
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
					<CommandEmpty>No results found.</CommandEmpty>
					<Suspense
						fallback={<CommandGroup>Loading...</CommandGroup>}
					>
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
										{commandItemProfile(user, isInvited)}
									</CommandItem>
								);
							})}
						</CommandGroup>
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
