'use client';

import { FC, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signIn } from 'next-auth/react';
import { useToast } from '@/lib/hooks/use-toast';
import { FaDiscord } from 'react-icons/fa6';

type UserAuthFormProps = React.HTMLAttributes<HTMLDivElement>;

const UserAuthForm: FC<UserAuthFormProps> = ({ className, ...props }) => {
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [email, setEmail] = useState<string>('');
	const { toast } = useToast();

	const loginWithDiscord = async () => {
		setIsLoading(true);
		try {
			await signIn('discord', { callbackUrl: '/' });
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

	const loginWithEmail = async () => {
		setIsLoading(true);
		try {
			await signIn('email', { email }, { callbackUrl: '/' });
		} catch {
			toast({
				title: 'There was a problem.',
				description: 'There was an error logging in with email',
				variant: 'destructive',
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className={cn('flex justify-center flex-col', className)} {...props}>
			<Button onClick={loginWithDiscord} isLoading={isLoading} size='sm' className='w-full flex-row mb-3 bg-[#5865F2] hover:bg-[#4752C4] text-white gap-2'>
				{!isLoading && <FaDiscord className='h-4 w-4' />}
				{isLoading ? 'Signing in...' : 'Sign in with Discord'}
			</Button>
			<div className='relative mb-3'>
				<div className='absolute inset-0 flex items-center'>
					<div className='w-full border-t border-gray-300'></div>
				</div>
				<div className='relative flex justify-center text-sm'>
					<span className='px-2 bg-white text-gray-500'>Or continue with email</span>
				</div>
			</div>
			<Input type='email' value={email} onChange={(e) => setEmail(e.target.value)} placeholder='Enter your email' className='mb-4' />
			<Button onClick={loginWithEmail} isLoading={isLoading} size='sm' variant={'outline'} className='w-full flex-row'>
				{isLoading ? 'Signing in...' : 'Sign in with Email'}
			</Button>
		</div>
	);
};

export default UserAuthForm;
