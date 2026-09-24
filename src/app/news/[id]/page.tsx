import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { ArrowLeft, ExternalLink, PenLine } from 'lucide-react';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import EditorOutput from '@/components/news/EditorOutput';
import { NewsAuthor, NewsDate } from '@/components/news/NewsMeta';
import { NewsComments } from '@/components/news/NewsComments';
import { hasEditorContent, htmlToPlainText } from '@/components/news/text';
import { commentSelect } from '@/app/api/news/_lib/comments';

interface NewsPostPageProps {
	params: Promise<{ id: string }>;
}

const getPost = cache(async (rawId: string) => {
	if (!/^\d{1,9}$/.test(rawId)) return null;
	return db.newsPost.findUnique({
		where: { id: Number(rawId) },
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
	});
});

function isOptimizable(url: string) {
	try {
		return new URL(url).hostname.endsWith('.public.blob.vercel-storage.com');
	} catch {
		return url.startsWith('/');
	}
}

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

export default async function NewsPostPage({ params }: NewsPostPageProps) {
	const post = await getPost((await params).id);
	if (!post) notFound();

	const session = await getAuthSession();
	const [canManage, comments] = await Promise.all([
		session ? userHasPermission(session.user.id, 'content:manage') : Promise.resolve(false),
		db.newsComment.findMany({ where: { postId: post.id }, orderBy: { createdAt: 'asc' }, select: commentSelect }),
	]);

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
					<Image src={post.imageUrl} alt='' fill priority sizes='(max-width: 768px) 100vw, 768px' unoptimized={!isOptimizable(post.imageUrl)} className='object-cover' />
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

			<NewsComments
				postId={post.id}
				initialComments={comments.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))}
				viewer={session ? { id: session.user.id, canModerate: canManage } : null}
			/>
		</article>
	);
}
