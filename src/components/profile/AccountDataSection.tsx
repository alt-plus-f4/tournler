'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Download, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/lib/hooks/use-toast';

/** Owner-only: download a copy of your data, or delete the account (GDPR access and erasure). */
export function AccountDataSection() {
	const [open, setOpen] = useState(false);
	const [confirmText, setConfirmText] = useState('');
	const [isDeleting, setIsDeleting] = useState(false);
	const { toast } = useToast();

	const deleteAccount = async () => {
		setIsDeleting(true);
		try {
			const response = await fetch('/api/user', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: 'DELETE' }) });
			const payload = await response.json().catch(() => null);
			if (!response.ok) throw new Error(payload?.error || 'Could not delete the account');
			await signOut({ callbackUrl: '/' });
		} catch (error) {
			toast({ variant: 'destructive', title: 'Account not deleted', description: error instanceof Error ? error.message : undefined });
			setIsDeleting(false);
		}
	};

	return (
		<section aria-labelledby='account-data-heading' className='mt-10 rounded-md border border-border bg-neutral-950/80 p-5'>
			<h2 id='account-data-heading' className='text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground'>
				Your data
			</h2>
			<div className='mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
				<p className='max-w-prose text-sm text-neutral-300'>
					Download everything Tournler stores about you, or delete your account. See the{' '}
					<Link href='/privacy' className='text-white underline underline-offset-4'>
						Privacy Policy
					</Link>{' '}
					for what each includes.
				</p>
				<div className='flex shrink-0 gap-2'>
					<Button asChild variant='outline' className='gap-2'>
						<a href='/api/user/export' download>
							<Download className='h-4 w-4' aria-hidden /> Download my data
						</a>
					</Button>
					<Button variant='outline' onClick={() => setOpen(true)} className='gap-2 border-red-500/30 text-red-300 hover:border-red-400 hover:bg-red-500/10 hover:text-red-200'>
						<Trash2 className='h-4 w-4' aria-hidden /> Delete account
					</Button>
				</div>
			</div>

			<Dialog
				open={open}
				onOpenChange={(next) => {
					if (isDeleting) return;
					setOpen(next);
					setConfirmText('');
				}}
			>
				<DialogContent className='max-w-md border-border bg-black text-white'>
					<DialogTitle>Delete your account?</DialogTitle>
					<DialogDescription className='space-y-2 text-sm text-neutral-300'>
						<span className='block'>This permanently removes your profile, linked Steam and Discord accounts, team invites, badges and personal match stats. It can&apos;t be undone.</span>
						<span className='block'>If you captain a team, captaincy passes to a teammate. Past match results stay, and published demos keep your in-game name.</span>
					</DialogDescription>
					<form
						className='mt-2 space-y-3'
						onSubmit={(e) => {
							e.preventDefault();
							if (confirmText === 'DELETE') deleteAccount();
						}}
					>
						<label htmlFor='confirm-delete' className='block text-sm text-muted-foreground'>
							Type <span className='font-mono text-white'>DELETE</span> to confirm
						</label>
						<Input id='confirm-delete' value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete='off' disabled={isDeleting} className='font-mono' />
						<div className='flex justify-end gap-2 pt-1'>
							<Button type='button' variant='ghost' onClick={() => setOpen(false)} disabled={isDeleting}>
								Cancel
							</Button>
							<Button type='submit' variant='destructive' disabled={confirmText !== 'DELETE' || isDeleting} className='gap-2'>
								{isDeleting && <Loader2 className='h-4 w-4 animate-spin' aria-hidden />} Delete account
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</section>
	);
}
