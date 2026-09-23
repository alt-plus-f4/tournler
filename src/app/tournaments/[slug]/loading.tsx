export default function Loading() {
	return (
		<div role='status' aria-label='Loading tournament' className='mx-auto mt-8 mb-12 w-[calc(100%-2rem)] sm:w-5/6'>
			<div className='relative flex min-h-[300px] flex-col justify-end rounded-t-xl bg-neutral-900 p-4 motion-safe:animate-pulse sm:p-10'>
				<div className='h-9 w-2/3 max-w-lg rounded-md bg-neutral-800' />
				<div className='mt-2 h-4 w-40 rounded-md bg-neutral-800' />
			</div>
			<div className='mt-2 h-12 rounded-md bg-neutral-950 motion-safe:animate-pulse md:mx-4' />
		</div>
	);
}
