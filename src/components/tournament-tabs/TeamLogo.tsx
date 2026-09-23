/* eslint-disable @next/next/no-img-element */
import Image from 'next/image';
import { cn } from '@/lib/utils';

const OPTIMIZED_HOST = '6q0iedxcfemxlbr8.public.blob.vercel-storage.com';

export function isOptimizable(src: string) {
	try {
		const url = new URL(src);
		return url.protocol === 'https:' && url.hostname === OPTIMIZED_HOST;
	} catch {
		// Relative paths (served from /public) are always optimizable.
		return src.startsWith('/');
	}
}

/** Team logo: next/image for hosts in `images.remotePatterns`, a lazy sized <img> otherwise. */
export function TeamLogo({ src, name, size = 40, className }: { src: string; name: string; size?: number; className?: string }) {
	const classes = cn('shrink-0 rounded-sm border border-border object-contain', className);
	if (isOptimizable(src)) {
		return <Image src={src} alt={`${name} logo`} width={size} height={size} className={classes} style={{ width: size, height: size }} />;
	}
	return <img src={src} alt={`${name} logo`} width={size} height={size} loading='lazy' decoding='async' className={classes} style={{ width: size, height: size }} />;
}
