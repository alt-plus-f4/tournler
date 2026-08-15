'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { useToast } from '@/lib/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { FaDiscord, FaSteam } from 'react-icons/fa6';
import { ExternalLink, Pencil, User as UserIcon, Swords, Skull, Handshake, Percent, Trophy } from 'lucide-react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AvatarStep } from '@/components/onboarding/AvatarStep';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BadgeIcon } from '@/lib/badge-icons';

interface SteamData {
	steamId: string;
	createdAt: string;
}

interface ProfileBadge {
	awardedAt: string;
	badge: {
		id: number;
		name: string;
		description: string | null;
		icon: string;
		color: string;
		isOverlay: boolean;
	};
}

interface PublicProfileData {
	id: string;
	name: string;
	bio?: string;
	image?: string;
	steam?: SteamData | null;
	discord?: { discordId: string } | null;
	cs2Team?: { id: number; name: string; logo: string | null } | null;
	badges?: ProfileBadge[];
	createdAt: string;
}

interface PlayerCareerStats {
	kills: number;
	deaths: number;
	assists: number;
	matchesPlayed: number;
	kd: number;
	wins: number;
	losses: number;
	winRate: number;
}

interface PlayerRecentMatch {
	matchId: number;
	tournamentName: string;
	opponentName: string;
	result: 'W' | 'L';
	scoreFor: number | null;
	scoreAgainst: number | null;
	matchDate: string;
}

const HEXAGON_CLIP = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

function levelColor(level: number): string {
	if (level >= 20) return '#facc15'; // gold
	if (level >= 10) return '#a855f7'; // purple
	if (level >= 5) return '#3b82f6'; // blue
	return '#22c55e'; // green
}

function timeAgo(isoDate: string): string {
	const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
	if (seconds < 60) return 'just now';
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d ago`;
	return new Date(isoDate).toLocaleDateString();
}

export default function PublicProfilePage() {
	const { userId } = useParams();
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [notFound, setNotFound] = useState(false);
	const [profile, setProfile] = useState<PublicProfileData | null>(null);
	const [stats, setStats] = useState<PlayerCareerStats | null>(null);
	const [recentMatches, setRecentMatches] = useState<PlayerRecentMatch[]>([]);
	const [isEditing, setIsEditing] = useState(false);
	const [isAvatarEditing, setIsAvatarEditing] = useState(false);
	const [avatarLoaded, setAvatarLoaded] = useState(false);
	const [editName, setEditName] = useState('');
	const [editBio, setEditBio] = useState('');
	const { toast } = useToast();

	const fetchUserProfile = useCallback(async () => {
		setIsLoading(true);
		try {
			const response = await fetch(`/api/users/${userId}`);

			if (response.status === 404) {
				setNotFound(true);
				setIsLoading(false);
				return;
			}

			if (!response.ok) throw new Error('Failed to fetch user profile');

			const data = await response.json();
			const pub = data.user as PublicProfileData;
			setStats(data.stats ?? null);
			setRecentMatches(data.recentMatches ?? []);

			try {
				const meRes = await fetch('/api/user');
				if (meRes.ok) {
					const meJson = await meRes.json();
					const me = meJson.user;
					setCurrentUserId(me?.id || null);

					if (me?.id === pub.id) {
						pub.discord = me.discord ?? pub.discord ?? null;
						pub.steam = me.steam ?? pub.steam ?? null;
					}
				}
			} catch {
				// ignore; non-authenticated viewers are fine
			}

			setProfile(pub);
		} catch (error) {
			console.error('Error fetching profile:', error);
			toast({ variant: 'destructive', title: 'Error loading profile', description: 'Unable to load user profile' });
		} finally {
			setIsLoading(false);
		}
	}, [userId, toast]);

	useEffect(() => {
		if (userId && typeof userId === 'string') fetchUserProfile();
	}, [userId, fetchUserProfile]);

	useEffect(() => {
		setAvatarLoaded(false);
	}, [profile?.image]);

	if (notFound) {
		return (
			<div className='min-h-screen py-12 bg-black flex items-center justify-center'>
				<Card className='max-w-md mx-auto border-gray-800'>
					<CardContent className='p-8 text-center'>
						<UserIcon className='h-16 w-16 mx-auto mb-4 text-gray-500' />
						<h2 className='text-2xl font-bold text-white mb-2'>Profile Not Found</h2>
						<p className='text-gray-400'>The user you're looking for doesn't exist.</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4'>
				<div className='flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-black/90 px-6 py-5 text-white shadow-2xl backdrop-blur'>
					<div className='h-10 w-10 animate-spin rounded-full border-4 border-t-transparent border-white/70' />
					<span className='text-sm text-white/70'>Loading profile...</span>
				</div>
			</div>
		);
	}

	if (!profile) return null;

	const isOwner = currentUserId === profile.id;

	const memberDays = Math.max(0, Math.floor((Date.now() - new Date(profile.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
	const level = Math.floor(memberDays / 30) + (profile.steam ? 1 : 0);
	const xp = memberDays * 10;
	const xpForNext = (level + 1) * 300;
	const accentColor = levelColor(level);

	const startEdit = () => {
		setEditName(profile.name || '');
		setEditBio(profile.bio || '');
		setIsEditing(true);
	};

	const saveProfile = async () => {
		try {
			const res = await fetch('/api/profile', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: editName, bio: editBio }),
			});
			if (!res.ok) throw new Error('Failed to save');
			await fetchUserProfile();
			setIsEditing(false);
			toast({ title: 'Profile updated' });
		} catch (e) {
			console.error(e);
			toast({ variant: 'destructive', title: 'Failed to save profile' });
		}
	};

	const statTiles = [
		{ label: 'Kills', value: stats?.kills ?? 0, icon: Swords },
		{ label: 'Deaths', value: stats?.deaths ?? 0, icon: Skull },
		{ label: 'Assists', value: stats?.assists ?? 0, icon: Handshake },
		{ label: 'K/D', value: (stats?.kd ?? 0).toFixed(2), icon: Percent },
		{ label: 'Matches', value: stats?.matchesPlayed ?? 0, icon: Trophy },
		{ label: 'Win Rate', value: `${stats?.winRate ?? 0}%`, icon: Percent },
	];

	const summaryStats = stats ? [
		{ label: 'Win Rate', value: `${stats.winRate}%` },
		{ label: 'K/D', value: stats.kd.toFixed(2) },
		{ label: 'Matches', value: stats.matchesPlayed },
	] : [];

	const overlayBadges = (profile.badges ?? []).filter((b) => b.badge.isOverlay).slice(0, 2);
	const showcaseBadges = (profile.badges ?? []).filter((b) => !b.badge.isOverlay);

	return (
		<div className='min-h-screen py-8 sm:py-12 bg-black'>
			<div className='max-w-3xl mx-auto px-4'>
				{/* Hero */}
				<div className='relative rounded-2xl border border-white/10 bg-gradient-to-b from-neutral-900 to-black p-6 sm:p-10 overflow-hidden'>
					<div className='absolute inset-x-0 top-0 h-32 opacity-30 blur-3xl' style={{ background: `radial-gradient(circle at 50% 0%, ${accentColor}, transparent 70%)` }} />

					{isOwner && (
						<div className='absolute right-6 top-6 z-10'>
							{!isEditing ? (
								<Button variant='ghost' size='sm' onClick={startEdit} className='text-white bg-black/40 hover:bg-black/60 border border-white/10'>
									Edit
								</Button>
							) : (
								<div className='flex gap-2'>
									<Button variant='ghost' size='sm' onClick={() => setIsEditing(false)} className='text-red-400 bg-black/40 hover:bg-black/60 border border-white/10'>
										Cancel
									</Button>
									<Button variant='ghost' size='sm' onClick={saveProfile} className='text-green-400 bg-black/40 hover:bg-black/60 border border-white/10'>
										Save
									</Button>
								</div>
							)}
						</div>
					)}

					<div className='relative flex flex-col items-center text-center'>
						<div className='relative h-32 w-32'>
							{isOwner && isEditing ? (
								<button type='button' className='block rounded-full' onClick={() => setIsAvatarEditing(true)} aria-label='Edit profile picture'>
									<Image
										src={profile.image || '/placeholder.svg'}
										alt={`${profile.name}'s Profile`}
										width={128}
										height={128}
										priority
										className={`rounded-full w-32 h-32 border-4 shadow-lg transition-opacity object-cover ${avatarLoaded ? 'opacity-100' : 'opacity-0'}`}
										style={{ borderColor: `${accentColor}40` }}
										onLoadingComplete={() => setAvatarLoaded(true)}
									/>
								</button>
							) : (
								<Image
									src={profile.image || '/placeholder.svg'}
									alt={`${profile.name}'s Profile`}
									width={128}
									height={128}
									className={`rounded-full w-32 h-32 border-4 shadow-lg transition-opacity object-cover ${avatarLoaded ? 'opacity-100' : 'opacity-0'}`}
									style={{ borderColor: `${accentColor}40` }}
									onLoadingComplete={() => setAvatarLoaded(true)}
								/>
							)}
							{!avatarLoaded && <Skeleton className='absolute inset-0 h-32 w-32 rounded-full bg-gray-800' />}
							{isOwner && (
								<Button
									variant='ghost'
									size='icon'
									className='absolute -bottom-1 -right-1 h-8 w-8 rounded-full border border-gray-700 bg-black/80 text-white shadow-lg hover:bg-black z-20'
									onClick={() => setIsAvatarEditing(true)}
									aria-label='Change profile picture'
								>
									<Pencil className='h-4 w-4' />
								</Button>
							)}
							<div
								className='absolute -bottom-2 left-1/2 flex h-8 w-9 -translate-x-1/2 items-center justify-center text-xs font-black text-black'
								style={{ backgroundColor: accentColor, clipPath: HEXAGON_CLIP }}
								title={`Level ${level}`}
							>
								{level}
							</div>
							{overlayBadges.map(({ badge }, i) => (
								<span
									key={badge.id}
									title={badge.description ?? badge.name}
									className='absolute top-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-black shadow-md'
									style={{ backgroundColor: badge.color, right: `${-4 + i * 24}px`, zIndex: 10 - i }}
								>
									<BadgeIcon name={badge.icon} className='h-3.5 w-3.5 text-white' />
								</span>
							))}
						</div>

						{!isEditing ? (
							<h2 className='text-3xl font-bold mt-5 text-white'>{profile.name}</h2>
						) : (
							<div className='mt-5 w-full max-w-sm space-y-1'>
								<Label className='text-white text-left block'>Display Name</Label>
								<Input value={editName} onChange={(e) => setEditName(e.target.value)} className='bg-gray-800 border-gray-700 text-white' />
							</div>
						)}

						{showcaseBadges.length > 0 && (
							<div className='mt-4 w-full'>
								<div className='text-[10px] uppercase tracking-wide text-gray-500 mb-2'>Badges</div>
								<div className='flex flex-wrap justify-center gap-2'>
									{showcaseBadges.map(({ badge }) => (
										<span
											key={badge.id}
											title={badge.description ?? badge.name}
											className='flex h-8 w-8 items-center justify-center rounded-full border border-white/10'
											style={{ backgroundColor: `${badge.color}20` }}
										>
											<BadgeIcon name={badge.icon} className='h-4 w-4' style={{ color: badge.color }} />
										</span>
									))}
								</div>
							</div>
						)}

						{summaryStats.length > 0 && (
							<div className='mt-5 flex items-stretch justify-center divide-x divide-white/10 rounded-lg border border-white/10 bg-white/[0.03]'>
								{summaryStats.map((s) => (
									<div key={s.label} className='px-5 py-2 text-center'>
										<div className='text-lg font-bold text-white'>{s.value}</div>
										<div className='text-[10px] uppercase tracking-wide text-gray-500'>{s.label}</div>
									</div>
								))}
							</div>
						)}

						{!isEditing ? (
							profile.bio && <p className='text-gray-300 mt-3 max-w-md'>{profile.bio}</p>
						) : (
							<div className='mt-3 w-full max-w-sm space-y-1'>
								<Label className='text-white text-left block'>Bio</Label>
								<Input value={editBio} onChange={(e) => setEditBio(e.target.value)} className='bg-gray-800 border-gray-700 text-white' />
							</div>
						)}

						{isOwner && isEditing && (
							<Dialog open={isAvatarEditing} onOpenChange={setIsAvatarEditing}>
								<DialogContent className='max-w-none w-fit border-gray-800 bg-black text-white'>
									<DialogTitle className='text-white'>Change Avatar</DialogTitle>
									<AvatarStep
										loading={false}
										previousStep={() => setIsAvatarEditing(false)}
										nextStep={async (blob) => {
											try {
												const text = await blob.text();
												const res = await fetch('/api/user/avatar', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ avatar: text }) });
												if (res.ok) {
													toast({ title: 'Avatar updated' });
													await fetchUserProfile();
													setIsAvatarEditing(false);
												}
											} catch (e) {
												console.error(e);
												toast({ variant: 'destructive', title: 'Avatar upload failed' });
											}
										}}
									/>
								</DialogContent>
							</Dialog>
						)}

						<div className='text-xs text-gray-500 mt-4'>Member since {new Date(profile.createdAt).toLocaleDateString()}</div>

						<div className='mt-4 w-full max-w-xs'>
							<div className='w-full bg-gray-800 rounded-full h-2 overflow-hidden'>
								<div className='h-2 rounded-full' style={{ width: `${Math.min(100, (xp / xpForNext) * 100)}%`, backgroundColor: accentColor }} />
							</div>
							<div className='flex items-center justify-between text-xs text-gray-500 mt-1'>
								<span>{xp} XP</span>
								<span>{xpForNext} XP</span>
							</div>
						</div>
					</div>
				</div>

				{/* Tabs */}
				<Tabs defaultValue='overview' className='mt-8'>
					<TabsList className='grid grid-cols-2 w-full max-w-sm mx-auto h-auto rounded-none border-b border-white/10 bg-transparent p-0'>
						<TabsTrigger
							value='overview'
							className='rounded-none border-b-2 border-transparent bg-transparent pb-3 text-gray-400 data-[state=active]:border-current data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none'
						>
							Overview
						</TabsTrigger>
						<TabsTrigger
							value='statistics'
							className='rounded-none border-b-2 border-transparent bg-transparent pb-3 text-gray-400 data-[state=active]:border-current data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none'
						>
							Statistics
						</TabsTrigger>
					</TabsList>

					<TabsContent value='overview' className='mt-6 space-y-6'>
						{profile.cs2Team && (
							<Link href={`/teams/${profile.cs2Team.id}`} className='flex items-center gap-3 p-4 border border-gray-700 rounded-lg hover:bg-white/5 transition-colors'>
								{profile.cs2Team.logo ? (
									<Image src={profile.cs2Team.logo} alt={profile.cs2Team.name} width={40} height={40} className='rounded-md object-contain' />
								) : (
									<div className='w-10 h-10 rounded-md bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400'>{profile.cs2Team.name.substring(0, 2).toUpperCase()}</div>
								)}
								<div>
									<p className='text-xs text-gray-500 uppercase tracking-wide'>Team</p>
									<p className='font-medium text-white'>{profile.cs2Team.name}</p>
								</div>
							</Link>
						)}

						<div>
							<h3 className='text-lg font-semibold mb-4 text-white'>Connected Accounts</h3>
							<div className='space-y-3'>
								{profile.discord ? (
									<div className='flex items-center justify-between p-4 border border-gray-700 rounded-lg'>
										<div className='flex items-center gap-3'>
											<div className='w-10 h-10 bg-[#5865F2] rounded-full flex items-center justify-center'>
												<FaDiscord className='h-6 w-6 text-white' />
											</div>
											<div className='flex flex-col items-start'>
												<span className='font-medium text-white'>Discord</span>
												<a href={`https://discord.com/users/${profile.discord.discordId}`} target='_blank' rel='noreferrer' className='text-sm text-gray-400 hover:text-white'>
													ID: {profile.discord.discordId}
												</a>
											</div>
										</div>
										<div className='flex items-center gap-2'>
											<div className='h-2 w-2 bg-green-500 rounded-full'></div>
											<span className='text-xs text-green-400'>Connected</span>
										</div>
									</div>
								) : (
									<div className='flex items-center justify-between p-4 border border-gray-700 rounded-lg bg-gray-800/30'>
										<div className='flex items-center gap-3'>
											<div className='w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center'>
												<FaDiscord className='h-6 w-6 text-gray-400' />
											</div>
											<div className='flex flex-col items-start'>
												<span className='font-medium text-white'>Discord</span>
												<span className='text-sm text-gray-400'>{isOwner ? 'Not connected' : 'Not shown'}</span>
											</div>
										</div>
										{isOwner ? (
											<Button variant='outline' size='sm' onClick={() => (window.location.href = '/sign-in')}>
												Connect
											</Button>
										) : null}
									</div>
								)}

								{profile.steam ? (
									<div className='flex items-center justify-between p-4 border border-gray-700 rounded-lg bg-black/40'>
										<div className='flex items-center gap-3'>
											<div className='w-10 h-10 bg-[#1B2838] rounded-full flex items-center justify-center'>
												<FaSteam className='w-6 h-6 text-white' />
											</div>
											<div className='flex flex-col items-start'>
												<span className='font-medium text-white'>Steam</span>
												<a href={`https://steamcommunity.com/profiles/${profile.steam.steamId}`} target='_blank' rel='noopener noreferrer' className='text-sm text-gray-300 hover:text-white transition-colors flex items-center gap-1'>
													View Profile <ExternalLink className='h-3 w-3' />
												</a>
											</div>
										</div>
										<div className='flex items-center gap-2'>
											<div className='h-2 w-2 bg-green-500 rounded-full'></div>
											<span className='text-xs text-green-400'>Linked</span>
											{isOwner && (
												<Button
													variant='ghost'
													size='sm'
													className='text-red-400 ml-2'
													onClick={async () => {
														try {
															const del = await fetch('/api/user/steam', { method: 'DELETE' });
															if (del.ok) fetchUserProfile();
														} catch (e) {
															console.error('Failed to unlink Steam', e);
														}
													}}
												>
													Unlink
												</Button>
											)}
										</div>
									</div>
								) : (
									<div className='flex items-center justify-between p-4 border border-gray-700 rounded-lg bg-gray-800/30'>
										<div className='flex items-center gap-3'>
											<div className='w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center'>
												<FaSteam className='w-6 h-6 text-gray-400' />
											</div>
											<div className='flex flex-col items-start'>
												<span className='font-medium text-white'>Steam</span>
												<span className='text-sm text-gray-400'>Not linked</span>
											</div>
										</div>
										{isOwner ? (
											<div className='flex items-center gap-2'>
												<Button
													variant='outline'
													size='sm'
													className='border-gray-600 text-gray-300'
													onClick={async () => {
														try {
															const me = await fetch('/api/user');
															if (!me.ok) {
																try {
																	sessionStorage.setItem('preAuthPath', window.location.pathname + window.location.search);
																} catch (error) {
																	void error;
																}
																window.location.href = '/sign-in';
																return;
															}
															const response = await fetch('/api/auth/steam');
															if (!response.ok) {
																throw new Error('Failed to initiate Steam auth');
															}
															const data = await response.json();
															if (!data.url) {
																throw new Error('Missing Steam login URL');
															}
															window.location.href = data.url;
														} catch (e) {
															console.error('Failed to initiate Steam auth', e);
														}
													}}
												>
													Link Account
												</Button>
											</div>
										) : null}
									</div>
								)}
							</div>
						</div>
					</TabsContent>

					<TabsContent value='statistics' className='mt-6 space-y-8'>
						{!stats ? (
							<p className='text-center text-gray-500 py-12'>No CS2 match stats yet.</p>
						) : (
							<>
								<div className='grid grid-cols-3 sm:grid-cols-6 gap-3'>
									{statTiles.map((tile) => (
										<div key={tile.label} className='rounded-lg border border-gray-700 p-3 text-center'>
											<tile.icon className='h-4 w-4 mx-auto mb-1 text-gray-500' />
											<div className='text-xl font-bold text-white'>{tile.value}</div>
											<div className='text-[10px] uppercase tracking-wide text-gray-500'>{tile.label}</div>
										</div>
									))}
								</div>

								{recentMatches.length > 0 && (
									<div>
										<h3 className='text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3'>Recent Form</h3>
										<div className='flex gap-1.5'>
											{recentMatches.map((m) => (
												<Link
													key={m.matchId}
													href={`/matches/${m.matchId}`}
													title={`${m.result === 'W' ? 'Won' : 'Lost'} vs ${m.opponentName} (${m.scoreFor ?? '-'}-${m.scoreAgainst ?? '-'})`}
													className={`flex h-8 w-8 items-center justify-center rounded text-xs font-bold text-white transition-transform hover:scale-110 ${m.result === 'W' ? 'bg-green-600' : 'bg-red-600'}`}
												>
													{m.result}
												</Link>
											))}
										</div>
									</div>
								)}

								{recentMatches.length > 0 && (
									<div>
										<h3 className='text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3'>Match History</h3>
										<div className='space-y-2'>
											{recentMatches.map((m) => (
												<Link key={m.matchId} href={`/matches/${m.matchId}`} className='flex items-center justify-between p-3 border border-gray-800 rounded-lg hover:bg-white/5 transition-colors'>
													<div className='flex items-center gap-3 min-w-0'>
														<span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white ${m.result === 'W' ? 'bg-green-600' : 'bg-red-600'}`}>{m.result}</span>
														<div className='min-w-0'>
															<p className='text-white text-sm truncate'>vs {m.opponentName}</p>
															<p className='text-xs text-gray-500 truncate'>{m.tournamentName}</p>
														</div>
													</div>
													<div className='flex items-center gap-4 shrink-0'>
														<span className='text-sm font-mono text-gray-300'>
															{m.scoreFor ?? '-'}:{m.scoreAgainst ?? '-'}
														</span>
														<span className='text-xs text-gray-500 hidden sm:block'>{timeAgo(m.matchDate)}</span>
													</div>
												</Link>
											))}
										</div>
									</div>
								)}
							</>
						)}
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
