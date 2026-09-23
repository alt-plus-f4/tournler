import Link from 'next/link';
import { Icons } from './Icons';

import UserAuthForm from './UserAuthForm';

interface SignUpProps {
	/** Heading element for the title: 'h1' on the standalone /sign-up page, 'h2' inside a modal over another page. */
	headingAs?: 'h1' | 'h2';
}

const SignUp = ({ headingAs: Heading = 'h1' }: SignUpProps) => {
	return (
		<div className='container mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]'>
			<div className='flex flex-col space-y-3 text-center'>
				<Icons.logo aria-hidden className='mx-auto h-6 w-6' />
				<Heading className='text-2xl font-semibold tracking-tight'>Create your Tournler account</Heading>
				<p className='mx-auto max-w-xs text-sm text-muted-foreground'>
					Sign up with Discord, then link your Steam account. Steam is required to join match servers.
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

				<UserAuthForm mode='sign-up' />

				<p className='px-8 text-center text-sm text-muted-foreground'>
					Already have an account?{' '}
					<Link href='/sign-in' className='text-sm text-white underline underline-offset-4 hover:text-neutral-300'>
						Sign in
					</Link>
				</p>
			</div>
		</div>
	);
};

export default SignUp;
