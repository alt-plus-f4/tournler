'use client';

import { FC, FormEvent, useState } from 'react';
import { Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { signIn } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useToast } from '@/lib/hooks/use-toast';
import { DiscordIcon } from '@/components/Icons';

type UserAuthFormProps = React.HTMLAttributes<HTMLDivElement>;

// Loose on purpose: the email provider and the inbox are the real check.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function callbackUrlFor(pathname: string | null) {
	return (typeof window !== 'undefined' && sessionStorage.getItem('preAuthPath')) || pathname || '/';
}

/** Discord first, then an email magic link. The email path stays on the page and shows a "check your inbox" state. */
const UserAuthForm: FC<UserAuthFormProps> = ({ className, ...props }) => {
	const [pending, setPending] = useState<'discord' | 'email' | null>(null);
	const [email, setEmail] = useState('');
	const [emailError, setEmailError] = useState<string | null>(null);
	const [sentTo, setSentTo] = useState<string | null>(null);
	const { toast } = useToast();
	const pathname = usePathname();

	const loginWithDiscord = async () => {
		setPending('discord');
		try {
			await signIn('discord', { callbackUrl: callbackUrlFor(pathname) });
		} catch {
			toast({ title: 'Couldn’t reach Discord', description: 'Please try again in a moment.', variant: 'destructive' });
			setPending(null);
		}
	};

	const loginWithEmail = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const address = email.trim();
		if (!EMAIL_PATTERN.test(address)) {
			setEmailError('Enter a valid email address.');
			return;
		}
		setEmailError(null);
		setPending('email');
		try {
			const result = await signIn('email', { email: address, callbackUrl: callbackUrlFor(pathname), redirect: false });
			if (result?.error) throw new Error(result.error);
			setSentTo(address);
		} catch {
			toast({ title: 'We couldn’t send the link', description: 'Check the address and try again.', variant: 'destructive' });
		} finally {
			setPending(null);
		}
	};

	if (sentTo) {
		return (
			<div className={cn('flex w-full flex-col items-center gap-3 rounded-lg border border-border bg-white/[0.03] px-5 py-6 text-center', className)} role='status' {...props}>
				<span className='flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white/5'>
					<Mail aria-hidden className='h-5 w-5 text-white' />
				</span>
				<p className='text-base font-bold text-white'>Check your inbox</p>
				<p className='text-sm text-neutral-400'>
					We sent a sign-in link to <span className='font-medium text-white'>{sentTo}</span>. It works once and expires in 24 hours.
				</p>
				<button type='button' onClick={() => setSentTo(null)} className='mt-1 text-sm text-neutral-300 underline underline-offset-4 hover:text-white'>
					Use a different email
				</button>
			</div>
		);
	}

	return (
		<div className={cn('flex w-full flex-col', className)} {...props}>
			<Button
				onClick={loginWithDiscord}
				isLoading={pending === 'discord'}
				disabled={pending !== null}
				size='lg'
				className='h-12 w-full flex-row gap-2.5 bg-[#5865F2] text-[15px] font-semibold text-white hover:bg-[#4752C4]'
			>
				{pending !== 'discord' && <DiscordIcon aria-hidden className='h-5 w-5' />}
				{pending === 'discord' ? 'Redirecting to Discord…' : 'Continue with Discord'}
			</Button>

			<div className='my-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-neutral-500' aria-hidden>
				<span className='h-px flex-1 bg-border' />
				or
				<span className='h-px flex-1 bg-border' />
			</div>

			<form onSubmit={loginWithEmail} noValidate className='flex flex-col gap-2'>
				<label htmlFor='sign-in-email' className='text-sm font-medium text-neutral-200'>
					Email
				</label>
				<input
					id='sign-in-email'
					type='email'
					inputMode='email'
					autoComplete='email'
					placeholder='you@school.bg'
					value={email}
					onChange={(e) => {
						setEmail(e.target.value);
						if (emailError) setEmailError(null);
					}}
					aria-invalid={emailError ? true : undefined}
					aria-describedby={emailError ? 'sign-in-email-error' : undefined}
					className={cn(
						'h-12 w-full rounded-md border bg-black/40 px-3.5 text-[15px] text-white placeholder:text-neutral-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
						emailError ? 'border-red-500/70' : 'border-border hover:border-neutral-600',
					)}
				/>
				{emailError && (
					<p id='sign-in-email-error' className='text-sm text-red-400'>
						{emailError}
					</p>
				)}
				<Button type='submit' variant='outline' size='lg' isLoading={pending === 'email'} disabled={pending !== null} className='mt-1 h-12 w-full gap-2 text-[15px] font-semibold'>
					{pending !== 'email' && <Mail aria-hidden className='h-4 w-4' />}
					{pending === 'email' ? 'Sending link…' : 'Email me a sign-in link'}
				</Button>
			</form>

			<p className='mt-4 text-center text-xs text-neutral-500'>New here? Either option creates your account.</p>
		</div>
	);
};

export default UserAuthForm;
