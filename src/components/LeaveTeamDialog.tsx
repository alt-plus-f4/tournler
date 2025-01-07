'use client';

import { useToast } from '@/lib/hooks/use-toast';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogFooter,
} from '@/components/ui/dialog';
import React, { ReactNode, useState } from 'react';
import { Button } from './ui/button';
import { removeMember } from '@/lib/helpers/remove-member';

interface LeaveTeamDialogProps {
  teamId: number;
  userId: string;
  children: ReactNode;
}

export function LeaveTeamDialog({
  teamId,
  userId,
  children,
}: LeaveTeamDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className='w-[300px]'>
        <DialogHeader className='flex flex-col items-center gap-2'>
          <DialogTitle>Leave Team?</DialogTitle>
          <DialogDescription>
            Do you really want to do that?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className='flex justify-center gap-2 pt-2'>
          <DialogClose asChild>
            <Button variant='secondary'>Cancel</Button>
          </DialogClose>
          <Button
            onClick={async () => {
              const response = await removeMember(teamId, userId);
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
  );
}