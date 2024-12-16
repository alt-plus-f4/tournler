'use client';

import { Avatar, AvatarImage, AvatarFallback } from '@radix-ui/react-avatar';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'; // Shadcn command components
import React, { ReactNode, useState } from 'react';
import { InviteConfirmationDialog } from './InviteConfirmationDialog';
import { ExtendedUser } from '@/lib/models/user-model';

interface UsersSearchProps {
  children: ReactNode;
  teamId: number;
  usersWithoutATeam: ExtendedUser[];
  usersWithATeam: ExtendedUser[];
  usersRequestedToJoin: ExtendedUser[];
  usersAlreadyInvited: ExtendedUser[];
}

export function UsersSearch({
  children,
  teamId,
  usersWithoutATeam,
  usersWithATeam,
  usersRequestedToJoin,
  usersAlreadyInvited,
}: UsersSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dialog, setDialog] = useState<JSX.Element | undefined>();
  const [usersWithoutATeamState, setUsersWithoutATeamState] = useState(usersWithoutATeam);
  const [usersWithATeamState, setUsersWithATeamState] = useState(usersWithATeam);
  const [usersRequestedToJoinState, setUsersRequestedToJoinState] = useState(usersRequestedToJoin);
  const [usersAlreadyInvitedState, setUsersAlreadyInvitedState] = useState(usersAlreadyInvited);

  function completeSuccessfulInviteConfirmation(userId: string) {
    const invitedUser = [
      ...usersWithoutATeamState,
      ...usersWithATeamState,
      ...usersRequestedToJoinState,
    ].find((user) => user.id === userId) as ExtendedUser;

    setUsersAlreadyInvitedState([invitedUser, ...usersAlreadyInvitedState]);
    setUsersWithoutATeamState(usersWithoutATeamState.filter((user) => user.id !== userId));
    setUsersWithATeamState(usersWithATeamState.filter((user) => user.id !== userId));
    setUsersRequestedToJoinState(usersRequestedToJoinState.filter((user) => user.id !== userId));
  }

  function openInviteConfirmation(user: ExtendedUser) {
    setIsOpen(false);

    const currentDialog = (
      <InviteConfirmationDialog
        key={user.id}
        user={user}
        teamId={teamId}
        completeSuccessfulInviteConfirmation={() => completeSuccessfulInviteConfirmation(user.id)}
      />
    );

    setDialog(currentDialog);
  }

  function commandItemProfile(user: ExtendedUser) {
    return (
      <>
        <div className="mr-2">
          <Avatar>
            <AvatarImage src={user.image ?? ''} alt={`${user.name} avatar`} />
            <AvatarFallback>{user.name?.charAt(0) ?? 'X'}</AvatarFallback>
          </Avatar>
        </div>
        <div>
          <p className="font-semibold">{user.name}</p>
          <p>{user.name} is a member of the team.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
        <CommandInput placeholder="Search for users..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {usersRequestedToJoinState.length > 0 && (
            <CommandGroup heading="Users Requested to Join">
              {usersRequestedToJoinState.map((user) => (
                <CommandItem key={user.id} onSelect={() => openInviteConfirmation(user)}>
                  {commandItemProfile(user)}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {usersWithoutATeamState.length > 0 && (
            <CommandGroup heading="Users Without a Team">
              {usersWithoutATeamState.map((user) => (
                <CommandItem key={user.id} onSelect={() => openInviteConfirmation(user)}>
                  {commandItemProfile(user)}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {usersWithATeamState.length > 0 && (
            <CommandGroup heading="Users With a Team">
              {usersWithATeamState.map((user) => (
                <CommandItem key={user.id} onSelect={() => openInviteConfirmation(user)}>
                  {commandItemProfile(user)}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {usersAlreadyInvitedState.length > 0 && (
            <CommandGroup heading="Users Already Invited">
              {usersAlreadyInvitedState.map((user) => (
                <CommandItem key={user.id} disabled>
                  {commandItemProfile(user)}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>

      {children && (
        <div onClick={() => setIsOpen(true)} className="cursor-pointer">
          {children}
        </div>
      )}

      {dialog}
    </>
  );
}
