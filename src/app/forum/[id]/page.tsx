import { cache, Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Ban, Lock, Pin, Trash2 } from 'lucide-react';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getForumThreadCached, parseId } from '@/components/forum/forum-queries';
import { CATEGORY_LABELS, CATEGORY_SLUGS, formatAbsolute } from '@/components/forum/forum-shared';
import { AuthorLink, ForumAvatar } from '@/components/forum/ForumAuthor';
import { ForumText } from '@/components/forum/ForumText';
import { ConfirmActionButton } from '@/components/forum/ConfirmActionButton';
import { ReplyForm } from '@/components/forum/ReplyForm';
import { ReplyTree } from '@/components/forum/ReplyTree';
import { VoteControl } from '@/components/forum/VoteControl';
import { buildReplyTree, parseReplySort, type ReplySort } from '@/components/forum/reply-tree';
import { toVoteValue, type VoteValue } from '@/components/forum/forum-votes';
import { ThreadModControls } from '@/components/forum/ThreadModControls';
import { BanUserDialog } from '@/components/admin/BanUserDialog';
import { db } from '@/lib/db';
import { activeBanWhere, toActiveBan } from '@/lib/bans';

// Replies, locks and pins change constantly; always render per request.
export const dynamic = 'force-dynamic';

interface ThreadPageProps {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ sort?: string | string[] }>;
}

/** One query per request, shared by generateMetadata and the page. */
const loadThread = cache(async (rawId: string) => {
	const id = parseId(rawId);
	return id ? getForumThreadCached(id) : null;
});

export async function generateMetadata({ params }: Pick<ThreadPageProps, 'params'>): Promise<Metadata> {
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


/** Paints instantly on navigation while the thread, the viewer's votes and permissions load. */
function ThreadSkeleton() {
	return (
		<div role='status' aria-busy='true'>
			<span className='sr-only'>Loading thread…</span>
			<Skeleton className='h-5 w-44 rounded-sm bg-neutral-900' />
			<div className='mt-4 rounded-md border border-border p-4 sm:p-5'>
				<div className='flex gap-3'>
					<Skeleton className='h-28 w-10 rounded-sm bg-neutral-900 sm:w-8' />
					<div className='flex-1 space-y-3'>
						<Skeleton className='h-8 w-3/4 rounded-sm bg-neutral-900' />
						<div className='flex items-center gap-3'>
							<Skeleton className='h-8 w-8 rounded-full bg-neutral-900' />
							<Skeleton className='h-4 w-40 rounded-sm bg-neutral-900' />
						</div>
					</div>
				</div>
				<div className='mt-5 space-y-2'>
					<Skeleton className='h-4 w-full rounded-sm bg-neutral-900' />
					<Skeleton className='h-4 w-11/12 rounded-sm bg-neutral-900' />
					<Skeleton className='h-4 w-2/3 rounded-sm bg-neutral-900' />
				</div>
			</div>
			<Skeleton className='mt-8 h-4 w-28 rounded-sm bg-neutral-900' />
			<div className='mt-4 space-y-5'>
				{[0, 1, 2, 0].map((depth, i) => (
					<div key={i} className='space-y-2' style={{ paddingLeft: `${depth * 1.5}rem` }}>
						<Skeleton className='h-5 w-48 rounded-sm bg-neutral-900' />
						<Skeleton className='ml-7 h-4 w-3/4 rounded-sm bg-neutral-900' />
					</div>
				))}
			</div>
		</div>
	);
}

export default function ForumThreadPage({ params, searchParams }: ThreadPageProps) {
	return (
		<div className='container mx-auto max-w-[900px] px-4 py-8'>
			<Suspense fallback={<ThreadSkeleton />}>
				<ThreadContent params={params} searchParams={searchParams} />
			</Suspense>
		</div>
	);
}

function SortToggle({ threadId, sort }: { threadId: number; sort: ReplySort }) {
	const options: { value: ReplySort; label: string }[] = [
		{ value: 'top', label: 'Top' },
		{ value: 'oldest', label: 'Oldest' },
	];
	return (
		<nav aria-label='Sort replies' className='flex items-center gap-0.5 rounded-md border border-border p-0.5'>
			{options.map((option) => {
				const active = option.value === sort;
				return (
					<Link
						key={option.value}
						href={option.value === 'top' ? `/forum/${threadId}` : `/forum/${threadId}?sort=${option.value}`}
						scroll={false}
						replace
						aria-current={active ? 'true' : undefined}
						className={cn(
							'inline-flex h-9 items-center rounded-sm px-3 text-xs font-bold uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-7 sm:px-2.5',
							active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
						)}
					>
						{option.label}
					</Link>
				);
			})}
		</nav>
	);
}

async function ThreadContent({ params, searchParams }: ThreadPageProps) {
	const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
	const thread = await loadThread(rawId);
	if (!thread) notFound();
	const sort = parseReplySort(Array.isArray(query.sort) ? query.sort[0] : query.sort);

	const session = await getAuthSession();
	const viewerId = session?.user.id;
	const visibleReplyIds = thread.replies.filter((r) => !r.deletedAt).map((r) => r.id);

	// Everything viewer-specific is read here, per request; the thread payload above stays shared.
	const [[canModerate, canBan], votes] = await Promise.all([
		// Both checks read the same (React-cached) role row, so this is one query.
		viewerId ? Promise.all([userHasPermission(viewerId, 'forum:moderate'), userHasPermission(viewerId, 'users:ban')]) : Promise.resolve([false, false] as const),
		viewerId
			? db.forumVote.findMany({
					where: { userId: viewerId, OR: [{ threadId: thread.id }, ...(visibleReplyIds.length > 0 ? [{ replyId: { in: visibleReplyIds } }] : [])] },
					select: { threadId: true, replyId: true, value: true },
				})
			: Promise.resolve([]),
	]);
	const threadVote: VoteValue = toVoteValue(votes.find((v) => v.threadId === thread.id)?.value);
	const replyVotes = new Map<number, VoteValue>(votes.flatMap((v) => (v.replyId !== null ? [[v.replyId, toVoteValue(v.value)] as const] : [])));
	const canDeleteThread = canModerate || viewerId === thread.author.id;

	// Moderators only: each author's role and active ban, for the "Ban" control next to their posts.
	// Looked up here rather than in the public thread payload so roles/bans never leave the server otherwise.
	const authorIds = [...new Set([thread.author.id, ...thread.replies.flatMap((r) => (r.author ? [r.author.id] : []))])];
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

	const replyCount = visibleReplyIds.length;
	const tree = buildReplyTree(thread.replies, sort);
	const signInHref = `/sign-in?callbackUrl=${encodeURIComponent(`/forum/${thread.id}${sort === 'top' ? '' : `?sort=${sort}`}`)}`;

	return (
		<>
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
				<header className='flex gap-2 border-b border-border p-3 sm:gap-3 sm:p-5'>
					<VoteControl endpoint={`/api/forum/threads/${thread.id}/vote`} score={thread.score} myVote={threadVote} orientation='vertical' subject='this thread' signInHref={session ? undefined : signInHref} className='-mt-1 shrink-0' />
					<div className='min-w-0 flex-1'>
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
						<h1 className='mt-1 text-balance break-words text-2xl font-bold leading-tight md:text-3xl'>{thread.title}</h1>
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
					</div>
				</header>
				<ForumText text={thread.body} className='max-w-[72ch] p-4 sm:p-5' />
			</article>

			<section aria-labelledby='replies-heading' className='mt-8'>
				<div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
					<h2 id='replies-heading' className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
						Replies · <span className='font-mono tabular-nums'>{replyCount}</span>
					</h2>
					{thread.replies.length > 1 && <SortToggle threadId={thread.id} sort={sort} />}
				</div>
				{tree.length > 0 ? (
					<ReplyTree
						nodes={tree}
						ctx={{ threadId: thread.id, viewerId, canModerate, isLocked: thread.isLocked, myVotes: replyVotes, signInHref, now: new Date(), banControl }}
					/>
				) : (
					<p className='rounded-md border border-border px-4 py-8 text-center text-sm text-muted-foreground'>No replies yet.</p>
				)}
			</section>

			<section aria-label='Reply to this thread' className='mt-6 rounded-md border border-border p-4'>
				{!session ? (
					<p className='text-sm text-muted-foreground'>
						<Link href={signInHref} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
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
		</>
	);
}
