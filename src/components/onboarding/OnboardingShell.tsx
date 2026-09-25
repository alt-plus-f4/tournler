'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { DialogPortal, DialogOverlay, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface OnboardingStepMeta {
	number: number;
	title: string;
}

interface OnboardingShellProps {
	steps: OnboardingStepMeta[];
	currentStep: number;
	completedSteps: number[];
	children: ReactNode;
}

/**
 * The setup wizard's own control-room panel: a fixed size (never resizes step to step, so
 * Previous/Continue don't jump under the cursor) with a step rail on desktop and a compact segment
 * bar on mobile — both driven by the same `steps`/`currentStep`/`completedSteps` the dialog already
 * tracks. Built on the Radix primitives directly instead of the shared DialogContent: this flow is
 * mandatory until Completed, so it skips DialogContent's corner close button rather than ship one
 * that silently does nothing (nothing here wires `onOpenChange`).
 */
export function OnboardingShell({ steps, currentStep, completedSteps, children }: OnboardingShellProps) {
	const index = Math.max(
		0,
		steps.findIndex((s) => s.number === currentStep),
	);
	const title = steps[index]?.title ?? 'Setup';

	return (
		<DialogPortal>
			<DialogOverlay />
			<DialogPrimitive.Content
				onInteractOutside={(e) => e.preventDefault()}
				onEscapeKeyDown={(e) => e.preventDefault()}
				className='stage-grid fixed left-1/2 top-1/2 z-50 flex h-[min(680px,90vh)] w-[calc(100%-2rem)] max-w-[880px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-border shadow-2xl duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:flex-row'
			>
				<DialogTitle className='sr-only'>Set up your account</DialogTitle>
				<DialogDescription className='sr-only'>
					Step {index + 1} of {steps.length}: {title}
				</DialogDescription>

				{/* Desktop rail: the full sequence, with the signal chain connecting each step. */}
				<aside className='hidden w-[240px] shrink-0 flex-col border-r border-border bg-black/40 px-6 py-8 sm:flex'>
					<span className='text-xs font-bold uppercase tracking-[0.2em] text-neutral-500'>Account setup</span>
					<ol aria-label='Setup steps' className='mt-6 flex flex-1 flex-col'>
						{steps.map((step, i) => {
							const isCurrent = step.number === currentStep;
							const isDone = completedSteps.includes(step.number) && !isCurrent;
							return (
								<li key={step.number} aria-current={isCurrent ? 'step' : undefined} className='relative flex items-center gap-3 py-2'>
									{i < steps.length - 1 && <span aria-hidden className='absolute left-[15px] top-9 h-[calc(100%-4px)] w-px bg-border' />}
									<span
										className={cn(
											'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-bold tabular-nums transition-colors',
											isCurrent
												? 'border-white bg-white text-black shadow-[0_0_0_4px_rgba(255,255,255,0.08)]'
												: isDone
													? 'border-white/60 text-white'
													: 'border-border text-neutral-600',
										)}
									>
										{isDone ? <Check className='h-3.5 w-3.5' aria-hidden /> : i + 1}
									</span>
									<span className={cn('truncate text-xs font-bold uppercase tracking-wide', isCurrent ? 'text-white' : isDone ? 'text-neutral-300' : 'text-neutral-600')}>{step.title}</span>
								</li>
							);
						})}
					</ol>
				</aside>

				<div className='flex min-w-0 flex-1 flex-col overflow-hidden'>
					{/* Mobile: a segment bar stands in for the rail — same information, a fraction of the width. */}
					<div className='flex shrink-0 items-center gap-3 border-b border-border px-5 py-4 sm:hidden'>
						<span className='shrink-0 font-mono text-xs font-bold tabular-nums text-neutral-500'>
							{String(index + 1).padStart(2, '0')}/{String(steps.length).padStart(2, '0')}
						</span>
						<div className='flex flex-1 gap-1' aria-hidden>
							{steps.map((step) => (
								<span key={step.number} className={cn('h-1 flex-1 rounded-full', completedSteps.includes(step.number) || step.number === currentStep ? 'bg-white' : 'bg-border')} />
							))}
						</div>
					</div>

					<div className='flex min-h-0 flex-1 flex-col overflow-y-auto'>{children}</div>
				</div>
			</DialogPrimitive.Content>
		</DialogPortal>
	);
}
