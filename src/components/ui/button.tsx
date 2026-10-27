'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
	'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background touch-manipulation transition-[transform,opacity,background-color,color,border-color,box-shadow] duration-100 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.97] active:opacity-80 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
	{
		variants: {
			variant: {
				default: 'bg-primary text-primary-foreground hover:bg-primary/90',
				destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
				outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
				secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
				ghost: 'hover:bg-accent hover:text-accent-foreground',
				link: 'text-primary underline-offset-4 hover:underline',
			},
			size: {
				default: 'h-10 px-4 py-2',
				sm: 'h-9 rounded-md px-3',
				lg: 'h-11 rounded-md px-8',
				icon: 'h-10 w-10',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	},
);

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

export { Button, buttonVariants };
