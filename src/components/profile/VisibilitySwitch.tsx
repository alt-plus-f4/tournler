'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

interface VisibilitySwitchProps {
	label: string;
	description?: string;
	checked: boolean;
	onCheckedChange: (next: boolean) => void;
	disabled?: boolean;
	className?: string;
}

/**
 * A labelled on/off switch (role="switch"): a monochrome control-desk toggle, white when on.
 * The whole row is the hit target; the label and helper text are wired up for screen readers.
 */
export function VisibilitySwitch({ label, description, checked, onCheckedChange, disabled, className }: VisibilitySwitchProps) {
	const id = useId();
	const labelId = `${id}-label`;
	const descId = `${id}-desc`;

	return (
		<div className={cn('flex items-start justify-between gap-4', className)}>
			<div className='min-w-0'>
				<label id={labelId} htmlFor={id} className='block cursor-pointer text-sm font-medium text-white'>
					{label}
				</label>
				{description && (
					<p id={descId} className='mt-0.5 text-xs text-muted-foreground'>
						{description}
					</p>
				)}
			</div>
			<button
				id={id}
				type='button'
				role='switch'
				aria-checked={checked}
				aria-labelledby={labelId}
				aria-describedby={description ? descId : undefined}
				disabled={disabled}
				onClick={() => onCheckedChange(!checked)}
				className={cn(
					'relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50',
					checked ? 'border-white bg-white' : 'border-neutral-600 bg-neutral-900',
				)}
			>
				<span
					aria-hidden
					className={cn(
						'block h-3.5 w-3.5 rounded-full transition-transform duration-150 motion-reduce:transition-none',
						checked ? 'translate-x-[18px] bg-black' : 'translate-x-[2px] bg-neutral-400',
					)}
				/>
			</button>
		</div>
	);
}
