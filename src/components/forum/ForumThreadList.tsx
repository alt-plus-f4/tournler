import Link from 'next/link';
import { LinkPendingVeil } from '@/components/shell/LinkPending';
import { Lock, Pin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATEGORY_LABELS, formatAbsolute, formatRelative } from './forum-shared';
import type { ForumThreadListItem } from './forum-queries';
import { authorName } from './ForumAuthor';
import { formatScore } from './forum-votes';

const COLS = 'sm:grid sm:grid-cols-[3.5rem_minmax(0,1fr)_8rem_4.5rem_6.5rem] sm:items-center sm:gap-4';
const PILL = 'inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-1 font-mono text-[0.625rem] font-semibold uppercase leading-none tracking-[0.1em]';

/** Dense HLTV-style thread table. Rendered as a list with column headers for screen readers and sighted users alike. */
export function ForumThreadList({ threads, showCategory }: { threads: ForumThreadListItem[]; showCategory: boolean }) {
	const now = new Date();
	return (
		<div className='mt-4 overflow-hidden rounded-md border border-border bg-card/40'>
			<div className={cn('hidden border-b border-border bg-white/[0.03] px-4 py-2.5 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-muted-foreground', COLS)} aria-hidden>
				<span className='text-right'>Score</span>
				<span>Thread</span>
				<span>Author</span>
				<span className='text-right'>Replies</span>
				<span className='text-right'>Last post</span>
			</div>
			<ul className='divide-y divide-border'>
				{threads.map((thread) => {
					const replies = thread._count.replies;
					return (
						<li key={thread.id} className={cn('group relative px-4 py-3.5 transition-colors hover:bg-white/5', COLS)}>
							<span className='hidden text-right font-mono text-sm tabular-nums text-foreground sm:block'>
								<span className='sr-only'>Score </span>
								{formatScore(thread.score)}
							</span>
							<div className='flex min-w-0 items-center gap-2'>
								{thread.isPinned && (
									<span aria-hidden className={cn(PILL, 'bg-white text-black')}>
										<Pin className='h-3 w-3' />
										Pinned
									</span>
								)}
								{thread.isLocked && (
									<span aria-hidden className={cn(PILL, 'bg-white/10 text-muted-foreground')}>
										<Lock className='h-3 w-3' />
										Locked
									</span>
								)}
								<Link
									href={`/forum/${thread.id}`}
									className='line-clamp-2 min-w-0 text-sm font-semibold text-foreground sm:line-clamp-none sm:truncate after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring'
								>
									{thread.isPinned && <span className='sr-only'>Pinned: </span>}
									{thread.isLocked && <span className='sr-only'>Locked: </span>}
									{thread.title}
									<LinkPendingVeil />
								</Link>
								{showCategory && (
									<span className='hidden shrink-0 rounded-full border border-border px-2 py-0.5 text-[0.6875rem] font-medium text-muted-foreground md:inline'>{CATEGORY_LABELS[thread.category]}</span>
								)}
							</div>
							<span className='hidden truncate text-sm text-muted-foreground sm:block'>{authorName(thread.author)}</span>
							<span className='hidden text-right font-mono text-sm tabular-nums text-foreground sm:block'>
								{replies}
								<span className='sr-only'> {replies === 1 ? 'reply' : 'replies'}</span>
							</span>
							<time
								dateTime={thread.lastActivityAt.toISOString()}
								title={formatAbsolute(thread.lastActivityAt)}
								className='hidden text-right font-mono text-xs tabular-nums text-muted-foreground sm:block'
							>
								{formatRelative(thread.lastActivityAt, now)}
							</time>
							{/* Mobile meta line */}
							<p className='mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground sm:hidden'>
								<span>
									<span className='font-mono tabular-nums text-foreground'>{formatScore(thread.score)}</span> {Math.abs(thread.score) === 1 ? 'point' : 'points'}
								</span>
								<span aria-hidden>·</span>
								<span className='truncate'>{authorName(thread.author)}</span>
								<span aria-hidden>·</span>
								<span>
									<span className='font-mono tabular-nums text-foreground'>{replies}</span> {replies === 1 ? 'reply' : 'replies'}
								</span>
								<span aria-hidden>·</span>
								<time dateTime={thread.lastActivityAt.toISOString()} className='font-mono tabular-nums'>
									{formatRelative(thread.lastActivityAt, now)}
								</time>
							</p>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
