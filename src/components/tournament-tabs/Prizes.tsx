import { formatMoney } from '@/lib/helpers/format-money';

/**
 * The prize pool as the organizer entered it. There is no per-placement split in the data, so
 * none is invented here.
 */
export default function Prizes({ prizePool }: { prizePool: number | null }) {
	const hasPrize = prizePool !== null && prizePool !== undefined;

	return (
		<section aria-labelledby='prizes-heading' className='p-4'>
			<h2 id='prizes-heading' className='mb-2 ml-1 mt-6 text-2xl font-bold'>
				Prize Pool
			</h2>
			<div className='mb-8 mt-2 rounded-md border border-border p-4'>
				{hasPrize ? (
					<>
						<div className='flex items-baseline justify-between gap-4 p-2'>
							<p className='text-sm font-bold uppercase tracking-widest text-muted-foreground'>Total</p>
							<p className='font-mono text-2xl font-bold tabular-nums text-white sm:text-3xl'>{formatMoney(prizePool)}</p>
						</div>
						<p className='border-t border-border p-2 pt-3 text-sm text-muted-foreground'>The organizer hasn&apos;t published how the pool is split between placements.</p>
					</>
				) : (
					<p className='p-2 text-sm text-muted-foreground'>No prize pool announced.</p>
				)}
			</div>
		</section>
	);
}
