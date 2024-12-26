'use client';

import { useState } from 'react';
import { useToast } from '@/lib/hooks/use-toast';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@radix-ui/react-dialog';
import { Button } from './ui/button';
import { DialogHeader, DialogFooter } from './ui/dialog';
import { Toaster } from './ui/toaster';
import { User } from '@prisma/client';

interface InviteButtonProps {
  user: User;
  teamId: number;
  completeSuccessfulInviteConfirmation: () => void;
}

export function InviteConfirmationDialog({
  user,
  teamId,
  completeSuccessfulInviteConfirmation,
}: InviteButtonProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(true);

  async function inviteUser() {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE}/api/v1/users/${user.id}/cs2-team-invites`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: teamId }),
      },
    );

    setIsOpen(false);

    if (response.ok) {
      toast({
        variant: 'default',
        title: "Invitation sent",
      });
      completeSuccessfulInviteConfirmation();
      return;
    }

    const json = await response.json();
    toast({
      variant: 'destructive',
      title: json.message || "Error",
      description: "Couldn't send the invitation",
    });
  }

  return (
    <>
      <Toaster />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Invitation confirmation</DialogTitle>
            <DialogDescription>
                You are inviting {user.name} to join your team.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose>Cancel</DialogClose>
            <Button onClick={() => inviteUser()}>Invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}