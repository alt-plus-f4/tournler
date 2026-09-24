'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { useClientSession } from '@/lib/hooks/use-client-session';
import { ShieldCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/lib/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AdminPanel, AdminQuickBar, useMatchAdmin } from './_components/admin';
import { RoomHeader } from './_components/header';
import { MapsTab, MatchInfoPanel, ResultPanel, ScoreboardTab, ServerPanel } from './_components/panels';
import { LobbyNameEditor, TeamColumn, type RosterPlayer } from './_components/roster';
import { SignalDot } from './_components/room-ui';
import { getSideLabels, getStatsBySide, getWinningSide, type DraftState, type Match, type Side, type VetoState } from './_components/types';
import { DraftPanel, getVetoTurn, VetoPanel } from './_components/veto-draft';

const fetcher = async (url: string) => {
	const response = await fetch(url);
	if (!response.ok) throw new Error('Failed to fetch match');
	const data = await response.json();
	return data.match as Match;
};

// Same key + response shape as UserNav's useSWR('/api/user'), so the room shares that cached request instead of refetching.
const userFetcher = async (url: string) => {
	const response = await fetch(url);
	if (!response.ok) throw new Error('Failed to fetch user');
	return response.json() as Promise<{ user?: { id?: string; role?: string } | null }>;
};

const jsonFetcher = async <T,>(url: string) => {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`Failed to fetch ${url}`);
	return response.json() as Promise<T>;
};

const TABS = ['overview', 'scoreboard', 'maps', 'admin'] as const;
type RoomTab = (typeof TABS)[number];

/** Tab lives in the URL hash (#scoreboard) so a refresh or a shared link lands on the same view. */
function useRoomTab() {
	const [tab, setTab] = useState<RoomTab>('overview');
	useEffect(() => {
		const sync = () => {
			const fromHash = window.location.hash.slice(1) as RoomTab;
			setTab(TABS.includes(fromHash) ? fromHash : 'overview');
		};
		sync();
		window.addEventListener('hashchange', sync);
		return () => window.removeEventListener('hashchange', sync);
	}, []);
	const select = useCallback((next: string) => {
		if (!TABS.includes(next as RoomTab)) return;
		setTab(next as RoomTab);
		window.history.replaceState(null, '', next === 'overview' ? window.location.pathname + window.location.search : `#${next}`);
	}, []);
	return [tab, select] as const;
}

const tabTriggerClass =
	'relative h-12 shrink-0 gap-2 rounded-none bg-transparent px-3 text-xs font-bold uppercase tracking-[0.08em] sm:px-4 sm:tracking-[0.12em] text-muted-foreground transition-colors duration-150 hover:text-white data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:origin-center after:scale-x-0 after:bg-white motion-safe:after:transition-transform motion-safe:after:duration-200 motion-safe:after:ease-out data-[state=active]:after:scale-x-100 focus-visible:ring-offset-0';

export default function MatchPage() {
	const params = useParams();
	const router = useRouter();
	const matchId = params.matchId as string;
	const [pendingSide, setPendingSide] = useState<string | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [tab, setTab] = useRoomTab();
	const { toast } = useToast();

	// A final match can't change on its own, so stop polling once it's COMPLETED.
	const { data: match, error, isLoading, mutate } = useSWR(matchId ? `/api/matches/${matchId}` : null, fetcher, { refreshInterval: (latest) => (latest?.status === 'COMPLETED' ? 0 : 4000) });
	const refresh = useCallback(() => {
		mutate();
	}, [mutate]);
	const admin = useMatchAdmin(matchId, refresh);

	const showDraft = !!match && match.isPickup && match.pickupMode === 'CAPTAIN_DRAFT' && match.status === 'SCHEDULED';
	const { data: draft, mutate: mutateDraft } = useSWR<DraftState>(showDraft ? `/api/matches/${matchId}/draft` : null, jsonFetcher, { refreshInterval: (latest) => (latest?.phase === 'COMPLETE' ? 0 : 3000) });
	// Veto can't start until the draft has put people on sides — otherwise maps get banned before anyone's rostered.
	const showVeto = !!match && match.status === 'SCHEDULED' && (draft ? draft.phase === 'COMPLETE' : match.isPickup || (match.teamA !== null && match.teamB !== null));
	const { data: veto, mutate: mutateVeto } = useSWR<VetoState>(showVeto ? `/api/matches/${matchId}/veto` : null, jsonFetcher, { refreshInterval: (latest) => (latest?.phase === 'COMPLETE' ? 0 : 3000) });

	// Only ask for the account when there is one: signed-out visitors got a 401 (console error) here.
	const { status: sessionStatus } = useClientSession();
	const { data: userData, error: userError } = useSWR(sessionStatus === 'authenticated' ? '/api/user' : null, userFetcher, { revalidateOnFocus: false });
	const userLoaded = sessionStatus === 'unauthenticated' || userData !== undefined || userError !== undefined;
	const canManage = userData?.user?.role === 'ADMIN' || userData?.user?.role === 'TOURNAMENT_ADMIN';
	const currentUserId = userData?.user?.id ?? null;

	useEffect(() => {
		if (error) toast({ variant: 'destructive', title: 'Error loading match' });
	}, [error, toast]);

	// Non-staff who land on #admin fall back to the room.
	useEffect(() => {
		if (userLoaded && tab === 'admin' && !canManage) setTab('overview');
	}, [userLoaded, tab, canManage, setTab]);

	const withPending = async (key: string, request: () => Promise<Response>, failTitle: string, after?: () => void) => {
		setPendingSide(key);
		try {
			const response = await request();
			const payload = await response.json().catch(() => null);
			if (!response.ok) throw new Error(payload?.error || failTitle);
			mutate();
			after?.();
		} catch (e) {
			console.error(failTitle, e);
			toast({ variant: 'destructive', title: failTitle, description: e instanceof Error ? e.message : undefined });
		} finally {
			setPendingSide(null);
		}
	};

	const joinSide = (side: Side) => withPending(side, () => fetch(`/api/matches/${matchId}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ side }) }), 'Could not join');
	// CAPTAIN_DRAFT pickups have no side at join time — the first 2 joiners become captains, everyone else lands in the pool.
	const joinDraftPool = () => withPending('POOL', () => fetch(`/api/matches/${matchId}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }), 'Could not join', () => mutateDraft());
	const leaveMatch = () => withPending('LEAVE', () => fetch(`/api/matches/${matchId}/join`, { method: 'DELETE' }), 'Could not leave match');

	const deleteMatch = async () => {
		// Confirmed in the Admin tab's dialog before this runs.
		setIsDeleting(true);
		try {
			const response = await fetch(`/api/matches/${matchId}`, { method: 'DELETE' });
			const payload = await response.json().catch(() => null);
			if (!response.ok) throw new Error(payload?.error || 'Failed to delete match');
			toast({ title: 'Match deleted' });
			router.push('/matches');
		} catch (e) {
			console.error('Failed to delete match', e);
			toast({ variant: 'destructive', title: 'Could not delete match', description: e instanceof Error ? e.message : undefined });
			setIsDeleting(false);
		}
	};

	if (isLoading) return <RoomSkeleton />;

	if (!match) {
		return (
			<div className='mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center'>
				<h1 className='text-2xl font-black uppercase tracking-wide text-white'>Match not found</h1>
				<p className='mt-2 text-sm text-muted-foreground'>This match doesn&apos;t exist, or it was deleted.</p>
				<Button asChild variant='outline' className='mt-6'>
					<Link href='/matches'>Browse matches</Link>
				</Button>
			</div>
		);
	}

	const { teamALabel, teamBLabel } = getSideLabels(match);
	const winningSide = getWinningSide(match);
	const statsBySide = getStatsBySide(match);
	const vetoComplete = !showVeto || veto?.phase === 'COMPLETE';
	const canJoinPickup = match.isPickup && match.status === 'SCHEDULED';
	const isDraftMode = match.pickupMode === 'CAPTAIN_DRAFT';
	const draftActive = showDraft && !!draft && draft.phase !== 'COMPLETE';

	// "Your turn" beacon on the Overview tab while the viewer is elsewhere in the room.
	const vetoNeedsMe = !!veto && veto.phase !== 'COMPLETE' && getVetoTurn(match, veto, currentUserId).isSideTurn;
	const draftNeedsMe = draftActive && !!draft && ((draft.currentTurnSide === 'TEAM_A' && draft.captainAUserId === currentUserId) || (draft.currentTurnSide === 'TEAM_B' && draft.captainBUserId === currentUserId));
	const needsMe = vetoNeedsMe || draftNeedsMe;

	const rosterFor = (side: Side): RosterPlayer[] => {
		if (match.isPickup) {
			// Participants arrive ordered by joinedAt, so an open pickup side's first entry is its captain.
			return match.participants
				.filter((p) => p.side === side)
				.map((p, i) => ({ id: p.user.id, name: p.user.name || 'Unknown player', image: p.user.image, faceitLevel: p.user.faceitLevel, verified: p.user.verified ?? null, isCaptain: p.isCaptain || (!isDraftMode && i === 0), isMe: p.user.id === currentUserId }));
		}
		const team = side === 'TEAM_A' ? match.teamA : match.teamB;
		return (team?.members ?? []).map((m) => ({ id: m.id, name: m.name || 'Unknown player', image: m.image, faceitLevel: m.faceitLevel, verified: m.verified ?? null, isCaptain: team?.capitanId === m.id, isMe: m.id === currentUserId }));
	};

	const column = (side: Side) => {
		const isA = side === 'TEAM_A';
		const team = isA ? match.teamA : match.teamB;
		const label = isA ? teamALabel : teamBLabel;
		const players = rosterFor(side);
		const firstJoiner = match.participants.find((p) => p.side === side);
		const canRename = canJoinPickup && firstJoiner?.userId === currentUserId;
		const alreadyIn = match.participants.some((p) => p.userId === currentUserId);
		return (
			<TeamColumn
				side={side}
				label={label}
				logo={match.isPickup ? null : team?.logo}
				players={players}
				stats={statsBySide[side]}
				result={winningSide ? (winningSide === side ? 'win' : 'loss') : null}
				meta={
					<span className='font-mono tabular-nums'>
						{players.length}/5 <span className='font-sans'>{match.isPickup ? 'players' : 'rostered'}</span>
					</span>
				}
				headerExtra={canRename ? <LobbyNameEditor matchId={matchId} side={side} name={(isA ? match.teamAName : match.teamBName) || ''} onRenamed={refresh} /> : undefined}
				emptySlot={() =>
					canJoinPickup && isDraftMode ? (
						<span className='text-muted-foreground'>Awaiting draft pick</span>
					) : canJoinPickup && currentUserId && !alreadyIn ? (
						<button type='button' onClick={() => joinSide(side)} disabled={pendingSide !== null} className='max-w-full truncate font-medium text-white underline-offset-4 hover:underline disabled:opacity-50'>
							{pendingSide === side ? 'Joining…' : `Join ${label}`}
						</button>
					) : (
						<span className='text-muted-foreground'>Open slot</span>
					)
				}
				playerAction={(player) =>
					player.isMe && canJoinPickup ? (
						<Button variant='ghost' size='sm' onClick={leaveMatch} disabled={pendingSide !== null} className='h-10 px-3 text-xs text-muted-foreground hover:text-white'>
							{pendingSide === 'LEAVE' ? 'Leaving…' : 'Leave'}
						</Button>
					) : null
				}
			/>
		);
	};

	const tabs = (
		<TabsList aria-label='Match room' className='-mb-px flex h-auto w-full justify-start gap-0 overflow-x-auto rounded-none bg-transparent p-0 [scrollbar-width:none]'>
			<TabsTrigger value='overview' className={tabTriggerClass}>
				Overview
				{needsMe && tab !== 'overview' && (
					<>
						<SignalDot tone='ready' pulse />
						<span className='sr-only'>(your turn)</span>
					</>
				)}
			</TabsTrigger>
			<TabsTrigger value='scoreboard' className={tabTriggerClass}>
				Scoreboard
			</TabsTrigger>
			<TabsTrigger value='maps' className={tabTriggerClass}>
				Maps
				{match.maps.length > 0 && <span className='font-mono text-xs font-normal text-muted-foreground'>{match.maps.length}</span>}
			</TabsTrigger>
			{canManage && (
				<TabsTrigger value='admin' className={cn(tabTriggerClass, 'ml-auto')}>
					<ShieldCheck className='h-3.5 w-3.5' aria-hidden /> Admin
				</TabsTrigger>
			)}
		</TabsList>
	);

	return (
		<Tabs value={tab} onValueChange={setTab} className='min-h-screen bg-black pb-16 text-white'>
			<RoomHeader match={match} quickBar={canManage ? <AdminQuickBar match={match} admin={admin} vetoComplete={vetoComplete} /> : undefined} tabs={tabs} />

			<div className='mx-auto max-w-7xl px-4 pt-6'>
				<TabsContent value='overview' className='mt-0'>
					<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)]'>
						<div className='order-2 lg:order-1'>{column('TEAM_A')}</div>
						<div className='order-1 space-y-4 md:col-span-2 lg:order-2 lg:col-span-1'>
							{/* Draft/veto load in a second request; reserve their space so the rosters below
							    (first on mobile) don't jump when they arrive (Lighthouse CLS 0.37). */}
							{showDraft && !draft && <Skeleton aria-hidden className='h-[420px] rounded-md bg-neutral-900' />}
							{!showDraft && showVeto && !veto && <Skeleton aria-hidden className='h-[611px] rounded-md bg-neutral-900 md:h-[480px] lg:h-[438px]' />}
							{showDraft && draft && (
								<DraftPanel
									matchId={matchId}
									match={match}
									draft={draft}
									currentUserId={currentUserId}
									canManage={canManage}
									canJoinPool={currentUserId !== null && !match.participants.some((p) => p.userId === currentUserId)}
									isJoiningPool={pendingSide === 'POOL'}
									onJoinPool={joinDraftPool}
									onDraftUpdated={(next) => {
										mutateDraft(next, false);
										if (next.phase === 'COMPLETE') mutate();
									}}
								/>
							)}
							{showVeto && veto && (
								<VetoPanel
									matchId={matchId}
									match={match}
									veto={veto}
									currentUserId={currentUserId}
									canManage={canManage}
									onVetoUpdated={(next) => {
										mutateVeto(next, false);
										if (next.phase === 'COMPLETE') mutate();
									}}
								/>
							)}
							{match.status === 'COMPLETED' ? <ResultPanel match={match} /> : !draftActive && <ServerPanel match={match} />}
							<MatchInfoPanel match={match} />
						</div>
						<div className='order-3'>{column('TEAM_B')}</div>
					</div>
				</TabsContent>

				<TabsContent value='scoreboard' className='mt-0'>
					<ScoreboardTab match={match} />
				</TabsContent>

				<TabsContent value='maps' className='mt-0'>
					<MapsTab match={match} onGoToVeto={showVeto ? () => setTab('overview') : undefined} />
				</TabsContent>

				{canManage && (
					<TabsContent value='admin' className='mt-0'>
						<AdminPanel key={match.status} match={match} admin={admin} vetoComplete={vetoComplete} isDeleting={isDeleting} onDelete={deleteMatch} />
					</TabsContent>
				)}
			</div>
		</Tabs>
	);
}

function RoomSkeleton() {
	return (
		<div className='min-h-screen bg-black' aria-busy='true' aria-label='Loading match'>
			<div className='border-b border-border'>
				<div className='mx-auto max-w-7xl px-4'>
					<Skeleton className='mt-5 h-5 w-64 bg-neutral-900' />
					<div className='grid grid-cols-[1fr_auto_1fr] items-center gap-10 py-12'>
						<div className='flex items-center justify-end gap-5'>
							<Skeleton className='hidden h-8 w-40 bg-neutral-900 sm:block' />
							<Skeleton className='h-20 w-20 bg-neutral-900' />
						</div>
						<Skeleton className='h-16 w-32 bg-neutral-900 sm:w-40' />
						<div className='flex items-center gap-5'>
							<Skeleton className='h-20 w-20 bg-neutral-900' />
							<Skeleton className='hidden h-8 w-40 bg-neutral-900 sm:block' />
						</div>
					</div>
					<div className='flex gap-6 pb-4'>
						{[80, 96, 56].map((w) => (
							<Skeleton key={w} className='h-4 bg-neutral-900' style={{ width: w }} />
						))}
					</div>
				</div>
			</div>
			<div className='mx-auto grid max-w-7xl gap-4 px-4 pt-6 lg:grid-cols-[1fr_1.2fr_1fr]'>
				<Skeleton className='h-[340px] bg-neutral-900' />
				<Skeleton className='h-[340px] bg-neutral-900' />
				<Skeleton className='h-[340px] bg-neutral-900' />
			</div>
		</div>
	);
}
