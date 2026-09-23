'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LevelBadge } from '@/components/LevelBadge';
import { useToast } from '@/lib/hooks/use-toast';
import { cn } from '@/lib/utils';
import { PlayerAvatar, TeamMark } from './room-ui';
import type { PlayerStatRow, Side } from './types';

export interface RosterPlayer {
	id: string;
	name: string;
	image: string | null;
	faceitLevel: number | null;
	isCaptain: boolean;
	isMe: boolean;
}

/**
 * One side of the room. Five rows, always: filled players first, then open slots, so both columns
 * line up row-for-row like a server scoreboard. K–D appears per player once the server reports stats.
 */
export function TeamColumn({
	side,
	label,
	logo,
	background,
	players,
	stats,
	result,
	meta,
	headerExtra,
	emptySlot,
	playerAction,
}: {
	side: Side;
	label: string;
	logo?: string | null;
	background?: string | null;
	players: RosterPlayer[];
	stats: PlayerStatRow[];
	result: 'win' | 'loss' | null;
	meta?: ReactNode;
	headerExtra?: ReactNode;
	emptySlot: (index: number) => ReactNode;
	playerAction?: (player: RosterPlayer) => ReactNode;
}) {
	const statsByUser = new Map(stats.map((s) => [s.userId, s]));
	const hasStats = stats.length > 0;
	const slots = Array.from({ length: 5 }, (_, i) => players[i] ?? null);

	return (
		<section aria-label={`${label} roster`} className={cn('rounded-md border border-border bg-neutral-950/90', result === 'loss' && 'bg-neutral-950/60')}>
			<header className='flex items-center gap-3 border-b border-border px-4 py-3'>
				<TeamMark logo={logo} name={label} background={background} size='sm' dim={result === 'loss'} />
				<div className='min-w-0 flex-1'>
					<h2 className={cn('truncate text-sm font-black uppercase tracking-wide', result === 'loss' ? 'text-neutral-400' : 'text-white')}>{label}</h2>
					<div className='text-xs text-muted-foreground'>{meta ?? (side === 'TEAM_A' ? 'Side A' : 'Side B')}</div>
				</div>
				{result === 'win' && <span className='rounded-sm bg-white px-1.5 py-0.5 text-[11px] font-black uppercase tracking-[0.12em] text-black'>Win</span>}
				{result === 'loss' && <span className='rounded-sm border border-border px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground'>Loss</span>}
			</header>
			{headerExtra && <div className='border-b border-border px-4 py-2'>{headerExtra}</div>}

			{hasStats && (
				<div className='flex items-center gap-3 px-4 pt-2 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground'>
					<span className='flex-1'>Player</span>
					<span className='w-14 text-right' title='Kills – Deaths'>
						K–D
					</span>
					<span className='w-6' aria-hidden />
				</div>
			)}

			<ul className='divide-y divide-border/60'>
				{slots.map((player, index) => {
					if (!player) {
						return (
							<li key={`empty-${index}`} className='flex h-14 items-center gap-3 px-4'>
								<span className='h-8 w-8 shrink-0 rounded-full border border-dashed border-neutral-700' aria-hidden />
								<div className='min-w-0 flex-1 text-sm'>{emptySlot(index)}</div>
							</li>
						);
					}
					const stat = statsByUser.get(player.id);
					return (
						<li key={player.id} className={cn('group flex h-14 items-center gap-3 px-4 transition-colors duration-150 hover:bg-white/[0.03]', player.isMe && 'bg-white/[0.04]')}>
							<PlayerAvatar src={player.image} name={player.name} size={32} />
							<div className='flex min-w-0 flex-1 items-center gap-1.5'>
								<Link href={`/profile/${player.id}`} className={cn('truncate text-sm font-medium underline-offset-4 hover:underline', result === 'loss' ? 'text-neutral-300' : 'text-white')}>
									{player.name}
								</Link>
								{player.isCaptain && (
									<span title='Captain' className='shrink-0 text-muted-foreground'>
										<Crown className='h-3.5 w-3.5' aria-hidden />
										<span className='sr-only'>Captain</span>
									</span>
								)}
								{player.isMe && <span className='shrink-0 text-xs text-muted-foreground'>you</span>}
							</div>
							{playerAction?.(player)}
							{hasStats && (
								<span className='w-14 text-right font-mono text-sm tabular-nums text-neutral-200'>
									{stat ? (
										<>
											{stat.kills}
											<span className='text-neutral-600'>–</span>
											{stat.deaths}
										</>
									) : (
										<span className='text-neutral-600'>—</span>
									)}
								</span>
							)}
							<span className='flex w-6 justify-end'>{player.faceitLevel !== null && <LevelBadge level={player.faceitLevel} size='sm' />}</span>
						</li>
					);
				})}
			</ul>
		</section>
	);
}

/** Lets a pickup side's captain (its first joiner) rename it from the default "Side A"/"Side B". */
export function LobbyNameEditor({ matchId, side, name, onRenamed }: { matchId: string; side: Side; name: string; onRenamed: () => void }) {
	const [isEditing, setIsEditing] = useState(false);
	const [value, setValue] = useState(name);
	const [isSaving, setIsSaving] = useState(false);
	const { toast } = useToast();

	if (!isEditing) {
		return (
			<button
				type='button'
				onClick={() => {
					setValue(name);
					setIsEditing(true);
				}}
				className='text-xs text-muted-foreground underline-offset-4 hover:text-white hover:underline'
			>
				Rename side
			</button>
		);
	}

	const save = async () => {
		const trimmed = value.trim();
		if (!trimmed) return;
		setIsSaving(true);
		try {
			const response = await fetch(`/api/matches/${matchId}/team-name`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ side, name: trimmed }),
			});
			const payload = await response.json().catch(() => null);
			if (!response.ok) throw new Error(payload?.error || 'Failed to rename');
			setIsEditing(false);
			onRenamed();
		} catch (error) {
			console.error('Failed to rename lobby side', error);
			toast({ variant: 'destructive', title: 'Could not rename', description: error instanceof Error ? error.message : undefined });
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<form
			className='flex items-center gap-2'
			onSubmit={(e) => {
				e.preventDefault();
				save();
			}}
		>
			<Input value={value} onChange={(e) => setValue(e.target.value)} maxLength={30} aria-label='Side name' className='h-8 min-w-0 flex-1 text-sm' autoFocus />
			<Button type='submit' size='sm' disabled={isSaving || !value.trim()} className='h-8'>
				Save
			</Button>
			<Button type='button' size='sm' variant='ghost' onClick={() => setIsEditing(false)} className='h-8'>
				Cancel
			</Button>
		</form>
	);
}
