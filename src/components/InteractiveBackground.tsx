'use client';

import { useEffect, useRef } from 'react';

/**
 * A subtle, monochrome background: a faint grid texture with a soft white
 * glow that follows the pointer. Mutates CSS custom properties directly via
 * a ref instead of React state so pointer movement never triggers a
 * re-render. Skips pointer-tracking entirely for prefers-reduced-motion.
 */
export function InteractiveBackground() {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			return;
		}

		function handlePointerMove(event: PointerEvent) {
			const x = (event.clientX / window.innerWidth) * 100;
			const y = (event.clientY / window.innerHeight) * 100;
			el!.style.setProperty('--x', `${x}%`);
			el!.style.setProperty('--y', `${y}%`);
		}

		window.addEventListener('pointermove', handlePointerMove, { passive: true });
		return () => window.removeEventListener('pointermove', handlePointerMove);
	}, []);

	return <div ref={ref} aria-hidden className='interactive-bg pointer-events-none fixed inset-0 -z-10' />;
}
