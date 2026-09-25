import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache, Suspense } from 'react';
import { ArrowLeft, ExternalLink, PenLine } from 'lucide-react';
import { db } from '@/lib/db';
import { cachedQuery, REVALIDATE } from '@/lib/cache/cached-query';
import { isOptimizable } from '@/lib/image-hosts';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import EditorOutput from '@/components/news/EditorOutput';
import { NewsAuthor, NewsDate } from '@/components/news/NewsMeta';
import { NewsComments } from '@/components/news/NewsComments';
import { hasEditorContent, htmlToPlainText } from '@/components/news/text';
import { commentSelect } from '@/app/api/news/_lib/comments';
import { Skeleton } from '@/components/ui/skeleton';

// Comments and edits land at any time; always render per request.
export const dynamic = 'force-dynamic';

interface NewsPostPageProps {
	params: Promise<{ id: string }>;
}

/** The public post (with author), in the shared data cache. A missing post caches as null; creating one flushes 'news'. */
const loadPost = cachedQuery(
	(id: number) =>
		db.newsPost.findUnique({
			where: { id },
			select: {
				id: true,
				title: true,
				blurb: true,
				content: true,
				imageUrl: true,
				link: true,
				publishedAt: true,
				author: { select: { id: true, name: true, image: true } },
			},
		}),
	['news-post'],
	{ tags: ['news', 'users'], revalidate: REVALIDATE.standard },
);

/** One lookup per request, shared by generateMetadata and the page. */
const getPost = cache(async (rawId: string) => {
	if (!/^\d{1,9}$/.test(rawId)) return null;
	return loadPost(Number(rawId));
});

export async function generateMetadata({ params }: NewsPostPageProps): Promise<Metadata> {
	const post = await getPost((await params).id);
	if (!post) return { title: 'Post not found' };
	const description = htmlToPlainText(post.blurb).slice(0, 200) || undefined;
	return {
		title: post.title,
		description,
		openGraph: { title: post.title, description, type: 'article', ...(post.imageUrl ? { images: [post.imageUrl] } : {}) },
	};
}

/** A post's comments with their authors, shared by every viewer (delete rights are decided in NewsComments from `viewer`). */
const getComments = cachedQuery((postId: number) => db.newsComment.findMany({ where: { postId }, orderBy: { createdAt: 'asc' }, select: commentSelect }), ['news-comments'], {
	tags: ['news', 'users'],
	revalidate: REVALIDATE.standard,
});

/** Comments stream in below the article, which paints as soon as the post row is read. */
async function CommentsSection({ postId, comments: commentsPromise, viewer }: { postId: number; comments: ReturnType<typeof getComments>; viewer: { id: string; canModerate: boolean } | null }) {
	const comments = await commentsPromise;
	return <NewsComments postId={postId} initialComments={comments.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))} viewer={viewer} />;
}

function CommentsSkeleton() {
	return (
		<div role='status' aria-busy='true' className='mt-12 border-t border-border pt-8'>
			<span className='sr-only'>Loading comments…</span>
			<Skeleton className='h-7 w-32 rounded-sm bg-neutral-900' />
			<div className='mt-4 space-y-4'>
				{Array.from({ length: 2 }).map((_, i) => (
					<div key={i} className='space-y-2 py-4'>
						<Skeleton className='h-5 w-40 rounded-sm bg-neutral-900' />
						<Skeleton className='ml-8 h-4 w-3/4 rounded-sm bg-neutral-900' />
					</div>
				))}
			</div>
		</div>
	);
}

export default async function NewsPostPage({ params }: NewsPostPageProps) {
	const post = await getPost((await params).id);
	if (!post) notFound();

	// Kicked off now so it runs alongside the permission lookup; awaited inside the Suspense boundary.
	const comments = getComments(post.id);
	const session = await getAuthSession();
	const canManage = session ? await userHasPermission(session.user.id, 'content:manage') : false;

	const hasBody = hasEditorContent(post.content);
	const externalLink = post.link && /^https?:\/\//.test(post.link) ? post.link : null;

	return (
		<article className='mx-auto my-8 w-full max-w-3xl px-4'>
			<div className='flex items-center justify-between gap-4'>
				<Link href='/news' className='inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
					<ArrowLeft aria-hidden className='h-4 w-4' />
					All news
				</Link>
				{canManage && (
					<Link href={`/news/${post.id}/edit`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
						<PenLine aria-hidden className='mr-2 h-4 w-4' />
						Edit post
					</Link>
				)}
			</div>

			<header className='mt-6'>
				<h1 className='text-balance text-3xl font-bold leading-tight tracking-tight md:text-4xl'>{post.title}</h1>
				<div className='mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm'>
					<NewsAuthor author={post.author} size='md' />
					<span aria-hidden className='text-neutral-600'>
						·
					</span>
					<NewsDate date={post.publishedAt} />
				</div>
			</header>

			{post.imageUrl && (
				<div className='relative mt-6 aspect-[16/9] w-full overflow-hidden rounded-md border border-border bg-neutral-900'>
					<Image src={post.imageUrl} alt='' fill preload sizes='(max-width: 768px) 100vw, 768px' unoptimized={!isOptimizable(post.imageUrl)} className='object-cover' />
				</div>
			)}

			<div className='prose prose-invert mt-8 max-w-[70ch] prose-headings:font-bold prose-a:text-foreground prose-a:underline-offset-4 prose-code:before:content-none prose-code:after:content-none'>
				{hasBody ? (
					<EditorOutput content={post.content} />
				) : (
					<>
						{/* Legacy posts: the blurb is sanitized rich text (sanitizeRichText on write). */}
						<div dangerouslySetInnerHTML={{ __html: post.blurb }} />
						{externalLink && (
							<p>
								<a href={externalLink} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1.5'>
									Read the full announcement
									<ExternalLink aria-hidden className='h-4 w-4' />
									<span className='sr-only'>(opens in a new tab)</span>
								</a>
							</p>
						)}
						{!externalLink && post.link && (
							<p>
								<Link href={post.link}>Read more</Link>
							</p>
						)}
					</>
				)}
			</div>

			<Suspense fallback={<CommentsSkeleton />}>
				<CommentsSection postId={post.id} comments={comments} viewer={session ? { id: session.user.id, canModerate: canManage } : null} />
			</Suspense>
		</article>
	);
}
