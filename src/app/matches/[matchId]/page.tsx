'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { useToast } from '@/lib/hooks/use-toast';
import { Gamepad2, Trophy, Users, Clock, Target, Copy, ExternalLink, Hourglass } from 'lucide-react';

interface TeamMember {
	id: string;
	name: string | null;
	image: string | null;
	createdAt?: string;
}

interface Team {
	id: number;
	name: string;
	logo: string | null;
	background?: string | null;
	members: TeamMember[];
}

interface GameServer {
	id: number;
	matchId: number;
	connectIp: string;
	port: number;
	status: string;
	password?: string | null;
}

interface Match {
	id: number;
	tournament: {
		id: number;
		name: string;
		status: string;
	};
	teamA: Team | null;
	teamB: Team | null;
	scoreTeamA: number | null;
	scoreTeamB: number | null;
	winner: Team | null;
	matchDate: string;
	status: 'SCHEDULED' | 'LIVE' | 'COMPLETED';
	startedAt: string | null;
	completedAt: string | null;
	gameServer: GameServer | null;
}

const getMemberLevel = (member: TeamMember, index: number) => {
	if (member.createdAt) {
		const memberDays = Math.max(0, Math.floor((Date.now() - new Date(member.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
		return Math.floor(memberDays / 30) + 1;
	}

	// Fallback levels so the UI is testable when API data is incomplete.
	return 10 + index;
};

const fillTeamToFive = (members: TeamMember[]) => {
	const placeholdersNeeded = Math.max(0, 5 - members.length);
	const placeholders: TeamMember[] = Array.from({ length: placeholdersNeeded }, (_, i) => ({
		id: `placeholder-${i}`,
		name: 'Open Slot',
		image: null,
	}));

	return [...members, ...placeholders].slice(0, 5);
};

function TeamLogo({ logo, name }: { logo: string | null; name: string }) {
	const [failed, setFailed] = useState(false);

	if (!logo || failed) {
		return <span className='text-white font-black text-4xl'>{name.substring(0, 2).toUpperCase()}</span>;
	}

	// eslint-disable-next-line @next/next/no-img-element
	return <img src={logo} alt={name} loading='eager' className='w-[120px] h-[120px] object-contain' onError={() => setFailed(true)} />;
}

function formatDuration(ms: number) {
	const totalSeconds = Math.max(0, Math.floor(ms / 1000));
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	const pad = (n: number) => n.toString().padStart(2, '0');
	return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** Ticks once a second while `active`, forcing the caller to re-render (used to keep a live timer's displayed value current). */
function useTicker(active: boolean) {
	const [, setTick] = useState(0);
	useEffect(() => {
		if (!active) return;
		const id = setInterval(() => setTick((t) => t + 1), 1000);
		return () => clearInterval(id);
	}, [active]);
}

function MatchTimer({ match }: { match: Match }) {
	useTicker(match.status !== 'COMPLETED');

	if (match.status === 'SCHEDULED') {
		const msUntilStart = new Date(match.matchDate).getTime() - Date.now();
		if (msUntilStart <= 0) {
			return (
				<span className='inline-flex items-center gap-2 text-neutral-400 text-sm'>
					<Hourglass className='w-4 h-4' /> Waiting to start
				</span>
			);
		}
		return (
			<span className='inline-flex items-center gap-2 text-neutral-300 text-sm'>
				<Hourglass className='w-4 h-4' /> Starts in {formatDuration(msUntilStart)}
			</span>
		);
	}

	if (match.status === 'LIVE') {
		const elapsed = match.startedAt ? Date.now() - new Date(match.startedAt).getTime() : 0;
		return (
			<span className='inline-flex items-center gap-2 text-white text-sm font-bold'>
				<span className='w-2 h-2 rounded-full bg-red-500 animate-pulse' /> LIVE &middot; {formatDuration(elapsed)}
			</span>
		);
	}

	if (match.startedAt && match.completedAt) {
		const duration = new Date(match.completedAt).getTime() - new Date(match.startedAt).getTime();
		return <span className='text-neutral-400 text-sm'>Finished in {formatDuration(duration)}</span>;
	}

	return null;
}

const fetcher = async (url: string) => {
	const response = await fetch(url);
	if (!response.ok) throw new Error('Failed to fetch match');
	const data = await response.json();
	return data.match as Match;
};

export default function MatchPage() {
	const params = useParams();
	const matchId = params.matchId as string;
	const [copied, setCopied] = useState(false);
	const { toast } = useToast();

	const { data: match, error, isLoading } = useSWR(matchId ? `/api/matches/${matchId}` : null, fetcher, { refreshInterval: 4000 });

	useEffect(() => {
		if (error) {
			toast({ variant: 'destructive', title: 'Error loading match' });
		}
	}, [error, toast]);

	if (isLoading) {
		return (
			<div className='min-h-screen bg-black py-12'>
				<div className='max-w-7xl mx-auto px-4'>
					<Skeleton className='h-96 w-full bg-neutral-900 rounded-lg mb-6' />
					<Skeleton className='h-40 w-full bg-neutral-900 rounded-lg' />
				</div>
			</div>
		);
	}

	if (!match) {
		return (
			<div className='min-h-screen bg-black py-12 flex items-center justify-center'>
				<div className='text-center max-w-md'>
					<div className='w-16 h-16 rounded-full border-2 border-white mx-auto mb-6 flex items-center justify-center'>
						<Target className='w-8 h-8 text-white' />
					</div>
					<h2 className='text-3xl font-bold text-white mb-2'>Match Not Found</h2>
					<p className='text-neutral-400'>The match you're looking for doesn't exist.</p>
				</div>
			</div>
		);
	}

	const visibleTeamAMembers = match.teamA ? fillTeamToFive(match.teamA.members) : [];
	const visibleTeamBMembers = match.teamB ? fillTeamToFive(match.teamB.members) : [];
	const connectAddress = match.gameServer ? `${match.gameServer.connectIp}:${match.gameServer.port}` : null;
	const connectCommand = connectAddress ? `connect ${connectAddress}${match.gameServer?.password ? `; password ${match.gameServer.password}` : ''}` : null;
	const steamConnectUrl = connectCommand ? `steam://run/730//+${encodeURIComponent(connectCommand)}` : null;

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const launchCS2 = () => {
		if (steamConnectUrl) window.location.href = steamConnectUrl;
	};

	const statusConfig = {
		COMPLETED: { badge: 'COMPLETED', borderClass: 'border-white' },
		LIVE: { badge: 'LIVE', borderClass: 'border-white animate-pulse' },
		SCHEDULED: { badge: 'UPCOMING', borderClass: 'border-neutral-600' },
	};
	const status = statusConfig[match.status];

	return (
		<div className='min-h-screen bg-black text-white py-12'>
			<div className='max-w-7xl mx-auto px-4'>
				{/* Header Section */}
				<div className='mb-12'>
					<div className='flex items-start justify-between mb-8'>
						<div>
							<div className='flex items-center gap-3 mb-4'>
								<div className='w-1 h-8 bg-white'></div>
								<div>
									<p className='text-neutral-400 text-sm tracking-widest uppercase'>{match.tournament.name}</p>
									<h1 className='text-5xl font-black tracking-tight'>MATCH {match.id}</h1>
								</div>
							</div>
						</div>
						<Badge className={`${status.borderClass} bg-black border-2 text-white px-4 py-2 font-bold tracking-wider uppercase text-xs`}>{status.badge}</Badge>
					</div>

					{/* Match Date & Timer */}
					<div className='flex flex-wrap items-center gap-4 text-neutral-400'>
						<div className='flex items-center gap-2'>
							<Clock className='w-4 h-4' />
							<p className='text-sm'>{new Date(match.matchDate).toLocaleString()}</p>
						</div>
						<MatchTimer match={match} />
					</div>
				</div>

				{/* Main Match Arena */}
				<div className='bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden mb-12'>
					<div className='grid grid-cols-1 lg:grid-cols-3 divide-neutral-800 lg:divide-x'>
						{/* Team A */}
						<div className='p-8 lg:p-12 flex flex-col items-center justify-center border-b lg:border-b-0 border-neutral-800 group hover:bg-neutral-900 transition-colors'>
							{match.teamA ? (
								<>
									<div className='mb-6'>
										<div className='w-32 h-32 rounded-xl flex items-center justify-center overflow-hidden border-2 border-neutral-700 group-hover:border-white transition-colors' style={{ backgroundColor: match.teamA.background || '#000000' }}>
											<TeamLogo logo={match.teamA.logo} name={match.teamA.name} />
										</div>
									</div>
									<h2 className='text-2xl font-black text-white mb-6 text-center leading-tight uppercase tracking-wider'>{match.teamA.name}</h2>
									<div className='text-7xl font-black text-white'>{match.scoreTeamA ?? '-'}</div>
								</>
							) : (
								<div className='text-neutral-600 font-bold uppercase tracking-wider text-xl'>TBD</div>
							)}
						</div>

						{/* VS / Center */}
						<div className='p-8 lg:p-12 flex flex-col items-center justify-center border-b lg:border-b-0 border-neutral-800 bg-neutral-900/50'>
							<div className='text-center mb-8'>
								<div className='inline-flex items-center gap-4 mb-6'>
									<div className='w-12 h-px bg-neutral-700'></div>
									<p className='text-sm font-bold text-neutral-400 uppercase tracking-widest'>VS</p>
									<div className='w-12 h-px bg-neutral-700'></div>
								</div>
								<p className='text-neutral-500 text-sm'>{match.tournament.name}</p>
							</div>

							{match.gameServer && connectAddress ? (
								<div className='w-full border border-neutral-700 rounded-md p-4 mb-4 space-y-3'>
									<div className='text-left'>
										<p className='text-neutral-400 uppercase tracking-wide text-xs mb-2'>Connect IP</p>
										<div className='bg-black border border-neutral-700 rounded px-3 py-2 text-sm font-mono text-white break-all'>{connectAddress}</div>
									</div>
									{match.gameServer.password && (
										<div className='text-left'>
											<p className='text-neutral-400 uppercase tracking-wide text-xs mb-2'>Password</p>
											<div className='bg-black border border-neutral-700 rounded px-3 py-2 text-sm font-mono text-white break-all'>{match.gameServer.password}</div>
										</div>
									)}
									<div className='text-left'>
										<p className='text-neutral-400 uppercase tracking-wide text-xs mb-2'>Console Command</p>
										<div className='bg-black border border-neutral-700 rounded px-3 py-2 text-xs font-mono text-white break-all'>{connectCommand}</div>
									</div>
								</div>
							) : (
								<div className='w-full border border-dashed border-neutral-700 rounded-md p-4 mb-4 text-center'>
									<p className='text-sm text-neutral-500'>Server not yet provisioned</p>
								</div>
							)}

							<div className='grid grid-cols-1 sm:grid-cols-2 gap-2 w-full mb-4'>
								<Button disabled={!connectAddress} onClick={() => connectAddress && copyToClipboard(connectAddress)} className='bg-white text-black font-bold hover:bg-neutral-200 transition-colors w-full disabled:opacity-40'>
									<Copy className='h-4 w-4 mr-2' />
									{copied ? 'Copied!' : 'Copy IP'}
								</Button>
								<Button disabled={!connectCommand} onClick={() => connectCommand && copyToClipboard(connectCommand)} variant='outline' className='border-neutral-600 text-white hover:bg-neutral-800 w-full disabled:opacity-40'>
									<Gamepad2 className='h-4 w-4 mr-2' />
									Copy Command
								</Button>
							</div>

							<Button disabled={!steamConnectUrl} onClick={launchCS2} variant='outline' className='border-neutral-600 text-white hover:bg-neutral-800 transition-colors w-full mb-6 disabled:opacity-40'>
								<ExternalLink className='h-4 w-4 mr-2' />
								Launch CS2
							</Button>
						</div>

						{/* Team B */}
						<div className='p-8 lg:p-12 flex flex-col items-center justify-center group hover:bg-neutral-900 transition-colors'>
							{match.teamB ? (
								<>
									<div className='mb-6'>
										<div className='w-32 h-32 rounded-xl flex items-center justify-center overflow-hidden border-2 border-neutral-700 group-hover:border-white transition-colors' style={{ backgroundColor: match.teamB.background || '#000000' }}>
											<TeamLogo logo={match.teamB.logo} name={match.teamB.name} />
										</div>
									</div>
									<h2 className='text-2xl font-black text-white mb-6 text-center leading-tight uppercase tracking-wider'>{match.teamB.name}</h2>
									<div className='text-7xl font-black text-white'>{match.scoreTeamB ?? '-'}</div>
								</>
							) : (
								<div className='text-neutral-600 font-bold uppercase tracking-wider text-xl'>TBD</div>
							)}
						</div>
					</div>
				</div>

				{/* Teams Rosters */}
				<div className='grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12'>
					{/* Team A Roster */}
					<div className='bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden'>
						<div className='bg-black px-8 py-6 border-b border-neutral-800'>
							<div className='flex items-center gap-3 mb-1'>
								<Users className='w-5 h-5' />
								<h3 className='text-lg font-black uppercase tracking-wider'>{match.teamA?.name ?? 'TBD'}</h3>
							</div>
							<p className='text-neutral-500 text-sm'>Roster (5 players)</p>
						</div>
						<div className='divide-y divide-neutral-800 min-h-[360px]'>
							{visibleTeamAMembers.map((member, index) => {
								const isPlaceholder = member.id.startsWith('placeholder-');

								if (isPlaceholder) {
									return (
										<div key={member.id} className='px-8 py-5 flex items-center gap-4 opacity-70'>
											<span className='text-neutral-600 font-bold text-sm w-6'>{String(index + 1).padStart(2, '0')}</span>
											<div className='w-10 h-10 rounded-full border border-dashed border-neutral-700' />
											<span className='text-neutral-500 font-medium flex-1'>Open Slot</span>
											<Badge className='bg-transparent border border-neutral-700 text-neutral-500 text-xs'>LVL -</Badge>
										</div>
									);
								}

								return (
									<Link key={member.id} href={`/profile/${member.id}`} className='px-8 py-5 hover:bg-neutral-900 transition-colors flex items-center gap-4 group'>
										<span className='text-neutral-600 font-bold text-sm w-6'>{String(index + 1).padStart(2, '0')}</span>
										{member.image ? (
											<Image src={member.image} alt={member.name || 'Player'} width={40} height={40} className='rounded-full border border-neutral-700 group-hover:border-white transition-colors' />
										) : (
											<div className='w-10 h-10 rounded-full border border-neutral-700 flex items-center justify-center text-xs text-neutral-400'>{(member.name || 'P').charAt(0).toUpperCase()}</div>
										)}
										<span className='text-white font-medium flex-1'>{member.name || 'Unknown Player'}</span>
										<Badge className='bg-black border border-neutral-700 text-neutral-200 text-xs'>LVL {getMemberLevel(member, index)}</Badge>
									</Link>
								);
							})}
						</div>
					</div>

					{/* Team B Roster */}
					<div className='bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden'>
						<div className='bg-black px-8 py-6 border-b border-neutral-800'>
							<div className='flex items-center gap-3 mb-1'>
								<Users className='w-5 h-5' />
								<h3 className='text-lg font-black uppercase tracking-wider'>{match.teamB?.name ?? 'TBD'}</h3>
							</div>
							<p className='text-neutral-500 text-sm'>Roster (5 players)</p>
						</div>
						<div className='divide-y divide-neutral-800 min-h-[360px]'>
							{visibleTeamBMembers.map((member, index) => {
								const isPlaceholder = member.id.startsWith('placeholder-');

								if (isPlaceholder) {
									return (
										<div key={member.id} className='px-8 py-5 flex items-center gap-4 opacity-70'>
											<span className='text-neutral-600 font-bold text-sm w-6'>{String(index + 1).padStart(2, '0')}</span>
											<div className='w-10 h-10 rounded-full border border-dashed border-neutral-700' />
											<span className='text-neutral-500 font-medium flex-1'>Open Slot</span>
											<Badge className='bg-transparent border border-neutral-700 text-neutral-500 text-xs'>LVL -</Badge>
										</div>
									);
								}

								return (
									<Link key={member.id} href={`/profile/${member.id}`} className='px-8 py-5 hover:bg-neutral-900 transition-colors flex items-center gap-4 group'>
										<span className='text-neutral-600 font-bold text-sm w-6'>{String(index + 1).padStart(2, '0')}</span>
										{member.image ? (
											<Image src={member.image} alt={member.name || 'Player'} width={40} height={40} className='rounded-full border border-neutral-700 group-hover:border-white transition-colors' />
										) : (
											<div className='w-10 h-10 rounded-full border border-neutral-700 flex items-center justify-center text-xs text-neutral-400'>{(member.name || 'P').charAt(0).toUpperCase()}</div>
										)}
										<span className='text-white font-medium flex-1'>{member.name || 'Unknown Player'}</span>
										<Badge className='bg-black border border-neutral-700 text-neutral-200 text-xs'>LVL {getMemberLevel(member, index)}</Badge>
									</Link>
								);
							})}
						</div>
					</div>
				</div>

				{/* Winner Card */}
				{match.status === 'COMPLETED' && match.winner && (
					<div className='bg-black border-2 border-white rounded-lg overflow-hidden mb-12'>
						<div className='px-8 py-12 text-center'>
							<div className='inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-6'>
								<Trophy className='w-8 h-8 text-black' />
							</div>
							<h2 className='text-4xl font-black uppercase tracking-wider mb-4'>{match.winner?.name} Wins!</h2>
							<div className='flex items-center justify-center gap-6'>
								<div className='text-center'>
									<p className='text-neutral-400 text-xs uppercase tracking-widest mb-1'>Final Score</p>
									<p className='text-3xl font-black'>
										{match.scoreTeamA} - {match.scoreTeamB}
									</p>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
