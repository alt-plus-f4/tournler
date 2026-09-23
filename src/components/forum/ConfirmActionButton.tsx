'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/lib/hooks/use-toast';

interface ConfirmActionButtonProps {
	endpoint: string;
	method?: 'DELETE' | 'PATCH';
	body?: Record<string, unknown>;
	title: string;
	description: string;
	confirmLabel: string;
	successMessage: string;
	/** Where to go after success; omitted means refresh the current page. */
	redirectTo?: string;
	children: ReactNode;
	triggerProps?: ButtonProps;
}

/**
 * A button that opens a confirmation dialog before sending a destructive request. The dialog is
 * controlled (no DialogTrigger) so the first paint is a plain button on server and client alike.
 */
export function ConfirmActionButton({ endpoint, method = 'DELETE', body, title, description, confirmLabel, successMessage, redirectTo, children, triggerProps }: ConfirmActionButtonProps) {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();
	const { toast } = useToast();

	const confirm = async () => {
		setPending(true);
		setError(null);
		try {
			const response = await fetch(endpoint, {
				method,
				headers: body ? { 'Content-Type': 'application/json' } : undefined,
				body: body ? JSON.stringify(body) : undefined,
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(data.error || 'Something went wrong. Try again.');
			setOpen(false);
			toast({ title: successMessage });
			if (redirectTo) router.push(redirectTo);
			router.refresh();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
		} finally {
			setPending(false);
		}
	};

	return (
		<>
			<Button type='button' {...triggerProps} onClick={() => setOpen(true)}>
				{children}
			</Button>
			<Dialog
				open={open}
				onOpenChange={(next) => {
					if (!pending) setOpen(next);
					if (!next) setError(null);
				}}
			>
				<DialogContent className='max-w-sm'>
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
						<DialogDescription>{description}</DialogDescription>
					</DialogHeader>
					{error && (
						<p role='alert' className='text-sm text-signal-live'>
							{error}
						</p>
					)}
					<DialogFooter className='gap-2 sm:gap-0'>
						<Button type='button' variant='outline' onClick={() => setOpen(false)} disabled={pending}>
							Cancel
						</Button>
						<Button type='button' variant='destructive' onClick={confirm} isLoading={pending}>
							{confirmLabel}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
