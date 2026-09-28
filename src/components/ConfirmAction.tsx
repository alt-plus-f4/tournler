'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ConfirmActionProps {
	trigger: ReactNode;
	title: string;
	description?: ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	confirmVariant?: ButtonProps['variant'];
	onConfirm: () => void | Promise<void>;
}

/**
 * A confirm-before-you-commit dialog for actions that are awkward or impossible to undo (leaving a
 * team or match, removing someone, deleting something). The trigger opens it; the confirm button
 * runs onConfirm and, once it resolves, closes the dialog. Rendered plain until mount —
 * DialogTrigger's asChild (Radix Slot) composition mismatches SSR vs. client for a trigger that's
 * present in the initial server HTML (the same class of issue worked around for TeamMemberAvatar's
 * HoverCard and AdminSidebar's Collapsible).
 */
export function ConfirmAction({ trigger, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', confirmVariant = 'destructive', onConfirm }: ConfirmActionProps) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [isMounted, setIsMounted] = useState(false);
	useEffect(() => setIsMounted(true), []);

	if (!isMounted) return <>{trigger}</>;

	const handleConfirm = async () => {
		setPending(true);
		try {
			await onConfirm();
			setOpen(false);
		} finally {
			setPending(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent className='max-w-md rounded-md'>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description && <DialogDescription className='leading-relaxed'>{description}</DialogDescription>}
				</DialogHeader>
				<DialogFooter className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-0'>
					<DialogClose asChild>
						<Button variant='outline' disabled={pending}>
							{cancelLabel}
						</Button>
					</DialogClose>
					<Button variant={confirmVariant} onClick={handleConfirm} isLoading={pending}>
						{confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
