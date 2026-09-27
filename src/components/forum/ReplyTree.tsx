import type { ReactNode } from 'react';
import { CornerDownRight, Trash2 } from 'lucide-react';
import { formatAbsolute, formatRelative } from './forum-shared';
import type { ForumReplyItem } from './forum-queries';
import { MAX_INDENT_DEPTH, type ReplyNode } from './reply-tree';
import type { VoteValue } from './forum-votes';
import { AuthorLink, ForumAvatar, authorName, type PublicAuthor } from './ForumAuthor';
import { ForumText } from './ForumText';
import { ConfirmActionButton } from './ConfirmActionButton';
import { ReplyItem, type ReplyAction } from './ReplyItem';
import { VoteControl } from './VoteControl';

export interface ReplyTreeContext {
	threadId: number;
	viewerId: string | undefined;
	canModerate: boolean;
	isLocked: boolean;
	/** The viewer's own votes by reply id (per request, never cached). */
	myVotes: ReadonlyMap<number, VoteValue>;
	/** Sign-in URL that returns to this thread. */
	signInHref: string;
	now: Date;
	banControl: (author: PublicAuthor) => ReactNode;
}

type Node = ReplyNode<ForumReplyItem>;

const parentName = (node: Node) => (node.parent?.author ? authorName(node.parent.author) : '[deleted]');

function replyAction(node: Node, ctx: ReplyTreeContext): ReplyAction {
	if (node.reply.deletedAt) return null;
	if (!ctx.viewerId) return { kind: 'sign-in', href: ctx.signInHref };
	if (ctx.isLocked && !ctx.canModerate) return null;
	return { kind: 'form', threadId: ctx.threadId, parentId: node.reply.id, parentLabel: node.reply.author ? authorName(node.reply.author) : 'this reply', lockedForModerator: ctx.isLocked };
}

function ReplyHeader({ node, ctx }: { node: Node; ctx: ReplyTreeContext }) {
	const { reply, number } = node;
	return (
		<div className='flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1'>
			<a href={`#r${number}`} className='font-mono text-sm font-bold tabular-nums text-muted-foreground hover:text-foreground' aria-label={`Reply ${number}`}>
				#{number}
			</a>
			{reply.author ? (
				<span className='flex min-w-0 items-center gap-2'>
					<ForumAvatar author={reply.author} className='h-6 w-6' />
					<AuthorLink author={reply.author} className='truncate text-sm' />
				</span>
			) : (
				<span className='text-sm text-muted-foreground'>[deleted]</span>
			)}
			<time dateTime={reply.createdAt.toISOString()} title={formatAbsolute(reply.createdAt)} className='font-mono text-xs tabular-nums text-muted-foreground'>
				{formatRelative(reply.createdAt, ctx.now)}
			</time>
			{node.depth > MAX_INDENT_DEPTH && node.parentNumber !== null && (
				<a href={`#r${node.parentNumber}`} className='inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground'>
					<CornerDownRight aria-hidden className='h-3.5 w-3.5' />
					replying to @{parentName(node)}
					<span className='font-mono tabular-nums'>#{node.parentNumber}</span>
				</a>
			)}
		</div>
	);
}

function ReplyTools({ node, ctx }: { node: Node; ctx: ReplyTreeContext }) {
	const { reply, number } = node;
	if (!reply.author) return null;
	const canDelete = ctx.canModerate || ctx.viewerId === reply.author.id;
	const ban = ctx.banControl(reply.author);
	if (!ban && !canDelete) return null;
	const answers = node.descendantCount;
	return (
		<div className='flex items-center gap-1'>
			{ban}
			{canDelete && (
				<ConfirmActionButton
					endpoint={`/api/forum/replies/${reply.id}`}
					title={`Delete reply #${number}?`}
					description={
						answers > 0
							? `It will show as [deleted] for everyone. The ${answers} ${answers === 1 ? 'reply' : 'replies'} under it stay. This can't be undone.`
							: "The reply will be removed for everyone. This can't be undone."
					}
					confirmLabel='Delete reply'
					successMessage='Reply deleted'
					triggerProps={{ variant: 'ghost', size: 'icon', className: 'h-10 w-10 text-muted-foreground sm:h-8 sm:w-8', 'aria-label': `Delete reply #${number}`, title: 'Delete reply' }}
				>
					<Trash2 aria-hidden />
				</ConfirmActionButton>
			)}
		</div>
	);
}

/** The reply chain as nested lists; indentation (with a thread line) stops at MAX_INDENT_DEPTH. */
export function ReplyTree({ nodes, ctx, root = true }: { nodes: Node[]; ctx: ReplyTreeContext; root?: boolean }) {
	return (
		<ol className={root ? 'space-y-4' : 'mt-2 space-y-3'}>
			{nodes.map((node) => {
				const { reply } = node;
				const deleted = !!reply.deletedAt;
				return (
					<li key={reply.id} id={`r${node.number}`} className='scroll-mt-20'>
						<ReplyItem
							number={node.number}
							descendantCount={node.descendantCount}
							indentChildren={node.depth < MAX_INDENT_DEPTH}
							header={<ReplyHeader node={node} ctx={ctx} />}
							tools={deleted ? null : <ReplyTools node={node} ctx={ctx} />}
							body={deleted ? <p className='py-0.5 text-sm italic text-muted-foreground'>[deleted]</p> : <ForumText text={reply.body} className='max-w-[72ch]' />}
							votes={
								deleted ? null : (
									<VoteControl
										endpoint={`/api/forum/replies/${reply.id}/vote`}
										score={reply.score}
										myVote={ctx.myVotes.get(reply.id) ?? 0}
										orientation='horizontal'
										subject={`reply #${node.number}`}
										signInHref={ctx.viewerId ? undefined : ctx.signInHref}
									/>
								)
							}
							reply={replyAction(node, ctx)}
						>
							{node.children.length > 0 ? <ReplyTree nodes={node.children} ctx={ctx} root={false} /> : null}
						</ReplyItem>
					</li>
				);
			})}
		</ol>
	);
}
