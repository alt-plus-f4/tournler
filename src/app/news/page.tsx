import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, MessageSquare, PenLine } from 'lucide-react';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NewsAuthor, NewsDate } from '@/components/news/NewsMeta';

const PAGE_SIZE = 20;
const FALLBACK_IMAGE = '/info-image.png';

export const metadata: Metadata = {
	title: 'News',
	description: 'Announcements, patch notes and tournament news from Tournler.',
};

interface NewsPageProps {
	searchParams: Promise<{ page?: string }>;
}

function isOptimizable(url: string) {
	try {
		return new URL(url).hostname.endsWith('.public.blob.vercel-storage.com');
	} catch {
		return url.startsWith('/');
	}
}

export default async function NewsPage({ searchParams }: NewsPageProps) {
	const { page: rawPage } = await searchParams;
	const page = Math.max(1, Number.parseInt(rawPage ?? '1', 10) || 1);
	const session = await getAuthSession();

	const [canWrite, total, posts] = await Promise.all([
		session ? userHasPermission(session.user.id, 'content:manage') : Promise.resolve(false),
		db.newsPost.count(),
		db.newsPost.findMany({
			orderBy: { publishedAt: 'desc' },
			skip: (page - 1) * PAGE_SIZE,
			take: PAGE_SIZE,
			select: {
				id: true,
				title: true,
				blurb: true,
				imageUrl: true,
				publishedAt: true,
				author: { select: { id: true, name: true, image: true } },
				_count: { select: { comments: true } },
			},
		}),
	]);
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

	return (
		<div className='mx-auto my-8 w-full max-w-5xl px-4'>
			<div className='flex flex-wrap items-end justify-between gap-4'>
				<div>
					<h1 className='text-3xl font-black uppercase tracking-wide md:text-5xl'>News</h1>
					<p className='mt-2 text-sm text-muted-foreground'>Announcements, patch notes and tournament news from the Tournler team.</p>
				</div>
				{canWrite && (
					<Link href='/news/new' className={cn(buttonVariants(), 'shrink-0')}>
						<PenLine aria-hidden className='mr-2 h-4 w-4' />
						Write a post
					</Link>
				)}
			</div>

			{posts.length === 0 ? (
				<div className='mt-8 rounded-md border border-border px-6 py-16 text-center'>
					<p className='font-medium'>{page > 1 ? 'No posts on this page.' : 'No news yet.'}</p>
					<p className='mt-1 text-sm text-muted-foreground'>{page > 1 ? 'Head back to the latest posts.' : 'Announcements will show up here as soon as they’re published.'}</p>
					{page > 1 && (
						<Link href='/news' className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-4')}>
							Latest posts
						</Link>
					)}
				</div>
			) : (
				<ol className='mt-8 divide-y divide-border border-y border-border'>
					{posts.map((post) => {
						const cover = post.imageUrl || FALLBACK_IMAGE;
						return (
							<li key={post.id} className='group relative flex gap-4 py-5 transition-colors hover:bg-white/[0.02] md:gap-6'>
								<div className='relative hidden aspect-[16/10] w-44 shrink-0 overflow-hidden rounded-md border border-border bg-neutral-900 sm:block md:w-56'>
									<Image src={cover} alt='' fill sizes='224px' unoptimized={!isOptimizable(cover)} className='object-cover' />
								</div>
								<div className='min-w-0 flex-1'>
									<h2 className='text-lg font-bold leading-snug md:text-xl'>
										<Link href={`/news/${post.id}`} className='after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background group-hover:underline group-hover:decoration-neutral-500 group-hover:underline-offset-4'>
											{post.title}
										</Link>
									</h2>
									{post.blurb && (
										<div
											className='prose prose-sm prose-invert mt-1.5 line-clamp-2 max-w-[70ch] text-muted-foreground [&_*]:m-0 [&_*]:text-inherit'
											// Blurbs are sanitized on write (sanitizeRichText / escaped plain text).
											dangerouslySetInnerHTML={{ __html: post.blurb }}
										/>
									)}
									<div className='mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm'>
										<NewsAuthor author={post.author} />
										<span aria-hidden className='text-neutral-600'>
											·
										</span>
										<NewsDate date={post.publishedAt} />
										<span aria-hidden className='text-neutral-600'>
											·
										</span>
										<span className='inline-flex items-center gap-1.5 text-muted-foreground'>
											<MessageSquare aria-hidden className='h-3.5 w-3.5' />
											<span className='font-mono tabular-nums'>{post._count.comments}</span>
											<span className='sr-only'>{post._count.comments === 1 ? 'comment' : 'comments'}</span>
										</span>
									</div>
								</div>
							</li>
						);
					})}
				</ol>
			)}

			{totalPages > 1 && (
				<nav aria-label='Pagination' className='mt-6 flex items-center justify-center gap-2'>
					<PageLink page={page - 1} disabled={page <= 1} label='Previous page'>
						<ChevronLeft aria-hidden />
					</PageLink>
					<span className='px-3 text-sm text-muted-foreground'>
						Page <span className='font-mono tabular-nums text-foreground'>{page}</span> of <span className='font-mono tabular-nums text-foreground'>{totalPages}</span>
					</span>
					<PageLink page={page + 1} disabled={page >= totalPages} label='Next page'>
						<ChevronRight aria-hidden />
					</PageLink>
				</nav>
			)}
		</div>
	);
}

function PageLink({ page, disabled, label, children }: { page: number; disabled: boolean; label: string; children: React.ReactNode }) {
	const className = cn(buttonVariants({ variant: 'outline', size: 'icon' }), disabled && 'pointer-events-none opacity-50');
	if (disabled) {
		return (
			<span aria-disabled='true' aria-label={label} className={className}>
				{children}
			</span>
		);
	}
	return (
		<Link href={page === 1 ? '/news' : `/news?page=${page}`} aria-label={label} className={className}>
			{children}
		</Link>
	);
}
