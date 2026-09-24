'use client';

import { useId, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { MessageSquareReply } from 'lucide-react';
import { ReplyForm } from './ReplyForm';

export type ReplyAction = { kind: 'form'; threadId: number; parentId: number; parentLabel: string; lockedForModerator: boolean } | { kind: 'sign-in'; href: string } | null;

interface ReplyItemProps {
	number: number;
	descendantCount: number;
	/** Children get another indent step; past the depth cap they line up with this reply instead. */
	indentChildren: boolean;
	/** #N, author, date, "replying to" hint. */
	header: ReactNode;
	/** Ban / delete controls, right-aligned in the header row. */
	tools?: ReactNode;
	body: ReactNode;
	/** Vote control, shown in the action row. */
	votes?: ReactNode;
	reply: ReplyAction;
	/** The nested <ol> of answers, if any. */
	children?: ReactNode;
}

const TOGGLE = 'inline-flex h-10 w-7 shrink-0 items-center justify-center rounded-sm font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-7';

/**
 * One reply in the chain: collapsible like Reddit ([–] / [+] N replies, or click the thread line),
 * with an inline reply box under it. Content is server-rendered and passed in as slots.
 */
export function ReplyItem({ number, descendantCount, indentChildren, header, tools, body, votes, reply, children }: ReplyItemProps) {
	const [collapsed, setCollapsed] = useState(false);
	const [replying, setReplying] = useState(false);
	const uid = useId();
	const contentId = `${uid}-content`;
	const formId = `${uid}-form`;
	const hidden = descendantCount === 1 ? '1 reply' : `${descendantCount} replies`;

	return (
		<div>
			<div className='flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1'>
				<button
					type='button'
					onClick={() => setCollapsed((c) => !c)}
					aria-expanded={!collapsed}
					aria-controls={contentId}
					aria-label={collapsed ? `Expand reply #${number}${descendantCount ? ` and ${hidden}` : ''}` : `Collapse reply #${number}`}
					className={TOGGLE}
				>
					<span aria-hidden>{collapsed ? '[+]' : '[–]'}</span>
				</button>
				{header}
				{collapsed && descendantCount > 0 && <span className='font-mono text-xs tabular-nums text-muted-foreground'>{hidden}</span>}
				{tools && !collapsed && <div className='ml-auto flex items-center gap-1'>{tools}</div>}
			</div>

			<div id={contentId} hidden={collapsed}>
				<div className='pl-7'>
					{body}
					<div className='mt-1 flex flex-wrap items-center gap-1 -ml-2 sm:-ml-1.5'>
						{votes}
						{reply?.kind === 'form' && (
							<button type='button' onClick={() => setReplying((r) => !r)} aria-expanded={replying} aria-controls={replying ? formId : undefined} className='inline-flex h-10 items-center gap-1.5 rounded-sm px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8'>
								<MessageSquareReply aria-hidden className='h-4 w-4' />
								Reply
							</button>
						)}
						{reply?.kind === 'sign-in' && (
							<Link href={reply.href} aria-label='Sign in to reply' title='Sign in to reply' className='inline-flex h-10 items-center gap-1.5 rounded-sm px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8'>
								<MessageSquareReply aria-hidden className='h-4 w-4' />
								Reply
							</Link>
						)}
					</div>
					{replying && reply?.kind === 'form' && (
						<div id={formId} className='mb-3 mt-1 max-w-[72ch] rounded-md border border-border p-3'>
							<ReplyForm threadId={reply.threadId} parentId={reply.parentId} parentLabel={reply.parentLabel} lockedForModerator={reply.lockedForModerator} onDone={() => setReplying(false)} />
						</div>
					)}
				</div>

				{children &&
					(indentChildren ? (
						<div className='relative ml-3.5 pl-2 sm:pl-3.5'>
							{/* The thread line: a hairline guide that also collapses this reply, like Reddit's. Mouse-only; [–] is the keyboard path. */}
							<button type='button' tabIndex={-1} aria-hidden onClick={() => setCollapsed(true)} className='group absolute inset-y-0 -left-1.5 w-3 cursor-pointer' title={`Collapse reply #${number}`}>
								<span className='absolute inset-y-0 left-1/2 w-px bg-border transition-colors group-hover:bg-foreground/70' />
							</button>
							{children}
						</div>
					) : (
						children
					))}
			</div>
		</div>
	);
}

