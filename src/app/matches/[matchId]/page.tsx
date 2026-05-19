'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { useToast } from '@/lib/hooks/use-toast';
import { Copy, Gamepad2, Trophy, Users } from 'lucide-react';

interface TeamMember {
	id: string;
	name: string | null;
	image: string | null;
}

interface Team {
	id: number;
	name: string;
	logo: string | null;
	members: TeamMember[];
}

interface GameServer {
	id: number;
	matchId: number;
	connectIp: string;
	port: number;
	status: string;
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
			<div className='min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 py-8'>
				<div className='max-w-6xl mx-auto'>
					<Skeleton className='h-96 w-full bg-gray-700 rounded-lg mb-6' />
					<Skeleton className='h-40 w-full bg-gray-700 rounded-lg' />
				</div>
			</div>
		);
	}

	if (!match) {
		return (
			<div className='min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 py-8 flex items-center justify-center'>
				<Card className='bg-gray-800 border-gray-700 max-w-md'>
					<CardContent className='p-8 text-center'>
						<h2 className='text-2xl font-bold text-white mb-2'>Match Not Found</h2>
						<p className='text-gray-400'>The match you're looking for doesn't exist.</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	const hasWinner = match.winner !== null;
	const isMatchStarted = match.scoreTeamA !== null || match.scoreTeamB !== null;

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className='min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 py-8'>
			<div className='max-w-6xl mx-auto px-4'>
				{/* Header */}
				<div className='mb-8'>
					<div className='flex items-center justify-between mb-4'>
						<div>
							<h1 className='text-4xl font-bold text-white'>Match</h1>
							<p className='text-gray-400 mt-2'>{match.tournament.name}</p>
						</div>
						<Badge variant='outline' className={`text-lg px-4 py-2 ${hasWinner ? 'bg-green-900 border-green-600 text-green-200' : 'bg-blue-900 border-blue-600 text-blue-200'}`}>
							{hasWinner ? 'Completed' : isMatchStarted ? 'Live' : 'Upcoming'}
						</Badge>
					</div>
				</div>

				{/* Main Match Card */}
				<Card className='bg-gray-800 border-gray-700 mb-8'>
					<CardContent className='p-8'>
						<div className='grid grid-cols-1 lg:grid-cols-3 gap-8 items-center'>
							{/* Team A */}
							<div className='text-center'>
								<div className='mb-4'>
									<div className='w-20 h-20 mx-auto rounded-lg flex items-center justify-center overflow-hidden' style={{ backgroundColor: match.teamA.background || '#000000' }}>
										{match.teamA.logo ? (
											<Image src={match.teamA.logo} alt={match.teamA.name} width={80} height={80} className='mx-auto object-contain' />
										) : (
											<span className='text-white font-bold text-lg'>{match.teamA.name.substring(0, 2).toUpperCase()}</span>
										)}
									</div>
								</div>
								<h2 className='text-2xl font-bold text-white mb-2'>{match.teamA.name}</h2>
								<div className='text-5xl font-bold text-blue-400 mb-4'>{match.scoreTeamA ?? '-'}</div>
							</div>

							{/* VS */}
							<div className='flex flex-col items-center justify-center'>
								<div className='text-2xl font-bold text-gray-500 mb-4'>VS</div>
								{match.gameServer && (
									<Button onClick={() => copyToClipboard(`${match.gameServer!.connectIp}:${match.gameServer!.port}`)} className='gap-2 bg-orange-600 hover:bg-orange-700 mb-4'>
										<Gamepad2 className='h-4 w-4' />
										{copied ? 'Copied!' : 'Connect'}
									</Button>
								)}
								<div className='text-sm text-gray-400'>{new Date(match.matchDate).toLocaleString()}</div>
							</div>

							{/* Team B */}
							<div className='text-center'>
								<div className='mb-4'>
									<div className='w-20 h-20 mx-auto rounded-lg flex items-center justify-center overflow-hidden' style={{ backgroundColor: match.teamB.background || '#000000' }}>
										{match.teamB.logo ? (
											<Image src={match.teamB.logo} alt={match.teamB.name} width={80} height={80} className='mx-auto object-contain' />
										) : (
											<span className='text-white font-bold text-lg'>{match.teamB.name.substring(0, 2).toUpperCase()}</span>
										)}
									</div>
								</div>
								<h2 className='text-2xl font-bold text-white mb-2'>{match.teamB.name}</h2>
								<div className='text-5xl font-bold text-red-400 mb-4'>{match.scoreTeamB ?? '-'}</div>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Game Server Info */}
				{match.gameServer && (
					<Card className='bg-gray-800 border-gray-700 mb-8'>
						<CardHeader>
							<CardTitle className='flex items-center gap-2 text-white'>
								<Gamepad2 className='h-5 w-5' />
								Server Information
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
								<div>
									<label className='text-gray-400 text-sm'>IP Address</label>
									<div className='flex items-center gap-2 mt-1'>
										<code className='bg-gray-900 text-white px-3 py-2 rounded flex-1 font-mono'>
											{match.gameServer?.connectIp}:{match.gameServer?.port}
										</code>
										<Button size='sm' variant='ghost' onClick={() => copyToClipboard(`${match.gameServer!.connectIp}:${match.gameServer!.port}`)}>
											<Copy className='h-4 w-4' />
										</Button>
									</div>
								</div>
								<div>
									<label className='text-gray-400 text-sm'>Status</label>
									<div className='mt-1'>
										<Badge className={`${match.gameServer?.status === 'RUNNING' ? 'bg-green-600' : match.gameServer?.status === 'COMPLETED' ? 'bg-gray-600' : 'bg-yellow-600'}`}>{match.gameServer?.status}</Badge>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				)}

				{/* Teams Details */}
				<div className='grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8'>
					{/* Team A Details */}
					<Card className='bg-gray-800 border-gray-700'>
						<CardHeader>
							<CardTitle className='flex items-center gap-2 text-white'>
								<Users className='h-5 w-5' />
								{match.teamA.name} Players
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='space-y-3'>
								{match.teamA.members.map((member) => (
									<div key={member.id} className='flex items-center gap-3 p-3 bg-gray-700 rounded'>
										{member.image && <Image src={member.image} alt={member.name || 'Player'} width={40} height={40} className='rounded-full' />}
										<span className='text-white flex-1'>{member.name || 'Unknown'}</span>
									</div>
								))}
							</div>
						</CardContent>
					</Card>

					{/* Team B Details */}
					<Card className='bg-gray-800 border-gray-700'>
						<CardHeader>
							<CardTitle className='flex items-center gap-2 text-white'>
								<Users className='h-5 w-5' />
								{match.teamB.name} Players
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='space-y-3'>
								{match.teamB.members.map((member) => (
									<div key={member.id} className='flex items-center gap-3 p-3 bg-gray-700 rounded'>
										{member.image && <Image src={member.image} alt={member.name || 'Player'} width={40} height={40} className='rounded-full' />}
										<span className='text-white flex-1'>{member.name || 'Unknown'}</span>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Winner Card */}
				{hasWinner && (
					<Card className='bg-gradient-to-r from-yellow-900 to-yellow-800 border-yellow-600'>
						<CardContent className='p-8 text-center'>
							<Trophy className='h-12 w-12 text-yellow-400 mx-auto mb-4' />
							<h3 className='text-2xl font-bold text-white mb-2'>{match.winner?.name} Wins!</h3>
							<p className='text-yellow-200'>
								Final Score: {match.scoreTeamA} - {match.scoreTeamB}
							</p>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
