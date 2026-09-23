export default function Loading() {
	return (
		<div role='status' aria-label='Loading tournament' className='container mx-auto max-w-[1400px] px-4 py-6 lg:px-8'>
			<div className='mb-4 h-9 w-32 animate-pulse rounded-md bg-neutral-900' />
			<div className='overflow-hidden rounded-md border border-border'>
				<div className='h-36 animate-pulse bg-neutral-900 sm:h-56 lg:h-64' />
				<div className='space-y-3 bg-black p-4 sm:p-6'>
					<div className='h-9 w-2/3 max-w-lg animate-pulse rounded-md bg-neutral-900' />
					<div className='h-4 w-40 animate-pulse rounded-md bg-neutral-900' />
				</div>
			</div>
			<div className='mt-6 h-12 animate-pulse rounded-md bg-neutral-950' />
		</div>
	);
}
