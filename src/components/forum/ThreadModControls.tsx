'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, LockOpen, Pin, PinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ThreadModControlsProps {
	threadId: number;
	title: string;
	isPinned: boolean;
	isLocked: boolean;
	/** `compact` renders icon-only buttons for dense admin tables. */
	compact?: boolean;
}

/** Pin/unpin and lock/unlock toggles. Only rendered for users with `forum:moderate`. */
export function ThreadModControls({ threadId, title, isPinned, isLocked, compact }: ThreadModControlsProps) {
	const [state, setState] = useState({ isPinned, isLocked });
	const [pending, setPending] = useState<'isPinned' | 'isLocked' | null>(null);
	const router = useRouter();
	const { toast } = useToast();

	const toggle = async (key: 'isPinned' | 'isLocked') => {
		const next = !state[key];
		setPending(key);
		try {
			const response = await fetch(`/api/forum/threads/${threadId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ [key]: next }),
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(data.error || 'Could not update the thread');
			setState({ isPinned: data.thread.isPinned, isLocked: data.thread.isLocked });
			toast({ title: key === 'isPinned' ? (next ? 'Thread pinned' : 'Thread unpinned') : next ? 'Thread locked' : 'Thread unlocked' });
			router.refresh();
		} catch (e) {
			toast({ variant: 'destructive', title: e instanceof Error ? e.message : 'Could not update the thread' });
		} finally {
			setPending(null);
		}
	};

	const pinLabel = state.isPinned ? 'Unpin' : 'Pin';
	const lockLabel = state.isLocked ? 'Unlock' : 'Lock';

	return (
		<div className='flex items-center gap-1.5'>
			<Button
				type='button'
				variant='outline'
				size={compact ? 'icon' : 'sm'}
				className={cn(compact && 'h-8 w-8', state.isPinned && 'bg-muted')}
				onClick={() => toggle('isPinned')}
				disabled={pending !== null}
				aria-label={compact ? `${pinLabel} “${title}”` : undefined}
				title={compact ? pinLabel : undefined}
			>
				{state.isPinned ? <PinOff aria-hidden /> : <Pin aria-hidden />}
				{!compact && pinLabel}
			</Button>
			<Button
				type='button'
				variant='outline'
				size={compact ? 'icon' : 'sm'}
				className={cn(compact && 'h-8 w-8', state.isLocked && 'bg-muted')}
				onClick={() => toggle('isLocked')}
				disabled={pending !== null}
				aria-label={compact ? `${lockLabel} “${title}”` : undefined}
				title={compact ? lockLabel : undefined}
			>
				{state.isLocked ? <LockOpen aria-hidden /> : <Lock aria-hidden />}
				{!compact && lockLabel}
			</Button>
		</div>
	);
}
