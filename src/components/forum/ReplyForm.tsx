'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { BODY_MAX, replySchema } from './forum-shared';
import { CharCount, ForumTextarea } from './ForumFields';

export function ReplyForm({ threadId, lockedForModerator }: { threadId: number; lockedForModerator?: boolean }) {
	const [body, setBody] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	const router = useRouter();

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		const parsed = replySchema.safeParse({ body });
		if (!parsed.success) {
			setError(parsed.error.flatten().fieldErrors.body?.[0] ?? 'Write something first');
			return;
		}
		setError(null);
		setPending(true);
		try {
			const response = await fetch(`/api/forum/threads/${threadId}/replies`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(parsed.data),
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(data.error || 'Could not post the reply. Try again.');
			setBody('');
			router.refresh();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Could not post the reply. Try again.');
		} finally {
			setPending(false);
		}
	};

	return (
		<form onSubmit={submit} noValidate className='space-y-2'>
			<div className='flex items-baseline justify-between gap-2'>
				<Label htmlFor='reply-body'>Your reply</Label>
				<CharCount id='reply-count' length={body.trim().length} max={BODY_MAX} />
			</div>
			<ForumTextarea id='reply-body' value={body} onChange={(e) => setBody(e.target.value)} rows={5} aria-invalid={!!error} aria-describedby='reply-count reply-hint' disabled={pending} />
			<p id='reply-hint' className='text-xs text-muted-foreground'>
				{lockedForModerator ? 'This thread is locked. You can still reply as a moderator. ' : ''}Plain text only; http(s) links become clickable.
			</p>
			{error && (
				<p role='alert' className='text-sm text-signal-live'>
					{error}
				</p>
			)}
			<Button type='submit' isLoading={pending}>
				Post reply
			</Button>
		</form>
	);
}
