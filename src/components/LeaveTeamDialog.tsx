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
import React, { ReactNode, useEffect, useState } from 'react';
import { Button } from './ui/button';
import { removeMember } from '@/lib/helpers/remove-member';
import { useRouter } from 'next/navigation';

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
	const router = useRouter();
	const [open, setOpen] = useState(false);
	// DialogTrigger's asChild composition (Radix Slot) mismatches between SSR
	// and the client for this trigger — the same class of issue already
	// worked around for TeamMemberAvatar's HoverCard and AdminSidebar's
	// Collapsible. Render the plain trigger for the first paint, swap in the
	// interactive Dialog-wrapped version post-mount.
	const [isMounted, setIsMounted] = useState(false);
	useEffect(() => setIsMounted(true), []);

	if (!isMounted) {
		return <>{children}</>;
	}

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
								router.push('/teams');
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
