import { TournamentsSkeleton } from '@/components/public/TournamentsBrowser';

export default function Loading() {
	return (
		<div className='container mx-auto max-w-[1400px] px-4 py-8 lg:px-8'>
			<div className='mb-6 h-10 w-56 animate-pulse rounded-md bg-neutral-900' aria-hidden />
			{/* Filter toggle placeholder (bordered p-1 group of two small buttons). */}
			<div className='mb-8 h-[46px] w-64 rounded-md border border-border' aria-hidden />
			<TournamentsSkeleton />
		</div>
	);
}
