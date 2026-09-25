import type { ReactNode } from 'react';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Every step's title + description, set once so the six steps read as one sequence, not six screens. */
export function StepHeading({ title, description, center = true }: { title: string; description?: ReactNode; center?: boolean }) {
	return (
		<div className={cn('mb-6', center && 'text-center')}>
			<h2 className='text-2xl font-black uppercase tracking-wide text-white sm:text-3xl'>{title}</h2>
			{description && <p className={cn('mt-2 text-sm text-neutral-400', center ? 'mx-auto max-w-sm' : 'max-w-sm')}>{description}</p>}
		</div>
	);
}

/** Every step's Previous/Continue row, pinned to the same position so it never jumps step to step. */
export function StepFooter({
	onPrevious,
	onNext,
	nextLabel = 'Continue',
	nextLoadingLabel = 'Saving…',
	previousLabel = 'Previous',
	loading = false,
	nextDisabled = false,
	nextType = 'button',
}: {
	onPrevious?: () => void;
	onNext?: () => void;
	nextLabel?: string;
	nextLoadingLabel?: string;
	previousLabel?: string;
	loading?: boolean;
	nextDisabled?: boolean;
	nextType?: 'button' | 'submit';
}) {
	return (
		<DialogFooter className='mt-8 flex-row items-center justify-between gap-3 border-t border-border pt-6 sm:justify-between'>
			{onPrevious ? (
				<Button type='button' variant='ghost' onClick={onPrevious} disabled={loading} className='text-neutral-400 hover:bg-white/5 hover:text-white'>
					{previousLabel}
				</Button>
			) : (
				<span aria-hidden />
			)}
			<Button type={nextType} onClick={nextType === 'button' ? onNext : undefined} disabled={nextDisabled || loading} isLoading={loading} className='min-w-[140px]'>
				{loading ? nextLoadingLabel : nextLabel}
			</Button>
		</DialogFooter>
	);
}
