import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Ban, Lock, Pin, Trash2 } from 'lucide-react';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { buttonVariants } from '@/components/ui/button';
import { getForumThreadCached, parseId } from '@/components/forum/forum-queries';
import { CATEGORY_LABELS, CATEGORY_SLUGS, formatAbsolute } from '@/components/forum/forum-shared';
import { AuthorLink, ForumAvatar } from '@/components/forum/ForumAuthor';
import { ForumText } from '@/components/forum/ForumText';
import { ConfirmActionButton } from '@/components/forum/ConfirmActionButton';
import { ReplyForm } from '@/components/forum/ReplyForm';
import { ThreadModControls } from '@/components/forum/ThreadModControls';
import { BanUserDialog } from '@/components/admin/BanUserDialog';
import { db } from '@/lib/db';
import { activeBanWhere, toActiveBan } from '@/lib/bans';

// Replies, locks and pins change constantly; always render per request.
export const dynamic = 'force-dynamic';

interface ThreadPageProps {
	params: Promise<{ id: string }>;
}

/** One query per request, shared by generateMetadata and the page. */
const loadThread = cache(async (rawId: string) => {
	const id = parseId(rawId);
	return id ? getForumThreadCached(id) : null;
});

export async function generateMetadata({ params }: ThreadPageProps): Promise<Metadata> {
	const thread = await loadThread((await params).id);
	if (!thread) return { title: 'Thread not found · Forum' };
	const description = thread.body.replace(/\s+/g, ' ').trim().slice(0, 160);
	return { title: `${thread.title} · Forum`, description, openGraph: { title: thread.title, description, type: 'article' } };
}

function PostDate({ date }: { date: Date }) {
	return (
		<time dateTime={date.toISOString()} className='font-mono text-xs tabular-nums text-muted-foreground'>
			{formatAbsolute(date)}
		</time>
	);
}

export default async function ForumThreadPage({ params }: ThreadPageProps) {
	const thread = await loadThread((await params).id);
	if (!thread) notFound();

	const session = await getAuthSession();
	const viewerId = session?.user.id;
	// Both checks read the same (React-cached) role row, so this is one query.
	const [canModerate, canBan] = viewerId ? await Promise.all([userHasPermission(viewerId, 'forum:moderate'), userHasPermission(viewerId, 'users:ban')]) : [false, false];
	const canDeleteThread = canModerate || viewerId === thread.author.id;

	// Moderators only: each author's role and active ban, for the "Ban" control next to their posts.
	// Looked up here rather than in the public thread payload so roles/bans never leave the server otherwise.
	const authorIds = [...new Set([thread.author.id, ...thread.replies.map((r) => r.author.id)])];
	const banInfo = canBan
		? new Map(
				(
					await db.user.findMany({
						where: { id: { in: authorIds } },
						select: { id: true, role: true, bans: { where: activeBanWhere(), orderBy: { createdAt: 'desc' }, take: 1 } },
					})
				).map((u) => [u.id, { role: u.role, ban: toActiveBan(u.bans[0]) }]),
			)
		: null;
	const banControl = (author: { id: string; name: string | null }) => {
		const info = banInfo?.get(author.id);
		if (!info || author.id === viewerId || info.role === 'ADMIN') return null;
		return (
			<BanUserDialog
				user={author}
				ban={info.ban}
				triggerProps={{ variant: 'ghost', size: 'sm', className: 'h-8 px-2 text-muted-foreground', 'aria-label': `${info.ban ? 'Lift ban on' : 'Ban'} ${author.name || 'this user'}` }}
			>
				<Ban aria-hidden />
				{info.ban ? 'Banned' : 'Ban'}
			</BanUserDialog>
		);
	};
	const replyCount = thread.replies.length;

	return (
		<div className='container mx-auto max-w-[900px] px-4 py-8'>
			<div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground'>
				<Link href='/forum' className='inline-flex items-center gap-1.5 hover:text-foreground'>
					<ArrowLeft aria-hidden className='h-4 w-4' />
					Forum
				</Link>
				<span aria-hidden>/</span>
				<Link href={`/forum?category=${CATEGORY_SLUGS[thread.category]}`} className='hover:text-foreground'>
					{CATEGORY_LABELS[thread.category]}
				</Link>
			</div>

			<article className='mt-4 rounded-md border border-border'>
				<header className='border-b border-border p-4 sm:p-5'>
					<div className='flex flex-wrap items-center gap-2'>
						{thread.isPinned && (
							<span className='inline-flex items-center gap-1 rounded-sm border border-border px-1.5 py-0.5 text-xs font-bold uppercase tracking-widest text-foreground'>
								<Pin aria-hidden className='h-3 w-3' />
								Pinned
							</span>
						)}
						{thread.isLocked && (
							<span className='inline-flex items-center gap-1 rounded-sm border border-border px-1.5 py-0.5 text-xs font-bold uppercase tracking-widest text-muted-foreground'>
								<Lock aria-hidden className='h-3 w-3' />
								Locked
							</span>
						)}
					</div>
					<h1 className='mt-1 break-words text-2xl font-bold leading-tight md:text-3xl'>{thread.title}</h1>
					<div className='mt-3 flex flex-wrap items-center gap-x-3 gap-y-2'>
						<ForumAvatar author={thread.author} />
						<div className='flex min-w-0 flex-col text-sm leading-tight'>
							<AuthorLink author={thread.author} />
							<PostDate date={thread.createdAt} />
						</div>
						{banControl(thread.author)}
						{(canModerate || canDeleteThread) && (
							<div className='ml-auto flex items-center gap-1.5'>
								{canModerate && <ThreadModControls threadId={thread.id} title={thread.title} isPinned={thread.isPinned} isLocked={thread.isLocked} />}
								{canDeleteThread && (
									<ConfirmActionButton
										endpoint={`/api/forum/threads/${thread.id}`}
										title='Delete this thread?'
										description={`The thread and its ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'} will be removed for everyone. This can't be undone.`}
										confirmLabel='Delete thread'
										successMessage='Thread deleted'
										redirectTo='/forum'
										triggerProps={{ variant: 'outline', size: 'sm' }}
									>
										<Trash2 aria-hidden />
										Delete
									</ConfirmActionButton>
								)}
							</div>
						)}
					</div>
				</header>
				<ForumText text={thread.body} className='max-w-[72ch] p-4 sm:p-5' />
			</article>

			<section aria-labelledby='replies-heading' className='mt-8'>
				<h2 id='replies-heading' className='mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground'>
					Replies · <span className='font-mono tabular-nums'>{replyCount}</span>
				</h2>
				{replyCount > 0 ? (
					<ol className='divide-y divide-border rounded-md border border-border'>
						{thread.replies.map((reply, index) => {
							const canDeleteReply = canModerate || viewerId === reply.author.id;
							return (
								<li key={reply.id} id={`r${index + 1}`} className='scroll-mt-20 p-4'>
									<div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
										<a href={`#r${index + 1}`} className='font-mono text-sm font-bold tabular-nums text-muted-foreground hover:text-foreground' aria-label={`Reply ${index + 1}`}>
											#{index + 1}
										</a>
										<ForumAvatar author={reply.author} className='h-6 w-6' />
										<AuthorLink author={reply.author} className='text-sm' />
										<PostDate date={reply.createdAt} />
										{banControl(reply.author)}
										{canDeleteReply && (
											<div className='ml-auto'>
												<ConfirmActionButton
													endpoint={`/api/forum/replies/${reply.id}`}
													title={`Delete reply #${index + 1}?`}
													description="The reply will be removed for everyone. This can't be undone."
													confirmLabel='Delete reply'
													successMessage='Reply deleted'
													triggerProps={{ variant: 'ghost', size: 'icon', className: 'h-8 w-8 text-muted-foreground', 'aria-label': `Delete reply #${index + 1}`, title: 'Delete reply' }}
												>
													<Trash2 aria-hidden />
												</ConfirmActionButton>
											</div>
										)}
									</div>
									<ForumText text={reply.body} className='mt-2 max-w-[72ch]' />
								</li>
							);
						})}
					</ol>
				) : (
					<p className='rounded-md border border-border px-4 py-8 text-center text-sm text-muted-foreground'>No replies yet.</p>
				)}
			</section>

			<section aria-label='Reply to this thread' className='mt-6 rounded-md border border-border p-4'>
				{!session ? (
					<p className='text-sm text-muted-foreground'>
						<Link href={`/sign-in?callbackUrl=${encodeURIComponent(`/forum/${thread.id}`)}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
							Sign in to reply
						</Link>
					</p>
				) : thread.isLocked && !canModerate ? (
					<div className='space-y-2' aria-disabled='true'>
						<p className='flex items-center gap-2 text-sm font-medium'>
							<Lock aria-hidden className='h-4 w-4' />
							This thread is locked
						</p>
						<p className='text-sm text-muted-foreground'>A moderator closed it to new replies.</p>
						<textarea disabled aria-label='Replies are disabled' className='min-h-24 w-full cursor-not-allowed rounded-md border border-input bg-background px-3 py-2 text-sm opacity-50' />
					</div>
				) : (
					<ReplyForm threadId={thread.id} lockedForModerator={thread.isLocked} />
				)}
			</section>
		</div>
	);
}
