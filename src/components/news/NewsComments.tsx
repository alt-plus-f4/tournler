'use client';

import { useState } from 'react';
import Link from 'next/link';
import TextareaAutosize from 'react-textarea-autosize';
import { Trash2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/lib/hooks/use-toast';
import { cn } from '@/lib/utils';
import { NewsAuthor, NewsAuthorData, NewsDate } from './NewsMeta';

const MAX_COMMENT = 2000;

export interface NewsCommentData {
	id: number;
	text: string;
	createdAt: string;
	author: NewsAuthorData;
}

interface NewsCommentsProps {
	postId: number;
	initialComments: NewsCommentData[];
	/** null when signed out. */
	viewer: { id: string; canModerate: boolean } | null;
}

export function NewsComments({ postId, initialComments, viewer }: NewsCommentsProps) {
	const [comments, setComments] = useState(initialComments);
	const [text, setText] = useState('');
	const [isPosting, setIsPosting] = useState(false);
	const [pendingDelete, setPendingDelete] = useState<NewsCommentData | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const { toast } = useToast();

	const trimmed = text.trim();
	const tooLong = text.length > MAX_COMMENT;

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		if (!trimmed || tooLong) return;
		setIsPosting(true);
		try {
			const res = await fetch(`/api/news/${postId}/comments`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text: trimmed }),
			});
			const body = await res.json().catch(() => null);
			if (!res.ok) throw new Error(body?.error || 'Your comment was not posted.');
			setComments((prev) => [...prev, body.comment]);
			setText('');
		} catch (error) {
			toast({ variant: 'destructive', title: 'Comment not posted', description: error instanceof Error ? error.message : 'Try again in a moment.' });
		} finally {
			setIsPosting(false);
		}
	}

	async function confirmDelete() {
		if (!pendingDelete) return;
		setIsDeleting(true);
		try {
			const res = await fetch(`/api/news/${postId}/comments/${pendingDelete.id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Could not delete the comment.');
			setComments((prev) => prev.filter((c) => c.id !== pendingDelete.id));
			setPendingDelete(null);
		} catch (error) {
			toast({ variant: 'destructive', title: 'Comment not deleted', description: error instanceof Error ? error.message : 'Try again in a moment.' });
		} finally {
			setIsDeleting(false);
		}
	}

	return (
		<section aria-labelledby='comments-heading' className='mt-12 border-t border-border pt-8'>
			<h2 id='comments-heading' className='text-lg font-bold'>
				Comments <span className='font-mono text-base font-normal tabular-nums text-muted-foreground'>{comments.length}</span>
			</h2>

			{comments.length === 0 ? (
				<p className='mt-4 text-sm text-muted-foreground'>No comments yet.{viewer ? ' Start the conversation.' : ''}</p>
			) : (
				<ol className='mt-4 divide-y divide-border'>
					{comments.map((comment) => {
						const canDelete = !!viewer && (viewer.id === comment.author.id || viewer.canModerate);
						return (
							<li key={comment.id} className='py-4'>
								<div className='flex items-center gap-3 text-sm'>
									<NewsAuthor author={comment.author} />
									<NewsDate date={comment.createdAt} className='shrink-0 text-xs' />
									{canDelete && (
										<Button type='button' variant='ghost' size='icon' className='ml-auto h-8 w-8 text-muted-foreground hover:text-foreground' onClick={() => setPendingDelete(comment)} aria-label='Delete comment'>
											<Trash2 aria-hidden className='h-4 w-4' />
										</Button>
									)}
								</div>
								<p className='mt-2 whitespace-pre-wrap break-words pl-8 text-sm leading-relaxed text-neutral-200'>{comment.text}</p>
							</li>
						);
					})}
				</ol>
			)}

			{viewer ? (
				<form onSubmit={submit} className='mt-6 space-y-2'>
					<label htmlFor='news-comment' className='sr-only'>
						Write a comment
					</label>
					<TextareaAutosize
						id='news-comment'
						minRows={3}
						maxRows={12}
						value={text}
						onChange={(e) => setText(e.target.value)}
						placeholder='Write a comment'
						aria-invalid={tooLong || undefined}
						aria-describedby='news-comment-count'
						className='flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
					/>
					<div className='flex items-center justify-between gap-3'>
						<span id='news-comment-count' className={cn('font-mono text-xs tabular-nums', tooLong ? 'text-signal-live' : 'text-muted-foreground')}>
							{text.length}/{MAX_COMMENT}
						</span>
						<Button type='submit' size='sm' isLoading={isPosting} disabled={isPosting || !trimmed || tooLong}>
							Post comment
						</Button>
					</div>
				</form>
			) : (
				<div className='mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-4 py-3'>
					<p className='text-sm text-muted-foreground'>Join the conversation with your Tournler account.</p>
					<Link href='/sign-in' className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
						Sign in to comment
					</Link>
				</div>
			)}

			<Dialog open={!!pendingDelete} onOpenChange={(open) => !open && !isDeleting && setPendingDelete(null)}>
				<DialogContent className='sm:max-w-[420px]'>
					<DialogHeader>
						<DialogTitle>Delete this comment?</DialogTitle>
						<DialogDescription>It&apos;s removed for everyone. This can&apos;t be undone.</DialogDescription>
					</DialogHeader>
					<DialogFooter className='flex justify-end gap-2'>
						<Button variant='outline' onClick={() => setPendingDelete(null)} disabled={isDeleting}>
							Cancel
						</Button>
						<Button variant='destructive' onClick={confirmDelete} isLoading={isDeleting}>
							Delete comment
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</section>
	);
}
