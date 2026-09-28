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
		} catch {
			// sessionStorage may be unavailable (e.g. private browsing) — safe to ignore
		}
	};

	return (
		<div className={cn('', className)}>
			<Link prefetch={false} href='/sign-in' onClick={savePrevPath} className={cn(buttonVariants({ variant: 'default' }), 'px-3 sm:px-6 sm:py-3')}>
				Sign In
			</Link>
		</div>
	);
};

export default LoginButtons;
