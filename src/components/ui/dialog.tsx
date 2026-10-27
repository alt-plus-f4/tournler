'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Overlay>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>>(({ className, ...props }, ref) => (
	<DialogPrimitive.Overlay
		ref={ref}
		suppressHydrationWarning
		className={cn('fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0', className)}
		{...props}
	/>
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

type DialogContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
	/** Opt in to the redesigned panel: blurred scrim, card surface. */
	panel?: boolean;
};

const DialogContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, DialogContentProps>(({ className, children, panel = false, ...props }, ref) => {
	const hasDescription = React.Children.toArray(children).some((child) => React.isValidElement(child) && child.type === DialogDescription);

	return (
		<DialogPortal>
			<DialogOverlay className={panel ? 'bg-black/75 backdrop-blur-sm' : undefined} />
			<DialogPrimitive.Content
				ref={ref}
				suppressHydrationWarning
				className={cn(
					'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg',
					panel && 'overflow-hidden border-border bg-card',
					className,
				)}
				{...props}
			>
				{children}
				{!hasDescription && !props['aria-describedby'] && <DialogPrimitive.Description className='sr-only' />}
				<DialogPrimitive.Close className='absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground ring-offset-background transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none'>
					<X className='h-4 w-4' aria-hidden />
					<span className='sr-only'>Close</span>
				</DialogPrimitive.Close>
			</DialogPrimitive.Content>
		</DialogPortal>
	);
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />;
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({ className, bar = false, ...props }: React.HTMLAttributes<HTMLDivElement> & { bar?: boolean }) => (
	<div
		className={cn(
			'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-0 sm:space-x-2',
			// Full-bleed action strip: cancels the content's p-6 so it spans edge to edge.
			bar && '-mx-6 -mb-6 mt-2 border-t border-border bg-white/[0.03] px-6 py-4 sm:gap-2 sm:space-x-0',
			className,
		)}
		{...props}
	/>
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Title>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(({ className, ...props }, ref) => (
	<DialogPrimitive.Title ref={ref} className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

/** Small tracked label above a panel dialog's title, e.g. "Admin" or "Setup". */
const DialogEyebrow = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
	<span className={cn('text-xs font-bold uppercase tracking-[0.2em] text-neutral-400', className)} {...props} />
);
DialogEyebrow.displayName = 'DialogEyebrow';

/** Title class for panel dialogs: heavy, uppercase, tracked, matching the page headings. */
const dialogPanelTitle = 'text-2xl font-black uppercase leading-none tracking-wide text-white';

const DialogDescription = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Description>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>>(({ className, ...props }, ref) => (
	<DialogPrimitive.Description ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export { Dialog, DialogPortal, DialogOverlay, DialogClose, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogEyebrow, dialogPanelTitle };
