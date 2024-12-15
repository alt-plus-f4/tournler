'use client';

import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogClose, DialogDescription } from '@radix-ui/react-dialog';
import React, { ReactNode, useState } from 'react';
import { Button } from './ui/button';
import { DialogHeader, DialogFooter } from './ui/dialog';
import { Toaster } from './ui/toaster';

interface LeaveTeamDialogProps {
  team: ApiClient.Cs2TeamDto;
  user: ApiClient.UserDto;
  children: ReactNode;
}

export function LeaveTeamDialog({
  team,
  user,
  children,
}: LeaveTeamDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Toaster />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Team?</DialogTitle>
            <DialogClose />
          </DialogHeader>
          <DialogDescription>Do you really want to do that?</DialogDescription>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button
              onClick={async () => {
                const response = await removeMemberRequest(team, user);
                if (response?.error) {
                  toast({
                    variant: 'destructive',
                    title: response.error,
                    description: "Couldn't leave the team",
                  });
                } else {
                  toast({
                    variant: 'default',
                    title: "You've left the team",
                  });
                  setOpen(false);
                }
              }}
            >
              Leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}