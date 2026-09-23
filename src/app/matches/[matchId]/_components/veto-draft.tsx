'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import { Check, ShieldCheck, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ACTIVE_DUTY_MAPS, getMapDisplayName } from '@/lib/tournaments/maps';
import { PlayerAvatar, RoomPanel, SectionLabel, SignalDot, TeamMark } from './room-ui';
import type { DraftState, Match, Participant, VetoActionRow, VetoState } from './types';

/** Whose turn it is, and whether the viewer is on that side. Shared with the page so the Overview tab can flag "your turn". */
export function getVetoTurn(match: Match, veto: VetoState, currentUserId: string | null) {
	const teamALabel = match.teamAName || match.teamA?.name || 'Side A';
	const teamBLabel = match.teamBName || match.teamB?.name || 'Side B';
	const actingTeam = match.isPickup ? null : veto.currentTurnTeamId === match.teamA?.id ? match.teamA : veto.currentTurnTeamId === match.teamB?.id ? match.teamB : null;
	const actingSideLabel = match.isPickup ? (veto.currentTurnSide === 'TEAM_A' ? teamALabel : veto.currentTurnSide === 'TEAM_B' ? teamBLabel : null) : (actingTeam?.name ?? null);
	const isSideTurn = veto.phase !== 'COMPLETE' && (match.isPickup ? match.participants.some((p) => p.userId === currentUserId && p.side === veto.currentTurnSide) : (actingTeam?.members.some((member) => member.id === currentUserId) ?? false));
	const activeSide = veto.currentTurnSide ?? (actingTeam ? (actingTeam.id === match.teamA?.id ? 'TEAM_A' : 'TEAM_B') : null);
	return { teamALabel, teamBLabel, actingSideLabel, isSideTurn, activeSide };
}

function TurnLine({ actingAsAdmin, children }: { actingAsAdmin: boolean; children: ReactNode }) {
	return (
		<p className='flex items-center justify-center gap-1.5 text-center text-sm text-white'>
			{actingAsAdmin && <ShieldCheck className='h-4 w-4 text-muted-foreground' aria-hidden />}
			{children}
		</p>
	);
}

function SideTurnHeader({ labelA, labelB, markA, markB, activeSide, done, activeText }: { labelA: string; labelB: string; markA: ReactNode; markB: ReactNode; activeSide: 'TEAM_A' | 'TEAM_B' | null; done: boolean; activeText: string }) {
	const side = (key: 'TEAM_A' | 'TEAM_B', label: string, mark: ReactNode) => {
		const active = !done && activeSide === key;
		return (
			<div className={cn('flex min-w-0 flex-1 items-center gap-2.5 transition-opacity duration-200', key === 'TEAM_A' ? 'flex-row-reverse text-right' : 'text-left', active ? 'opacity-100' : 'opacity-50')}>
				{mark}
				<div className='min-w-0'>
					<p className='line-clamp-2 break-words text-sm font-black uppercase leading-tight tracking-wide text-white'>{label}</p>
					{active && (
						<span className={cn('inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-signal-ready-text', key === 'TEAM_A' && 'flex-row-reverse')}>
							<SignalDot tone='ready' pulse /> {activeText}
						</span>
					)}
				</div>
			</div>
		);
	};
	return (
		<div className='flex items-center gap-3'>
			{side('TEAM_A', labelA, markA)}
			<span className='shrink-0 font-mono text-xs text-muted-foreground'>vs</span>
			{side('TEAM_B', labelB, markB)}
		</div>
	);
}

export function VetoPanel({ matchId, match, veto, currentUserId, canManage, onVetoUpdated }: { matchId: string; match: Match; veto: VetoState; currentUserId: string | null; canManage: boolean; onVetoUpdated: (next: VetoState) => void }) {
	const [pendingMap, setPendingMap] = useState<string | null>(null);
	const { toast } = useToast();
	const { teamALabel, teamBLabel, actingSideLabel, isSideTurn, activeSide } = getVetoTurn(match, veto, currentUserId);
	// Admins/organizers can act for either side (matches the backend's check) — the "your turn"
	// copy is still written for the side that actually owns the step.
	const isMyTurn = isSideTurn || canManage;
	const actingAsAdmin = canManage && !isSideTurn;
	const isComplete = veto.phase === 'COMPLETE';

	const act = async (mapName: string) => {
		if (!veto.nextActionType || pendingMap) return;
		setPendingMap(mapName);
		try {
			const response = await fetch(`/api/matches/${matchId}/veto`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: veto.nextActionType, mapName }),
			});
			const payload = await response.json().catch(() => null);
			if (!response.ok) throw new Error(payload?.error || 'Failed to record veto action');
			onVetoUpdated(payload as VetoState);
		} catch (error) {
			console.error('Failed to record veto action', error);
			toast({ variant: 'destructive', title: 'Could not record action', description: error instanceof Error ? error.message : undefined });
		} finally {
			setPendingMap(null);
		}
	};

	const actorNameFor = (action: VetoActionRow) => {
		if (match.isPickup) return action.side === 'TEAM_A' ? teamALabel : action.side === 'TEAM_B' ? teamBLabel : 'System';
		if (action.teamId === match.teamA?.id) return match.teamA?.name ?? 'Team A';
		if (action.teamId === match.teamB?.id) return match.teamB?.name ?? 'Team B';
		return 'System';
	};

	const captainA = match.isPickup ? match.participants.find((p) => p.side === 'TEAM_A') : null;
	const captainB = match.isPickup ? match.participants.find((p) => p.side === 'TEAM_B') : null;

	// Sequence pips: one per BAN/PICK step (the DECIDER isn't a side's turn), filled as each lands.
	const banPickActions = veto.actions.filter((a) => a.action !== 'DECIDER');
	const sequenceSteps = Array.from({ length: veto.sequenceLength }, (_, i) => ({
		done: banPickActions[i],
		isCurrent: !isComplete && i === banPickActions.length,
	}));

	if (isComplete) {
		return (
			<RoomPanel label={`Maps locked · Best of ${veto.bestOf}`}>
				<ol className='space-y-2'>
					{veto.confirmedMaps.map((mapId, i) => {
						const map = ACTIVE_DUTY_MAPS.find((m) => m.id === mapId);
						const source = veto.actions.find((a) => a.mapName === mapId);
						return (
							<li key={mapId} className='relative flex h-14 items-center gap-3 overflow-hidden rounded-md border border-border px-3'>
								{map && <Image src={map.image} alt='' fill sizes='400px' className='object-cover opacity-30' />}
								<div className='absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent' />
								<span className='relative font-mono text-xs text-muted-foreground'>{i + 1}</span>
								<span className='relative flex-1 font-bold text-white'>{getMapDisplayName(mapId)}</span>
								<span className='relative text-xs text-neutral-300'>{source?.action === 'DECIDER' ? 'Decider' : source ? `${actorNameFor(source)} pick` : ''}</span>
							</li>
						);
					})}
				</ol>
				<VetoLog actions={veto.actions} actorNameFor={actorNameFor} className='mt-4' />
			</RoomPanel>
		);
	}

	return (
		<RoomPanel label={`Map veto · Best of ${veto.bestOf}`} bodyClassName='space-y-4'>
			<SideTurnHeader
				labelA={teamALabel}
				labelB={teamBLabel}
				markA={match.isPickup ? <PlayerAvatar src={captainA?.user.image ?? null} name={teamALabel} size={36} /> : <TeamMark logo={match.teamA?.logo} name={teamALabel} background={match.teamA?.background} size='sm' />}
				markB={match.isPickup ? <PlayerAvatar src={captainB?.user.image ?? null} name={teamBLabel} size={36} /> : <TeamMark logo={match.teamB?.logo} name={teamBLabel} background={match.teamB?.background} size='sm' />}
				activeSide={activeSide}
				done={isComplete}
				activeText='On the clock'
			/>

			<div className='flex items-center justify-center gap-1.5' role='img' aria-label={`Step ${Math.min(banPickActions.length + 1, veto.sequenceLength)} of ${veto.sequenceLength}`}>
				{sequenceSteps.map((step, i) => (
					<span key={i} className={cn('h-1.5 w-6 rounded-full transition-colors duration-200', step.done ? (step.done.action === 'BAN' ? 'bg-signal-live/70' : 'bg-signal-ready/70') : step.isCurrent ? 'bg-white' : 'bg-neutral-800')} />
				))}
			</div>

			<TurnLine actingAsAdmin={actingAsAdmin}>
				{actingAsAdmin
					? `Acting as admin: ${actingSideLabel ?? 'a side'} to ${veto.nextActionType?.toLowerCase()}`
					: isMyTurn
						? `Your ${match.isPickup ? 'side' : "team's"} turn — ${veto.nextActionType === 'PICK' ? 'pick' : 'ban'} a map`
						: `Waiting for ${actingSideLabel ?? 'the other side'} to ${veto.nextActionType?.toLowerCase() ?? 'act'}`}
			</TurnLine>

			<div className='grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3'>
				{ACTIVE_DUTY_MAPS.filter((map) => veto.mapPool.includes(map.id)).map((map) => {
					const acted = veto.actions.find((a) => a.mapName === map.id);
					const clickable = isMyTurn && !acted;
					let label = veto.nextActionType === 'PICK' ? 'Pick' : 'Ban';
					let tone = 'border-border';
					let overlay: ReactNode = null;
					if (acted?.action === 'BAN') {
						label = `Banned · ${actorNameFor(acted)}`;
						tone = 'border-signal-live/30 opacity-60';
						overlay = <X className='h-5 w-5 text-signal-live' strokeWidth={3} aria-hidden />;
					} else if (acted?.action === 'PICK') {
						label = `Picked · ${actorNameFor(acted)}`;
						tone = 'border-signal-ready/50';
						overlay = <Check className='h-5 w-5 text-signal-ready-text' strokeWidth={3} aria-hidden />;
					} else if (acted?.action === 'DECIDER') {
						label = 'Decider';
						tone = 'border-white';
						overlay = <Star className='h-5 w-5 text-white' strokeWidth={2.5} aria-hidden />;
					} else if (!clickable) {
						label = 'Available';
					}
					return (
						<button
							key={map.id}
							type='button'
							disabled={!clickable || pendingMap !== null}
							onClick={() => act(map.id)}
							aria-label={`${map.name}: ${acted ? label : clickable ? `${veto.nextActionType === 'PICK' ? 'pick' : 'ban'} this map` : 'available'}`}
							className={cn(
								'group relative aspect-[16/9] overflow-hidden rounded-md border text-left transition-[border-color,filter] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
								tone,
								clickable ? 'cursor-pointer hover:border-white' : 'cursor-default',
							)}
						>
							<Image src={map.image} alt='' fill sizes='(min-width: 1024px) 200px, 50vw' className={cn('object-cover transition-opacity duration-200', acted ? 'opacity-25 grayscale' : 'opacity-55 group-hover:opacity-80')} />
							<div className='absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent' />
							{overlay && <div className='pointer-events-none absolute right-1.5 top-1.5'>{overlay}</div>}
							<div className='absolute inset-x-0 bottom-0 p-2'>
								<p className='relative text-sm font-bold text-white'>{map.name}</p>
								<p className={cn('relative line-clamp-2 text-xs leading-snug', clickable ? 'text-white' : 'text-neutral-300')}>{pendingMap === map.id ? 'Submitting…' : label}</p>
							</div>
						</button>
					);
				})}
			</div>

			<VetoLog actions={veto.actions} actorNameFor={actorNameFor} />
		</RoomPanel>
	);
}

function VetoLog({ actions, actorNameFor, className }: { actions: VetoActionRow[]; actorNameFor: (a: VetoActionRow) => string; className?: string }) {
	if (actions.length === 0) return null;
	return (
		<ol className={cn('space-y-1 text-xs text-muted-foreground', className)}>
			{actions.map((a) => {
				const verb = a.action === 'BAN' ? 'banned' : a.action === 'PICK' ? 'picked' : 'left as decider';
				const Icon = a.action === 'BAN' ? X : a.action === 'PICK' ? Check : Star;
				return (
					<li key={a.order} className='flex items-center gap-1.5'>
						<Icon className={cn('h-3 w-3 shrink-0', a.action === 'BAN' ? 'text-signal-live' : a.action === 'PICK' ? 'text-signal-ready-text' : 'text-white')} aria-hidden />
						<span>
							<span className='text-neutral-300'>{actorNameFor(a)}</span> {verb} {getMapDisplayName(a.mapName)}
						</span>
					</li>
				);
			})}
		</ol>
	);
}

/**
 * Captain draft (see draft.ts): the first 2 joiners become captains, everyone after joins a shared
 * pool until picked. Sits in the room's action column while the draft is in progress.
 */
export function DraftPanel({
	matchId,
	match,
	draft,
	currentUserId,
	canManage,
	canJoinPool,
	isJoiningPool,
	onJoinPool,
	onDraftUpdated,
}: {
	matchId: string;
	match: Match;
	draft: DraftState;
	currentUserId: string | null;
	canManage: boolean;
	canJoinPool: boolean;
	isJoiningPool: boolean;
	onJoinPool: () => void;
	onDraftUpdated: (next: DraftState) => void;
}) {
	const [pendingUserId, setPendingUserId] = useState<string | null>(null);
	const { toast } = useToast();
	const teamALabel = match.teamAName || 'Side A';
	const teamBLabel = match.teamBName || 'Side B';
	const isComplete = draft.phase === 'COMPLETE';
	const isActingCaptain = (draft.currentTurnSide === 'TEAM_A' && draft.captainAUserId === currentUserId) || (draft.currentTurnSide === 'TEAM_B' && draft.captainBUserId === currentUserId);
	const isMyTurn = isActingCaptain || canManage;
	const actingAsAdmin = canManage && !isActingCaptain;

	const findParticipant = (userId: string | null) => match.participants.find((p) => p.userId === userId);
	const poolPlayers = draft.poolUserIds.map(findParticipant).filter((p): p is Participant => !!p);
	const captainA = findParticipant(draft.captainAUserId);
	const captainB = findParticipant(draft.captainBUserId);

	const pick = async (pickedUserId: string) => {
		if (!draft.currentTurnSide || pendingUserId) return;
		setPendingUserId(pickedUserId);
		try {
			const response = await fetch(`/api/matches/${matchId}/draft`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ pickedUserId }),
			});
			const payload = await response.json().catch(() => null);
			if (!response.ok) throw new Error(payload?.error || 'Failed to record pick');
			onDraftUpdated(payload as DraftState);
		} catch (error) {
			console.error('Failed to record draft pick', error);
			toast({ variant: 'destructive', title: 'Could not record pick', description: error instanceof Error ? error.message : undefined });
		} finally {
			setPendingUserId(null);
		}
	};

	const joinButton = canJoinPool && !isComplete && (
		<Button size='sm' onClick={onJoinPool} disabled={isJoiningPool} className='-my-1 h-10'>
			{isJoiningPool ? 'Joining…' : draft.captainAUserId && draft.captainBUserId ? 'Join pool' : 'Join lobby'}
		</Button>
	);

	if (draft.phase === 'NOT_STARTED' && (!draft.captainAUserId || !draft.captainBUserId)) {
		return (
			<RoomPanel label='Captain draft' action={joinButton}>
				<p className='text-sm text-muted-foreground'>The first two players to join become captains. The draft starts as soon as both are in.</p>
			</RoomPanel>
		);
	}

	return (
		<RoomPanel label={`Captain draft${isComplete ? ' · Complete' : ''}`} action={joinButton} bodyClassName='space-y-4'>
			<SideTurnHeader
				labelA={captainA?.user.name || 'Waiting…'}
				labelB={captainB?.user.name || 'Waiting…'}
				markA={<PlayerAvatar src={captainA?.user.image ?? null} name={captainA?.user.name || '?'} size={36} />}
				markB={<PlayerAvatar src={captainB?.user.image ?? null} name={captainB?.user.name || '?'} size={36} />}
				activeSide={draft.currentTurnSide}
				done={isComplete}
				activeText='Picking'
			/>
			<p className='-mt-2 flex justify-between text-xs text-muted-foreground'>
				<span>{teamALabel} captain</span>
				<span>{teamBLabel} captain</span>
			</p>

			{!isComplete && (
				<TurnLine actingAsAdmin={actingAsAdmin}>{actingAsAdmin ? 'Acting as admin: pick from the pool' : isMyTurn ? 'Your turn — pick a player' : `Waiting for ${draft.currentTurnSide === 'TEAM_A' ? teamALabel : teamBLabel} to pick`}</TurnLine>
			)}

			{poolPlayers.length > 0 && (
				<div>
					<SectionLabel className='mb-2'>
						Pool <span className='font-mono tabular-nums'>{poolPlayers.length}</span>
					</SectionLabel>
					<div className='grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-2'>
						{poolPlayers.map((p) => {
							const clickable = !isComplete && isMyTurn;
							return (
								<button
									key={p.userId}
									type='button'
									disabled={!clickable || pendingUserId !== null}
									onClick={() => pick(p.userId)}
									className={cn(
										'flex items-center gap-2 rounded-md border border-border p-2 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
										clickable ? 'hover:border-white hover:bg-neutral-900' : 'cursor-default opacity-70',
									)}
								>
									<PlayerAvatar src={p.user.image} name={p.user.name || 'P'} size={28} />
									<span className='truncate text-sm text-white'>{pendingUserId === p.userId ? 'Picking…' : p.user.name || 'Player'}</span>
								</button>
							);
						})}
					</div>
				</div>
			)}
		</RoomPanel>
	);
}
