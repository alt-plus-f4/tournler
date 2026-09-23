import { forwardRef, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const FIELD = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export const ForumTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
	<textarea ref={ref} className={cn(FIELD, 'min-h-32 resize-y leading-relaxed', className)} {...props} />
));
ForumTextarea.displayName = 'ForumTextarea';

export const ForumSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...props }, ref) => (
	<select ref={ref} className={cn(FIELD, 'h-10 [color-scheme:dark]', className)} {...props} />
));
ForumSelect.displayName = 'ForumSelect';

/** "123 / 5000" counter; turns signal red past the limit. */
export function CharCount({ id, length, max }: { id: string; length: number; max: number }) {
	return (
		<span id={id} className={cn('font-mono text-xs tabular-nums', length > max ? 'text-signal-live' : 'text-muted-foreground')} aria-live={length > max ? 'polite' : 'off'}>
			{length}/{max}
		</span>
	);
}
