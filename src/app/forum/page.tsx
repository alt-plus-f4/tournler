import type { Metadata } from 'next';
import Link from 'next/link';
import { cache, Suspense } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { getAuthSession } from '@/lib/auth';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { listForumThreadsCached } from '@/components/forum/forum-queries';
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

/** One cached read per request, shared by the header count and the list. */
const loadList = cache((category: ForumCategoryValue | null, page: number) => listForumThreadsCached({ category, page }));

export default async function ForumPage({ searchParams }: ForumPageProps) {
	const query = await searchParams;
	const category = parseCategorySlug(first(query.category));
	const requestedPage = Math.max(1, Number.parseInt(first(query.page) ?? '1', 10) || 1);

	const tabs: { label: string; value: ForumCategoryValue | null }[] = [{ label: 'All', value: null }, ...FORUM_CATEGORIES.map((c) => ({ label: CATEGORY_LABELS[c], value: c }))];

	// The heading and tabs paint immediately; the count, the post button and the list stream in.
	return (
		<div className='container mx-auto max-w-[1100px] px-4 py-8 lg:px-8'>
			<div className='flex flex-wrap items-end justify-between gap-4'>
				<div>
					<h1 className='text-3xl font-black uppercase tracking-wide md:text-4xl'>Forum</h1>
					<Suspense fallback={<Skeleton className='mt-2 h-4 w-24 rounded-sm bg-neutral-900' />}>
						<ThreadCount category={category} page={requestedPage} />
					</Suspense>
				</div>
				<Suspense fallback={<Skeleton className='h-10 w-32 rounded-md bg-neutral-900' />}>
					<PostButton category={category} />
				</Suspense>
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

			<Suspense key={`${category ?? 'all'}-${requestedPage}`} fallback={<ThreadListSkeleton />}>
				<ThreadListSection category={category} requestedPage={requestedPage} />
			</Suspense>
		</div>
	);
}

async function ThreadCount({ category, page }: { category: ForumCategoryValue | null; page: number }) {
	const { total } = await loadList(category, page);
	return (
		<p className='mt-1 text-sm text-muted-foreground'>
			<span className='font-mono tabular-nums text-foreground'>{total}</span> {total === 1 ? 'thread' : 'threads'}
			{category ? ` in ${CATEGORY_LABELS[category]}` : ''}
		</p>
	);
}

async function PostButton({ category }: { category: ForumCategoryValue | null }) {
	const session = await getAuthSession();
	if (!session) {
		return (
			<Link href={`/sign-in?callbackUrl=${encodeURIComponent('/forum/new')}`} className={buttonVariants({ variant: 'outline' })}>
				Sign in to post
			</Link>
		);
	}
	return (
		<Link href={category ? `/forum/new?category=${CATEGORY_SLUGS[category]}` : '/forum/new'} className={buttonVariants()}>
			<Plus aria-hidden />
			New thread
		</Link>
	);
}

function ThreadListSkeleton() {
	return (
		<div role='status' aria-busy='true' className='mt-4 overflow-hidden rounded-md border border-border'>
			<span className='sr-only'>Loading threads…</span>
			<div className='h-9 border-b border-border bg-muted/40' />
			<div className='divide-y divide-border'>
				{Array.from({ length: 8 }).map((_, i) => (
					<div key={i} className='flex items-center gap-4 px-3 py-3'>
						<Skeleton className='hidden h-4 w-8 rounded-sm bg-neutral-900 sm:block' />
						<Skeleton className='h-4 flex-1 rounded-sm bg-neutral-900' style={{ maxWidth: `${60 - (i % 3) * 12}%` }} />
						<Skeleton className='ml-auto hidden h-4 w-24 rounded-sm bg-neutral-900 sm:block' />
						<Skeleton className='hidden h-4 w-10 rounded-sm bg-neutral-900 sm:block' />
					</div>
				))}
			</div>
		</div>
	);
}

async function ThreadListSection({ category, requestedPage }: { category: ForumCategoryValue | null; requestedPage: number }) {
	const [session, { threads, totalPages }] = await Promise.all([getAuthSession(), loadList(category, requestedPage)]);
	const page = Math.min(requestedPage, totalPages);
	return (
		<>
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
		</>
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
