'use client';

import { FC, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { signIn } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useToast } from '@/lib/hooks/use-toast';
import { FaDiscord } from 'react-icons/fa6';

type UserAuthFormProps = React.HTMLAttributes<HTMLDivElement>;

const UserAuthForm: FC<UserAuthFormProps> = ({ className, ...props }) => {
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
				{!isLoading && <FaDiscord className='h-4 w-4' />}
				{isLoading ? 'Signing in...' : 'Sign in with Discord'}
			</Button>
			<div className='mt-2 text-sm text-zinc-500 text-center'>Signing in creates or links your account via Discord.</div>
		</div>
	);
};

export default UserAuthForm;
