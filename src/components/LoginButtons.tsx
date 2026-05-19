'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { buttonVariants } from './ui/button';

interface LoginButtonsProps {
	className?: string;
}

const LoginButtons = ({ className = '' }: LoginButtonsProps) => {
	const savePrevPath = () => {
		try {
			sessionStorage.setItem('preAuthPath', window.location.pathname + window.location.search);
		} catch (e) {}
	};

	return (
		<div className={cn('', className)}>
			<Link prefetch={false} href='/sign-in' onClick={savePrevPath} className={cn(buttonVariants({ variant: 'default' }), 'px-2 mr-2 sm:py-3 sm:px-6 sm:mr-2')}>
				Sign In
			</Link>
			<Link prefetch={false} href='/sign-up' onClick={savePrevPath} className={cn(buttonVariants({ variant: 'outline' }), 'px-2 sm:py-3 sm:px-6')}>
				Sign Up
			</Link>
		</div>
	);
};

export default LoginButtons;
