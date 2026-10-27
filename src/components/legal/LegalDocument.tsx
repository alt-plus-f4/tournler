import type { ReactNode } from 'react';
import Link from 'next/link';
import { LegalContents } from '@/components/legal/LegalContents';

export interface LegalSection {
	id: string;
	title: string;
	body: ReactNode;
}

/**
 * Shared shell for /terms and /privacy: a sticky contents list beside a single readable column.
 * Section ids double as anchor links, so any clause can be linked to directly.
 */
export function LegalDocument({ title, updated, intro, sections, sibling }: { title: string; updated: string; intro: ReactNode; sections: LegalSection[]; sibling: { href: string; label: string } }) {
	return (
		<div className='mx-auto w-full max-w-6xl px-4 py-12 sm:py-16'>
			<header className='mb-10 max-w-[70ch] border-b border-border pb-8 lg:ml-[calc(220px+3rem)]'>
				<p className='mb-3 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground'>
					Last updated <time className='font-mono tabular-nums text-neutral-300'>{updated}</time>
				</p>
				<h1 className='text-3xl font-black uppercase tracking-wide text-white sm:text-5xl'>{title}</h1>
				<div className='mt-6 text-base leading-relaxed text-neutral-300'>{intro}</div>
			</header>

			<div className='lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12'>
				<nav aria-label='Contents' className='mb-10 lg:mb-0'>
					<div className='lg:sticky lg:top-24'>
						<p className='mb-3 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground'>Contents</p>
						<LegalContents sections={sections.map(({ id, title }) => ({ id, title }))} />
					</div>
				</nav>

				<article className='prose prose-invert max-w-[70ch] prose-headings:scroll-mt-24 prose-headings:font-black prose-headings:uppercase prose-headings:tracking-wide prose-h2:mb-3 prose-h2:mt-12 prose-h2:text-xl prose-h3:text-base prose-p:text-neutral-300 prose-a:text-white prose-a:underline-offset-4 prose-strong:text-white prose-li:text-neutral-300 prose-li:marker:text-neutral-500 prose-th:text-white prose-td:text-neutral-300 first:prose-h2:mt-0'>
					{sections.map((section, i) => (
						<section key={section.id} aria-labelledby={section.id}>
							<h2 id={section.id}>
								<span className='mr-2 font-mono text-base font-normal text-muted-foreground'>{i + 1}.</span>
								{section.title}
							</h2>
							{section.body}
						</section>
					))}
					<p className='not-prose mt-12 border-t border-border pt-6 text-sm text-muted-foreground'>
						See also the{' '}
						<Link href={sibling.href} className='text-neutral-200 underline underline-offset-4 hover:text-white'>
							{sibling.label}
						</Link>
						.
					</p>
				</article>
			</div>
		</div>
	);
}
