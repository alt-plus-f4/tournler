'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BurgerMenuProps {
	className?: string;
}

const loadPanel = () => import('./BurgerMenuPanel');
// The Sheet (Radix Dialog, focus trap, scroll lock) is in every page's navbar but only needed once the
// menu is opened, so it's fetched on first hover/focus/tap of the button instead of shipping up front.
const BurgerMenuPanel = dynamic(loadPanel, { ssr: false });

export const BurgerMenu: React.FC<BurgerMenuProps> = ({ className }) => {
	const [isOpen, setIsOpen] = useState(false);
	// Stays true after the first open so the panel stays mounted and can animate closed.
	const [mounted, setMounted] = useState(false);
	const triggerRef = useRef<HTMLButtonElement>(null);

	return (
		<>
			<button
				ref={triggerRef}
				type='button'
				className={cn('-ml-2 flex h-11 w-11 items-center justify-center rounded-md text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
				aria-label='Open menu'
				aria-haspopup='dialog'
				aria-expanded={isOpen}
				aria-controls={mounted ? 'burger-menu' : undefined}
				onPointerEnter={loadPanel}
				onFocus={loadPanel}
				onClick={() => {
					setMounted(true);
					setIsOpen(true);
				}}
			>
				<Menu className='h-6 w-6' aria-hidden />
			</button>
			{mounted && <BurgerMenuPanel open={isOpen} onOpenChange={setIsOpen} triggerRef={triggerRef} />}
		</>
	);
};
