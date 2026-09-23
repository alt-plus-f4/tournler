import Link from 'next/link';
import { Icons } from './Icons';

import UserAuthForm from './UserAuthForm';

interface SignInProps {
	/** Heading element for the title: 'h1' on the standalone /sign-in page, 'h2' inside a modal over another page. */
	headingAs?: 'h1' | 'h2';
}

const SignIn = ({ headingAs: Heading = 'h1' }: SignInProps) => {
	return (
		<div className='container mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]'>
			<div className='flex flex-col space-y-3 text-center'>
				<Icons.logo aria-hidden className='mx-auto h-6 w-6' />
				<Heading className='text-2xl font-semibold tracking-tight'>Sign in to Tournler</Heading>
				<p className='mx-auto max-w-xs text-sm text-muted-foreground'>
					You&apos;ll link your Steam account after signing in. It&apos;s required to join match servers.
				</p>
				<p className='mx-auto max-w-xs text-xs text-muted-foreground'>
					By continuing, you agree to our{' '}
					<Link href='/terms' className='text-white underline underline-offset-4 hover:text-neutral-300'>
						Terms of Service
					</Link>{' '}
					and{' '}
					<Link href='/privacy' className='text-white underline underline-offset-4 hover:text-neutral-300'>
						Privacy Policy
					</Link>
					.
				</p>

				<UserAuthForm />

				<p className='px-8 text-center text-sm text-muted-foreground'>
					New to Tournler?{' '}
					<Link href='/sign-up' className='text-sm text-white underline underline-offset-4 hover:text-neutral-300'>
						Create an account
					</Link>
				</p>
			</div>
		</div>
	);
};

export default SignIn;
