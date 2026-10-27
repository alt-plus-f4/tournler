'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/** Sticky contents rail; highlights the section currently under the top of the viewport. */
export function LegalContents({ sections }: { sections: { id: string; title: string }[] }) {
	const [active, setActive] = useState<string | null>(sections[0]?.id ?? null);

	useEffect(() => {
		const els = sections.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => !!el);
		if (!els.length || typeof IntersectionObserver === 'undefined') return;
		const visible = new Set<string>();
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) visible.add(entry.target.id);
					else visible.delete(entry.target.id);
				}
				const first = els.find((el) => visible.has(el.id));
				if (first) setActive(first.id);
			},
			{ rootMargin: '-96px 0px -60% 0px' },
		);
		els.forEach((el) => observer.observe(el));
		return () => observer.disconnect();
	}, [sections]);

	return (
		<ol className='flex gap-1 overflow-x-auto text-sm lg:flex-col lg:gap-0.5 lg:overflow-visible'>
			{sections.map((section, i) => (
				<li key={section.id} className='shrink-0'>
					<a
						href={`#${section.id}`}
						aria-current={active === section.id ? 'location' : undefined}
						className={cn(
							'flex gap-2 whitespace-nowrap border-b-2 px-3 py-1.5 transition-colors lg:whitespace-normal lg:border-b-0 lg:border-l-2',
							active === section.id ? 'border-white text-white' : 'border-border text-muted-foreground hover:text-white',
						)}
					>
						<span className='w-5 shrink-0 text-right font-mono text-xs leading-5 tabular-nums'>{i + 1}</span>
						<span>{section.title}</span>
					</a>
				</li>
			))}
		</ol>
	);
}
