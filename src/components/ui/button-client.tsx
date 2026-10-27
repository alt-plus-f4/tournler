'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from './button-variants';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
	isLoading?: boolean;
	asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, children, variant, isLoading, size, asChild = false, onClick, disabled, ...props }, ref) => {
	const Comp = asChild ? Slot : 'button';
	// An onClick that returns a promise (an async handler) puts the button into a pending state
	// until it settles: spinner shown, extra clicks ignored, so slow actions never look dead or
	// fire twice. Sync handlers and `asChild` buttons behave exactly as before.
	const [pending, setPending] = React.useState(false);
	const mounted = React.useRef(true);
	React.useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);

	const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		if (pending) return;
		const result = (onClick as ((e: React.MouseEvent<HTMLButtonElement>) => unknown) | undefined)?.(event);
		if (!asChild && result && typeof (result as PromiseLike<unknown>).then === 'function') {
			setPending(true);
			// No catch here: a rejected handler still surfaces as an unhandled rejection, as before.
			void Promise.resolve(result).finally(() => {
				if (mounted.current) setPending(false);
			});
		}
	};

	const busy = Boolean(isLoading) || pending;

	return (
		<Comp
			className={cn(buttonVariants({ variant, size, className }))}
			ref={ref}
			disabled={busy || disabled}
			aria-busy={busy || undefined}
			onClick={onClick ? handleClick : undefined}
			{...props}
		>
			{asChild ? (
				children
			) : (
				<>
					{busy ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
					{children}
				</>
			)}
		</Comp>
	);
});
Button.displayName = 'Button';

export { Button };
