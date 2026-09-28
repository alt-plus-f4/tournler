'use client';

import { FC, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { signIn } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useToast } from '@/lib/hooks/use-toast';
import { DiscordIcon } from '@/components/Icons';

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

	return (
		<div className={cn('flex w-full flex-col justify-center', className)} {...props}>
			<Button onClick={loginWithDiscord} isLoading={isLoading} size='lg' className='w-full flex-row gap-2 bg-[#5865F2] text-white hover:bg-[#4752C4]'>
				{!isLoading && <DiscordIcon aria-hidden className='h-4 w-4' />}
				{isLoading ? 'Redirecting to Discord…' : 'Continue with Discord'}
			</Button>
			<p className='mt-3 text-center text-xs text-neutral-500'>First time here? Signing in with Discord creates your account.</p>
		</div>
	);
};

export default UserAuthForm;
