'use client';

import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { useToast } from '@/lib/hooks/use-toast';

interface ShareButtonProps {
	/** Path to share, e.g. `/tournaments/foo`. Defaults to the current page. */
	path?: string;
	label?: string;
	className?: string;
	variant?: ButtonProps['variant'];
	size?: ButtonProps['size'];
	/** Hides the text label below `md`, icon-only — for action rows that already collapse this way. */
	compact?: boolean;
}

/** Copies a page's absolute URL (or opens the native share sheet, where supported) and confirms it. */
export function ShareButton({ path, label = 'Share', className, variant = 'outline', size = 'sm', compact = false }: ShareButtonProps) {
	const [copied, setCopied] = useState(false);
	const { toast } = useToast();

	const handleShare = async () => {
		const url = path ? `${window.location.origin}${path}` : window.location.href;

		if (typeof navigator.share === 'function') {
			try {
				await navigator.share({ url });
				return;
			} catch {
				// AbortError (user canceled the share sheet) or unsupported — fall through to copy.
			}
		}

		try {
			await navigator.clipboard.writeText(url);
			setCopied(true);
			toast({ title: 'Link copied to clipboard' });
			setTimeout(() => setCopied(false), 2000);
		} catch {
			toast({ variant: 'destructive', title: 'Couldn’t copy link', description: 'Copy it from the address bar instead.' });
		}
	};

	return (
		<Button type='button' variant={variant} size={size} onClick={handleShare} className={className} aria-label={copied ? 'Link copied' : label}>
			{copied ? <Check className={compact ? 'h-4 w-4 md:mr-2' : 'mr-2 h-3.5 w-3.5'} aria-hidden /> : <Share2 className={compact ? 'h-4 w-4 md:mr-2' : 'mr-2 h-3.5 w-3.5'} aria-hidden />}
			<span className={compact ? 'hidden md:inline' : undefined}>{copied ? 'Copied' : label}</span>
		</Button>
	);
}
