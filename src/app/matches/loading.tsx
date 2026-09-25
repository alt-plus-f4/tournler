import { MatchesSkeleton } from './page';
import { HubSubnavSkeleton } from '@/components/shell/HubSubnav';

export default function Loading() {
	return (
		<>
			<HubSubnavSkeleton active='matches' />
			<div className='mx-auto my-8 w-full px-4 sm:w-[78%] sm:px-0'>
				<div className='mb-6 h-9 w-40 animate-pulse rounded-md bg-neutral-900' aria-hidden />
				<MatchesSkeleton />
			</div>
		</>
	);
}
