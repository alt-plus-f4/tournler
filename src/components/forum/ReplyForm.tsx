'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { BODY_MAX, replySchema } from './forum-shared';
import { CharCount, ForumTextarea } from './ForumFields';

interface ReplyFormProps {
	threadId: number;
	/** Answer this reply instead of the thread. */
	parentId?: number;
	/** Shown in the label of an inline reply box ("Reply to Dexter"). */
	parentLabel?: string;
	lockedForModerator?: boolean;
	/** Inline reply boxes close after posting or on Cancel. */
	onDone?: () => void;
}

export function ReplyForm({ threadId, parentId, parentLabel, lockedForModerator, onDone }: ReplyFormProps) {
	const [body, setBody] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	const router = useRouter();
	const uid = useId();
	const inline = parentId !== undefined;
	const ids = { body: `${uid}-body`, count: `${uid}-count`, hint: `${uid}-hint`, error: `${uid}-error` };

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		const parsed = replySchema.safeParse({ body, parentId });
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
			onDone?.();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Could not post the reply. Try again.');
		} finally {
			setPending(false);
		}
	};

	return (
		<form onSubmit={submit} noValidate className='space-y-2'>
			<div className='flex items-baseline justify-between gap-2'>
				<Label htmlFor={ids.body}>{inline ? `Reply to ${parentLabel ?? 'this reply'}` : 'Your reply'}</Label>
				<CharCount id={ids.count} length={body.trim().length} max={BODY_MAX} />
			</div>
			<ForumTextarea
				id={ids.body}
				value={body}
				onChange={(e) => setBody(e.target.value)}
				rows={inline ? 3 : 5}
				className={inline ? 'min-h-24' : undefined}
				aria-invalid={!!error}
				aria-describedby={`${ids.count} ${ids.hint}${error ? ` ${ids.error}` : ''}`}
				disabled={pending}
				autoFocus={inline}
				onKeyDown={(e) => {
					if (inline && e.key === 'Escape' && !pending) onDone?.();
				}}
			/>
			<p id={ids.hint} className='text-xs text-muted-foreground'>
				{lockedForModerator ? 'This thread is locked. You can still reply as a moderator. ' : ''}Plain text only; http(s) links become clickable.
			</p>
			{error && (
				<p id={ids.error} role='alert' className='text-sm text-signal-live'>
					{error}
				</p>
			)}
			<div className='flex flex-wrap gap-2'>
				<Button type='submit' size={inline ? 'sm' : 'default'} isLoading={pending}>
					Post reply
				</Button>
				{inline && (
					<Button type='button' variant='ghost' size='sm' onClick={onDone} disabled={pending}>
						Cancel
					</Button>
				)}
			</div>
		</form>
	);
}
