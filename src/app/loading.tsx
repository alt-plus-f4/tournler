'use client';

import { usePathname } from 'next/navigation';

export default function Loading() {
	const pathname = usePathname();

	// When navigating to lightweight modal routes, avoid showing the heavy page spinner.
	if (pathname === '/sign-in' || pathname === '/sign-up') {
		return (
			<div className='fixed inset-0 z-50 flex items-center justify-center'>
				<div className='flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-black/80 px-6 py-5 text-white shadow-2xl backdrop-blur'>
					<div className='h-10 w-10 animate-spin rounded-full border-4 border-t-transparent border-white/70' />
					<span className='text-sm text-white/70'>Loading...</span>
				</div>
			</div>
		);
	}

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/80'>
			<div className='flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-black/80 px-6 py-5 text-white shadow-2xl backdrop-blur'>
				<div className='h-10 w-10 animate-spin rounded-full border-4 border-t-transparent border-white/70' />
				<span className='text-sm text-white/70'>Loading...</span>
			</div>
		</div>
	);
}
