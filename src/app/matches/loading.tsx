import { MatchesSkeleton } from './page';
import { HubSubnavSkeleton } from '@/components/shell/HubSubnav';

export default function Loading() {
	return (
		<>
			<HubSubnavSkeleton active='matches' />
			<div className='mx-auto my-8 w-full px-4 sm:w-[78%] sm:px-0'>
				<div className='mb-8' aria-hidden>
					<div className='mb-2 h-3 w-28 animate-pulse rounded-sm bg-neutral-900' />
					<div className='h-9 w-48 animate-pulse rounded-md bg-neutral-900 md:h-12' />
				</div>
				<MatchesSkeleton />
			</div>
		</>
	);
}
