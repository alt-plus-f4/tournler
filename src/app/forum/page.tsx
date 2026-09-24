import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { getAuthSession } from '@/lib/auth';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { listForumThreads } from '@/components/forum/forum-queries';
import { CATEGORY_LABELS, CATEGORY_SLUGS, FORUM_CATEGORIES, parseCategorySlug, type ForumCategoryValue } from '@/components/forum/forum-shared';
import { ForumThreadList } from '@/components/forum/ForumThreadList';

export const metadata: Metadata = {
	title: 'Forum',
	description: 'Talk Counter-Strike, tournaments and everything else with the Tournler community.',
};

// Thread list changes with every post; always render per request.
export const dynamic = 'force-dynamic';

interface ForumPageProps {
	searchParams: Promise<{ category?: string | string[]; page?: string | string[] }>;
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function forumHref(category: ForumCategoryValue | null, page = 1) {
	const params = new URLSearchParams();
	if (category) params.set('category', CATEGORY_SLUGS[category]);
	if (page > 1) params.set('page', String(page));
	const query = params.toString();
	return query ? `/forum?${query}` : '/forum';
}

export default async function ForumPage({ searchParams }: ForumPageProps) {
	const query = await searchParams;
	const category = parseCategorySlug(first(query.category));
	const requestedPage = Math.max(1, Number.parseInt(first(query.page) ?? '1', 10) || 1);

	const [session, list] = await Promise.all([getAuthSession(), listForumThreads({ category, page: requestedPage })]);
	const { threads, total, totalPages } = list;
	const page = Math.min(requestedPage, totalPages);

	const tabs: { label: string; value: ForumCategoryValue | null }[] = [{ label: 'All', value: null }, ...FORUM_CATEGORIES.map((c) => ({ label: CATEGORY_LABELS[c], value: c }))];
	const newThreadHref = category ? `/forum/new?category=${CATEGORY_SLUGS[category]}` : '/forum/new';

	return (
		<div className='container mx-auto max-w-[1100px] px-4 py-8 lg:px-8'>
			<div className='flex flex-wrap items-end justify-between gap-4'>
				<div>
					<h1 className='text-3xl font-black uppercase tracking-wide md:text-4xl'>Forum</h1>
					<p className='mt-1 text-sm text-muted-foreground'>
						<span className='font-mono tabular-nums text-foreground'>{total}</span> {total === 1 ? 'thread' : 'threads'}
						{category ? ` in ${CATEGORY_LABELS[category]}` : ''}
					</p>
				</div>
				{session ? (
					<Link href={newThreadHref} className={buttonVariants()}>
						<Plus aria-hidden />
						New thread
					</Link>
				) : (
					<Link href={`/sign-in?callbackUrl=${encodeURIComponent('/forum/new')}`} className={buttonVariants({ variant: 'outline' })}>
						Sign in to post
					</Link>
				)}
			</div>

			<nav aria-label='Forum categories' className='mt-6 -mx-4 overflow-x-auto px-4'>
				<ul className='flex min-w-max gap-1 border-b border-border'>
					{tabs.map((tab) => {
						const active = tab.value === category;
						return (
							<li key={tab.label}>
								<Link
									href={forumHref(tab.value)}
									aria-current={active ? 'page' : undefined}
									className={cn(
										'-mb-px inline-flex h-10 items-center border-b-2 px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
										active ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
									)}
								>
									{tab.label}
								</Link>
							</li>
						);
					})}
				</ul>
			</nav>

			<div className='mt-4'>
				{threads.length > 0 ? (
					<ForumThreadList threads={threads} showCategory={!category} />
				) : (
					<div className='rounded-md border border-border px-4 py-16 text-center'>
						<p className='font-medium'>{category ? `No threads in ${CATEGORY_LABELS[category]} yet` : 'No threads yet'}</p>
						<p className='mt-1 text-sm text-muted-foreground'>{session ? 'Start the first one.' : 'Sign in to start the first one.'}</p>
					</div>
				)}
			</div>

			{totalPages > 1 && (
				<nav aria-label='Pagination' className='mt-4 flex items-center justify-center gap-2'>
					<PagerLink href={forumHref(category, page - 1)} disabled={page <= 1} label='Previous page'>
						<ChevronLeft aria-hidden />
					</PagerLink>
					<span className='px-3 text-sm text-muted-foreground'>
						Page <span className='font-mono tabular-nums text-foreground'>{page}</span> of <span className='font-mono tabular-nums text-foreground'>{totalPages}</span>
					</span>
					<PagerLink href={forumHref(category, page + 1)} disabled={page >= totalPages} label='Next page'>
						<ChevronRight aria-hidden />
					</PagerLink>
				</nav>
			)}
		</div>
	);
}

function PagerLink({ href, disabled, label, children }: { href: string; disabled: boolean; label: string; children: React.ReactNode }) {
	const className = buttonVariants({ variant: 'outline', size: 'icon' });
	if (disabled) {
		return (
			<span aria-disabled='true' aria-label={label} className={cn(className, 'pointer-events-none opacity-50')}>
				{children}
			</span>
		);
	}
	return (
		<Link href={href} aria-label={label} className={className}>
			{children}
		</Link>
	);
}
