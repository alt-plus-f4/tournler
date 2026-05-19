export default function Loading() {
	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/80'>
			<div className='flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-black/80 px-6 py-5 text-white shadow-2xl backdrop-blur'>
				<div className='h-10 w-10 animate-spin rounded-full border-4 border-t-transparent border-white/70' />
				<span className='text-sm text-white/70'>Loading tournament...</span>
			</div>
		</div>
	);
}
