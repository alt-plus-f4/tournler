'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const loadPalette = () => import('./SiteSearchPalette');
// cmdk + Radix Dialog load on first hover/focus/click of the button, not with every page.
const SiteSearchPalette = dynamic(loadPalette, { ssr: false });

/** The header's search button; opens the team search palette. */
export function SiteSearch({ className }: { className?: string }) {
	const [open, setOpen] = useState(false);
	const [mounted, setMounted] = useState(false);

	return (
		<>
			<button
				type='button'
				aria-label='Search'
				aria-haspopup='dialog'
				onPointerEnter={loadPalette}
				onFocus={loadPalette}
				onClick={() => {
					setMounted(true);
					setOpen(true);
				}}
				className={cn(
					'flex h-9 w-9 shrink-0 items-center justify-center text-neutral-300 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
					className,
				)}
			>
				<Search aria-hidden className='h-[15px] w-[15px]' />
			</button>
			{mounted && <SiteSearchPalette open={open} onOpenChange={setOpen} />}
		</>
	);
}
