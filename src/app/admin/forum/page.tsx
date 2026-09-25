import type { Metadata } from 'next';
import Link from 'next/link';
import { Lock, Pin, Trash2 } from 'lucide-react';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { AccessDenied } from '@/components/AccessDenied';
import { listForumThreads } from '@/components/forum/forum-queries';
import { CATEGORY_LABELS, formatAbsolute, formatRelative } from '@/components/forum/forum-shared';
import { authorName } from '@/components/forum/ForumAuthor';
import { formatScore } from '@/components/forum/forum-votes';
import { ThreadModControls } from '@/components/forum/ThreadModControls';
import { ConfirmActionButton } from '@/components/forum/ConfirmActionButton';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Forum' };

export default async function AdminForumPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
	const session = await getAuthSession();
	const allowed = session ? await userHasPermission(session.user.id, 'forum:moderate') : false;
	if (!allowed) return <AccessDenied resource='the forum' />;

	const requested = Math.max(1, Number.parseInt((await searchParams).page ?? '1', 10) || 1);
	const { threads, total, totalPages } = await listForumThreads({ category: null, page: requested });
	const page = Math.min(requested, totalPages);
	const now = new Date();

	return (
		<div className='mx-4 mt-12 mb-12 max-w-6xl space-y-6 md:mx-12'>
			<div className='flex flex-wrap items-end justify-between gap-3'>
				<div>
					<h1 className='mb-1 text-2xl font-bold'>Forum</h1>
					<p className='text-sm text-muted-foreground'>
						<span className='font-mono tabular-nums text-foreground'>{total}</span> threads, pinned first then by latest activity. Pin, lock or delete from here.
					</p>
				</div>
				<Link href='/forum' className={buttonVariants({ variant: 'outline', size: 'sm' })}>
					Open public forum
				</Link>
			</div>

			{threads.length === 0 ? (
				<div className='rounded-md border border-border py-12 text-center text-muted-foreground'>No threads yet.</div>
			) : (
				<div className='overflow-x-auto rounded-md border border-border'>
					<table className='w-full min-w-[820px] text-sm'>
						<thead>
							<tr className='border-b border-border text-left text-xs font-bold uppercase tracking-widest text-muted-foreground'>
								<th scope='col' className='px-3 py-2 font-bold'>Thread</th>
								<th scope='col' className='px-3 py-2 font-bold'>Author</th>
								<th scope='col' className='px-3 py-2 text-right font-bold'>Score</th>
								<th scope='col' className='px-3 py-2 text-right font-bold'>Replies</th>
								<th scope='col' className='px-3 py-2 text-right font-bold'>Last activity</th>
								<th scope='col' className='px-3 py-2 text-right font-bold'>
									Actions
								</th>
							</tr>
						</thead>
						<tbody className='divide-y divide-border'>
							{threads.map((thread) => (
								<tr key={thread.id} className='hover:bg-muted/30'>
									<td className='max-w-0 px-3 py-2'>
										<div className='flex min-w-0 items-center gap-1.5'>
											{thread.isPinned && <Pin aria-label='Pinned' className='h-3.5 w-3.5 shrink-0' />}
											{thread.isLocked && <Lock aria-label='Locked' className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />}
											<Link href={`/forum/${thread.id}`} className='truncate font-medium hover:underline underline-offset-2'>
												{thread.title}
											</Link>
										</div>
										<span className='text-xs text-muted-foreground'>{CATEGORY_LABELS[thread.category]}</span>
									</td>
									<td className='px-3 py-2 text-muted-foreground'>
										<Link href={`/profile/${thread.author.id}`} className='hover:text-foreground'>
											{authorName(thread.author)}
										</Link>
									</td>
									<td className='px-3 py-2 text-right font-mono tabular-nums'>{formatScore(thread.score)}</td>
									<td className='px-3 py-2 text-right font-mono tabular-nums'>{thread._count.replies}</td>
									<td className='px-3 py-2 text-right'>
										<time dateTime={thread.lastActivityAt.toISOString()} title={formatAbsolute(thread.lastActivityAt)} className='font-mono text-xs tabular-nums text-muted-foreground'>
											{formatRelative(thread.lastActivityAt, now)}
										</time>
									</td>
									<td className='px-3 py-2'>
										<div className='flex items-center justify-end gap-1.5'>
											<ThreadModControls threadId={thread.id} title={thread.title} isPinned={thread.isPinned} isLocked={thread.isLocked} compact />
											<ConfirmActionButton
												endpoint={`/api/forum/threads/${thread.id}`}
												title='Delete this thread?'
												description={`“${thread.title}” and its ${thread._count.replies} ${thread._count.replies === 1 ? 'reply' : 'replies'} will be removed for everyone. This can't be undone.`}
												confirmLabel='Delete thread'
												successMessage='Thread deleted'
												triggerProps={{ variant: 'outline', size: 'icon', className: 'h-8 w-8', 'aria-label': `Delete “${thread.title}”`, title: 'Delete' }}
											>
												<Trash2 aria-hidden />
											</ConfirmActionButton>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{totalPages > 1 && (
				<nav aria-label='Pagination' className='flex items-center justify-center gap-3 text-sm'>
					<Link href={`/admin/forum?page=${page - 1}`} aria-disabled={page <= 1} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), page <= 1 && 'pointer-events-none opacity-50')}>
						Previous
					</Link>
					<span className='text-muted-foreground'>
						Page <span className='font-mono tabular-nums text-foreground'>{page}</span> of <span className='font-mono tabular-nums text-foreground'>{totalPages}</span>
					</span>
					<Link href={`/admin/forum?page=${page + 1}`} aria-disabled={page >= totalPages} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), page >= totalPages && 'pointer-events-none opacity-50')}>
						Next
					</Link>
				</nav>
			)}
		</div>
	);
}
