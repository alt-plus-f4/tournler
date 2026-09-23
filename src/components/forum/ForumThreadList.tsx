import Link from 'next/link';
import { Lock, Pin } from 'lucide-react';
import { CATEGORY_LABELS, formatAbsolute, formatRelative } from './forum-shared';
import type { ForumThreadListItem } from './forum-queries';
import { authorName } from './ForumAuthor';

const COLS = 'sm:grid sm:grid-cols-[minmax(0,1fr)_8rem_4.5rem_6.5rem] sm:items-center sm:gap-4';

/** Dense HLTV-style thread table. Rendered as a list with column headers for screen readers and sighted users alike. */
export function ForumThreadList({ threads, showCategory }: { threads: ForumThreadListItem[]; showCategory: boolean }) {
	const now = new Date();
	return (
		<div className='overflow-hidden rounded-md border border-border'>
			<div className={`hidden border-b border-border bg-muted/40 px-3 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground ${COLS}`} aria-hidden>
				<span>Thread</span>
				<span>Author</span>
				<span className='text-right'>Replies</span>
				<span className='text-right'>Last post</span>
			</div>
			<ul className='divide-y divide-border'>
				{threads.map((thread) => {
					const replies = thread._count.replies;
					return (
						<li key={thread.id} className={`group relative px-3 py-2.5 transition-colors hover:bg-muted/40 ${COLS}`}>
							<div className='flex min-w-0 items-center gap-2'>
								{thread.isPinned && (
									<Pin aria-hidden className='h-3.5 w-3.5 shrink-0 text-foreground' />
								)}
								{thread.isLocked && (
									<Lock aria-hidden className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
								)}
								<Link href={`/forum/${thread.id}`} className='line-clamp-2 min-w-0 text-sm font-medium text-foreground sm:line-clamp-none sm:truncate after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring'>
									{thread.isPinned && <span className='sr-only'>Pinned: </span>}
									{thread.isLocked && <span className='sr-only'>Locked: </span>}
									{thread.title}
								</Link>
								{showCategory && <span className='hidden shrink-0 rounded-sm border border-border px-1.5 py-px text-[0.6875rem] font-bold uppercase tracking-wider text-muted-foreground md:inline'>{CATEGORY_LABELS[thread.category]}</span>}
							</div>
							<span className='hidden truncate text-sm text-muted-foreground sm:block'>{authorName(thread.author)}</span>
							<span className='hidden text-right font-mono text-sm tabular-nums text-foreground sm:block'>
								{replies}
								<span className='sr-only'> {replies === 1 ? 'reply' : 'replies'}</span>
							</span>
							<time dateTime={thread.lastActivityAt.toISOString()} title={formatAbsolute(thread.lastActivityAt)} className='hidden text-right font-mono text-xs tabular-nums text-muted-foreground sm:block'>
								{formatRelative(thread.lastActivityAt, now)}
							</time>
							{/* Mobile meta line */}
							<p className='mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground sm:hidden'>
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
