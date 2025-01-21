import { Card, CardHeader } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

export function FallbackCards() {
	return Array(4)
		.fill(0)
		.map((_, index) => (
			<Card
				key={index}
				className='w-full transition hover:-translate-y-1 hover:shadow-lg '
			>
				<CardHeader className='relative p-0 w-full aspect-[21/9] space-y-0 overflow-hidden rounded-t-xl'>
					<Skeleton className='w-full h-full' />
				</CardHeader>
				<div className='p-3'>
					<Skeleton className='w-1/2 h-6' />
				</div>
			</Card>
		));
}
