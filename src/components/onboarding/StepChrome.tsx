import type { ReactNode } from 'react';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Every step's title + description, set once so the six steps read as one sequence, not six screens.
 * `variant='legacy'` keeps the original centered look for the profile's avatar editor, which reuses AvatarStep.
 */
export function StepHeading({ title, description, center, variant = 'panel' }: { title: string; description?: ReactNode; center?: boolean; variant?: 'panel' | 'legacy' }) {
	const centered = center ?? variant === 'legacy';
	if (variant === 'legacy') {
		return (
			<div className={cn('mb-6', centered && 'text-center')}>
				<h2 className='text-2xl font-black uppercase tracking-wide text-white sm:text-3xl'>{title}</h2>
				{description && <p className={cn('mt-2 text-sm text-neutral-400', centered ? 'mx-auto max-w-sm' : 'max-w-sm')}>{description}</p>}
			</div>
		);
	}
	return (
		<div className={cn('mb-7', centered && 'text-center')}>
			<h2 className='text-3xl font-black uppercase leading-[1.05] tracking-wide text-white sm:text-4xl'>{title}</h2>
			{description && <p className={cn('mt-3 max-w-md text-sm leading-relaxed text-neutral-400', centered && 'mx-auto')}>{description}</p>}
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
	variant = 'panel',
}: {
	onPrevious?: () => void;
	onNext?: () => void;
	nextLabel?: string;
	nextLoadingLabel?: string;
	previousLabel?: string;
	loading?: boolean;
	nextDisabled?: boolean;
	nextType?: 'button' | 'submit';
	variant?: 'panel' | 'legacy';
}) {
	return (
		<DialogFooter
			className={cn(
				'flex-row items-center justify-between gap-3 sm:justify-between',
				variant === 'legacy'
					? 'mt-8 border-t border-border pt-6'
					: // Full-bleed action strip pinned to the bottom of the step, cancelling the step's px-6/sm:px-12 and py-10.
						'-mx-6 -mb-10 mt-auto border-t border-border bg-white/[0.03] px-6 py-4 sm:-mx-12 sm:space-x-0 sm:px-12',
			)}
		>
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
