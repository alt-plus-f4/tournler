'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowBigDown, ArrowBigUp } from 'lucide-react';
import { useToast } from '@/lib/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatScore, nextVote, voteDelta, type VoteValue } from './forum-votes';

interface VoteControlProps {
	/** POST endpoint, e.g. /api/forum/threads/12/vote. */
	endpoint: string;
	score: number;
	myVote: VoteValue;
	orientation: 'vertical' | 'horizontal';
	/** What is being voted on, for screen readers ("this thread", "reply #4"). */
	subject: string;
	/** Sign-in URL for signed-out viewers; when set, the arrows link there instead of voting. */
	signInHref?: string;
	className?: string;
}

// ≥40px hit targets on touch, tighter on desktop where the pointer is precise.
const ARROW = 'inline-flex h-10 w-10 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8 sm:w-8 [&_svg]:h-5 [&_svg]:w-5';

/**
 * Up/down vote readout. Votes aren't state in the On-Air sense, so it stays monochrome: the chosen
 * arrow fills with ink, the other stays an outline. Updates optimistically and rolls back on error.
 */
export function VoteControl({ endpoint, score: initialScore, myVote: initialVote, orientation, subject, signInHref, className }: VoteControlProps) {
	const [state, setState] = useState({ score: initialScore, myVote: initialVote });
	const pending = useRef(false);
	const { toast } = useToast();

	// A router.refresh() (e.g. after posting a reply) brings fresh server values; adopt them when idle.
	useEffect(() => {
		if (!pending.current) setState({ score: initialScore, myVote: initialVote });
	}, [initialScore, initialVote]);

	const vote = async (clicked: 1 | -1) => {
		if (pending.current) return;
		const previous = state;
		const value = nextVote(previous.myVote, clicked);
		pending.current = true;
		setState({ score: previous.score + voteDelta(previous.myVote, value), myVote: value });
		try {
			const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value }) });
			const data = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(data.error || 'Your vote wasn’t saved. Try again.');
			setState({ score: data.score, myVote: data.myVote });
		} catch (e) {
			setState(previous);
			toast({ variant: 'destructive', title: e instanceof Error ? e.message : 'Your vote wasn’t saved. Try again.' });
		} finally {
			pending.current = false;
		}
	};

	const vertical = orientation === 'vertical';
	const scoreLabel = `Score ${formatScore(state.score).replace('−', 'minus ')}`;

	const arrow = (direction: 1 | -1) => {
		const Icon = direction === 1 ? ArrowBigUp : ArrowBigDown;
		const label = direction === 1 ? 'Upvote' : 'Downvote';
		const pressed = state.myVote === direction;
		if (signInHref) {
			return (
				<Link href={signInHref} className={ARROW} aria-label={`Sign in to vote on ${subject}`} title='Sign in to vote'>
					<Icon aria-hidden strokeWidth={1.75} />
				</Link>
			);
		}
		return (
			<button type='button' onClick={() => vote(direction)} aria-pressed={pressed} aria-label={`${label} ${subject}`} title={label} className={cn(ARROW, pressed && 'text-foreground')}>
				<Icon aria-hidden strokeWidth={1.75} className={cn(pressed && 'fill-current')} />
			</button>
		);
	};

	return (
		<div role='group' aria-label={`Votes for ${subject}`} className={cn('inline-flex items-center', vertical ? 'flex-col' : 'flex-row gap-0.5', className)}>
			{arrow(1)}
			<span aria-live='polite' aria-atomic='true' className={cn('min-w-[2ch] text-center font-mono text-sm tabular-nums', 'text-foreground', state.myVote !== 0 && 'font-bold')}>
				<span aria-hidden>{formatScore(state.score)}</span>
				<span className='sr-only'>{scoreLabel}</span>
			</span>
			{arrow(-1)}
		</div>
	);
}
