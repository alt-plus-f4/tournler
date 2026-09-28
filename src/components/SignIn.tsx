import Link from 'next/link';
import { Icons } from './Icons';

import UserAuthForm from './UserAuthForm';

interface SignInProps {
	/** Heading element for the title: 'h1' on the standalone /sign-in page, 'h2' inside a modal over another page. */
	headingAs?: 'h1' | 'h2';
}

const SignIn = ({ headingAs: Heading = 'h1' }: SignInProps) => {
	return (
		<div className='mx-auto flex w-full max-w-sm flex-col items-center gap-8 text-center'>
			<span className='flex h-16 w-16 items-center justify-center rounded-full border border-border bg-white/5'>
				<Icons.logo size={36} aria-hidden />
			</span>

			<div className='flex flex-col items-center gap-2'>
				<span className='text-xs font-bold uppercase tracking-[0.2em] text-neutral-400'>Access</span>
				<Heading className='text-3xl font-black uppercase tracking-wide text-white'>Sign in to Tournler</Heading>
				<p className='max-w-xs text-sm text-neutral-400'>You&apos;ll link your Steam account after signing in. It&apos;s required to join match servers.</p>
			</div>

			<UserAuthForm />

			<p className='max-w-xs text-xs text-neutral-500'>
				By continuing, you agree to our{' '}
				<Link href='/terms' className='text-neutral-300 underline underline-offset-4 hover:text-white'>
					Terms of Service
				</Link>{' '}
				and{' '}
				<Link href='/privacy' className='text-neutral-300 underline underline-offset-4 hover:text-white'>
					Privacy Policy
				</Link>
				.
			</p>
		</div>
	);
};

export default SignIn;
