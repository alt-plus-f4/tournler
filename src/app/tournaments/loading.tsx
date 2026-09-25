import { TournamentsSkeleton } from '@/components/public/TournamentsBrowser';
import { HubSubnavSkeleton } from '@/components/shell/HubSubnav';

export default function Loading() {
	return (
		<>
			<HubSubnavSkeleton active='tournaments' />
			<div className='container mx-auto max-w-[1400px] px-4 py-8 lg:px-8'>
				{/* Real heading, not a skeleton: it's always "Tournaments" — only the list below is loading. */}
				<h1 className='mb-6 text-3xl font-black uppercase tracking-wide text-white sm:text-4xl'>Tournaments</h1>
				{/* Upcoming & live / Completed toggle placeholder (bordered p-1 group of two small buttons). */}
				<div className='mb-8 h-[46px] w-64 rounded-md border border-border' aria-hidden />
				<TournamentsSkeleton />
			</div>
		</>
	);
}
