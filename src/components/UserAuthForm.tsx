'use client';

import { FC, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { signIn } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useToast } from '@/lib/hooks/use-toast';
import { FaDiscord } from 'react-icons/fa6';

type UserAuthFormProps = React.HTMLAttributes<HTMLDivElement> & {
	mode?: 'sign-in' | 'sign-up';
};

const UserAuthForm: FC<UserAuthFormProps> = ({ className, mode = 'sign-in', ...props }) => {
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const { toast } = useToast();

	const pathname = usePathname();

	const loginWithDiscord = async () => {
		setIsLoading(true);
		try {
			const callbackUrl = (typeof window !== 'undefined' && sessionStorage.getItem('preAuthPath')) || pathname || '/';
			await signIn('discord', { callbackUrl });
		} catch {
			toast({
				title: 'There was a problem.',
				description: 'There was an error logging in with Discord',
				variant: 'destructive',
			});
		} finally {
			setIsLoading(false);
		}
	};

	// Email login removed — only Discord OAuth is supported now.

	return (
		<div className={cn('flex justify-center flex-col', className)} {...props}>
			<Button onClick={loginWithDiscord} isLoading={isLoading} size='sm' className='w-full flex-row mb-3 bg-[#5865F2] hover:bg-[#4752C4] text-white gap-2'>
				{!isLoading && <FaDiscord aria-hidden className='h-4 w-4' />}
				{isLoading ? 'Redirecting to Discord…' : mode === 'sign-up' ? 'Sign up with Discord' : 'Sign in with Discord'}
			</Button>
			<p className='text-center text-xs text-muted-foreground'>
				{mode === 'sign-up' ? 'Already signed in with Discord before? This takes you to the same account.' : 'First time? Signing in with Discord creates your account.'}
			</p>
		</div>
	);
};

export default UserAuthForm;
