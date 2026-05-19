'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { useToast } from '@/lib/hooks/use-toast';
import { Gamepad2, Trophy, Users, Clock, Target, Copy, ExternalLink } from 'lucide-react';

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
	teamA: Team;
	teamB: Team;
	scoreTeamA: number | null;
	scoreTeamB: number | null;
	winner: Team | null;
	matchDate: string;
	gameServer: GameServer | null;
}

const SAMPLE_GAME_SERVER: GameServer = {
	id: 0,
	matchId: 0,
	connectIp: '203.0.113.42',
	port: 27015,
	status: 'RUNNING',
	password: 'faceit123',
};

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
	return <img src={logo} alt={name} className='w-[120px] h-[120px] object-contain' onError={() => setFailed(true)} />;
}

export default function MatchPage() {
	const params = useParams();
	const matchId = params.matchId as string;
	const [match, setMatch] = useState<Match | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [copied, setCopied] = useState(false);
	const { toast } = useToast();

	useEffect(() => {
		const fetchMatch = async () => {
			try {
				const response = await fetch(`/api/matches/${matchId}`);
				if (!response.ok) throw new Error('Failed to fetch match');

				const data = await response.json();
				setMatch(data.match);
			} catch (error) {
				console.error('Error fetching match:', error);
				toast({
					variant: 'destructive',
					title: 'Error loading match',
				});
			} finally {
				setIsLoading(false);
			}
		};

		if (matchId) {
			fetchMatch();
		}
	}, [matchId, toast]);

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

	const hasWinner = match.winner !== null;
	const isMatchStarted = match.scoreTeamA !== null || match.scoreTeamB !== null;
	const visibleTeamAMembers = fillTeamToFive(match.teamA.members);
	const visibleTeamBMembers = fillTeamToFive(match.teamB.members);
	const serverInfo = match.gameServer ?? SAMPLE_GAME_SERVER;
	// const matchCounter = `${match.scoreTeamA ?? 0} : ${match.scoreTeamB ?? 0}`;
	const connectAddress = `${serverInfo.connectIp}:${serverInfo.port}`;
	const connectCommand = `connect ${connectAddress}${serverInfo.password ? `; password ${serverInfo.password}` : ''}`;
	const steamConnectUrl = `steam://run/730//+${encodeURIComponent(connectCommand)}`;

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const launchCS2 = () => {
		window.location.href = steamConnectUrl;
	};

	const statusConfig = {
		completed: { badge: 'COMPLETED', borderClass: 'border-white' },
		live: { badge: 'LIVE', borderClass: 'border-white animate-pulse' },
		upcoming: { badge: 'UPCOMING', borderClass: 'border-neutral-600' },
	};

	const statusKey = hasWinner ? 'completed' : isMatchStarted ? 'live' : 'upcoming';
	const status = statusConfig[statusKey as keyof typeof statusConfig];

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

					{/* Match Date */}
					<div className='flex items-center gap-2 text-neutral-400'>
						<Clock className='w-4 h-4' />
						<p className='text-sm'>{new Date(match.matchDate).toLocaleString()}</p>
					</div>
				</div>

				{/* Main Match Arena */}
				<div className='bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden mb-12'>
					<div className='grid grid-cols-1 lg:grid-cols-3 divide-neutral-800 lg:divide-x'>
						{/* Team A */}
						<div className='p-8 lg:p-12 flex flex-col items-center justify-center border-b lg:border-b-0 border-neutral-800 group hover:bg-neutral-900 transition-colors'>
							<div className='mb-6'>
								<div className='w-32 h-32 rounded-xl flex items-center justify-center overflow-hidden border-2 border-neutral-700 group-hover:border-white transition-colors' style={{ backgroundColor: match.teamA.background || '#000000' }}>
									<TeamLogo logo={match.teamA.logo} name={match.teamA.name} />
								</div>
							</div>
							<h2 className='text-2xl font-black text-white mb-6 text-center leading-tight uppercase tracking-wider'>{match.teamA.name}</h2>
							<div className='text-7xl font-black text-white'>{match.scoreTeamA ?? '-'}</div>
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

							<div className='w-full border border-neutral-700 rounded-md p-4 mb-4 space-y-3'>
								<div className='text-left'>
									<p className='text-neutral-400 uppercase tracking-wide text-xs mb-2'>Connect IP</p>
									<div className='bg-black border border-neutral-700 rounded px-3 py-2 text-sm font-mono text-white break-all'>{connectAddress}</div>
								</div>
								{serverInfo.password && (
									<div className='text-left'>
										<p className='text-neutral-400 uppercase tracking-wide text-xs mb-2'>Password</p>
										<div className='bg-black border border-neutral-700 rounded px-3 py-2 text-sm font-mono text-white break-all'>{serverInfo.password}</div>
									</div>
								)}
								<div className='text-left'>
									<p className='text-neutral-400 uppercase tracking-wide text-xs mb-2'>Console Command</p>
									<div className='bg-black border border-neutral-700 rounded px-3 py-2 text-xs font-mono text-white break-all'>{connectCommand}</div>
								</div>
								{!match.gameServer && <p className='text-xs text-neutral-500 text-center'>Using sample server data for testing</p>}
							</div>

							<div className='grid grid-cols-1 sm:grid-cols-2 gap-2 w-full mb-4'>
								<Button onClick={() => copyToClipboard(connectAddress)} className='bg-white text-black font-bold hover:bg-neutral-200 transition-colors w-full'>
									<Copy className='h-4 w-4 mr-2' />
									{copied ? 'Copied!' : 'Copy IP'}
								</Button>
								<Button onClick={() => copyToClipboard(connectCommand)} variant='outline' className='border-neutral-600 text-white hover:bg-neutral-800 w-full'>
									<Gamepad2 className='h-4 w-4 mr-2' />
									Copy Command
								</Button>
							</div>

							<Button onClick={launchCS2} variant='outline' className='border-neutral-600 text-white hover:bg-neutral-800 transition-colors w-full mb-6'>
								<ExternalLink className='h-4 w-4 mr-2' />
								Launch CS2
							</Button>
						</div>

						{/* Team B */}
						<div className='p-8 lg:p-12 flex flex-col items-center justify-center group hover:bg-neutral-900 transition-colors'>
							<div className='mb-6'>
								<div className='w-32 h-32 rounded-xl flex items-center justify-center overflow-hidden border-2 border-neutral-700 group-hover:border-white transition-colors' style={{ backgroundColor: match.teamB.background || '#000000' }}>
									<TeamLogo logo={match.teamB.logo} name={match.teamB.name} />
								</div>
							</div>
							<h2 className='text-2xl font-black text-white mb-6 text-center leading-tight uppercase tracking-wider'>{match.teamB.name}</h2>
							<div className='text-7xl font-black text-white'>{match.scoreTeamB ?? '-'}</div>
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
								<h3 className='text-lg font-black uppercase tracking-wider'>{match.teamA.name}</h3>
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
								<h3 className='text-lg font-black uppercase tracking-wider'>{match.teamB.name}</h3>
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
				{hasWinner && (
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
