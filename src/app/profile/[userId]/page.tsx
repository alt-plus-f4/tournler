'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { useToast } from '@/lib/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { FaDiscord, FaSteam } from 'react-icons/fa6';
import { ExternalLink, User as UserIcon, Trophy } from 'lucide-react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AvatarStep } from '@/components/onboarding/AvatarStep';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { BadgeIcon } from '@/lib/badge-icons';
import { LevelBadge, levelColor } from '@/components/LevelBadge';
import { faceitLevelProgress } from '@/lib/faceit';

interface SteamData {
	steamId: string;
	createdAt: string;
}

interface FaceitInfo {
	level: number;
	elo: number;
	faceitUrl: string | null;
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

function formatDate(isoDate: string): string {
	return new Date(isoDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function HeaderSkeleton() {
	return (
		<div className='min-h-screen py-8 sm:py-12 bg-black'>
			<div className='max-w-4xl mx-auto px-4 space-y-3'>
				<div className='flex items-center gap-4 border border-border bg-neutral-950 p-5'>
					<Skeleton className='h-20 w-20 shrink-0 rounded-full bg-gray-800' />
					<div className='flex-1 space-y-2'>
						<Skeleton className='h-5 w-40 bg-gray-800' />
						<Skeleton className='h-3 w-28 bg-gray-800' />
					</div>
				</div>
				<Skeleton className='h-20 w-full bg-gray-900' />
				<Skeleton className='h-48 w-full bg-gray-900' />
			</div>
		</div>
	);
}

export default function PublicProfilePage() {
	const { userId } = useParams();
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [notFound, setNotFound] = useState(false);
	const [profile, setProfile] = useState<PublicProfileData | null>(null);
	const [faceit, setFaceit] = useState<FaceitInfo | null>(null);
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
			// Fire both requests immediately instead of chaining them, so the viewer-identity
			// lookup doesn't add its round-trip on top of the profile fetch.
			const [profileRes, meRes] = await Promise.all([fetch(`/api/users/${userId}`), fetch('/api/user').catch(() => null)]);

			if (profileRes.status === 404) {
				setNotFound(true);
				setIsLoading(false);
				return;
			}
			if (!profileRes.ok) throw new Error('Failed to fetch user profile');

			const data = await profileRes.json();
			const pub = data.user as PublicProfileData;
			setStats(data.stats ?? null);
			setRecentMatches(data.recentMatches ?? []);
			setFaceit(data.faceit ?? null);

			if (meRes?.ok) {
				const meJson = await meRes.json();
				const me = meJson.user;
				setCurrentUserId(me?.id || null);
				if (me?.id === pub.id) {
					pub.discord = me.discord ?? pub.discord ?? null;
					pub.steam = me.steam ?? pub.steam ?? null;
				}
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
				<Card className='max-w-md mx-auto border-border'>
					<CardContent className='p-8 text-center'>
						<UserIcon className='h-16 w-16 mx-auto mb-4 text-gray-500' />
						<h2 className='text-2xl font-bold text-white mb-2'>Profile Not Found</h2>
						<p className='text-gray-400'>The user you're looking for doesn't exist.</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (isLoading || !profile) return <HeaderSkeleton />;

	const isOwner = currentUserId === profile.id;

	// Real FACEIT CS2 level, looked up server-side by the player's linked Steam account (see
	// src/lib/faceit.ts) — not a homegrown activity metric. Null if Steam isn't linked, the
	// player has no FACEIT account for CS2, or FACEIT_API_KEY isn't configured.
	const accentColor = faceit ? levelColor(faceit.level) : '#FFFFFF';

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

	const statRows = [
		{ label: 'Matches', value: stats?.matchesPlayed ?? 0 },
		{ label: 'Wins', value: stats?.wins ?? 0 },
		{ label: 'Losses', value: stats?.losses ?? 0 },
		{ label: 'Win Rate', value: `${stats?.winRate ?? 0}%` },
		{ label: 'K/D', value: (stats?.kd ?? 0).toFixed(2) },
		{ label: 'Kills', value: stats?.kills ?? 0 },
		{ label: 'Deaths', value: stats?.deaths ?? 0 },
		{ label: 'Assists', value: stats?.assists ?? 0 },
	];

	const headlineStats = stats
		? [
				{ label: 'Win Rate', value: `${stats.winRate}%` },
				{ label: 'K/D', value: stats.kd.toFixed(2) },
				{ label: 'Matches', value: stats.matchesPlayed },
			]
		: [];

	const overlayBadges = (profile.badges ?? []).filter((b) => b.badge.isOverlay).slice(0, 2);
	const showcaseBadges = (profile.badges ?? []).filter((b) => !b.badge.isOverlay);
	const progress = faceit ? faceitLevelProgress(faceit.level, faceit.elo) : null;

	return (
		<div className='min-h-screen py-8 sm:py-12 bg-black'>
			<div className='max-w-4xl mx-auto px-4'>
				{/* Header bar: identity + headline stats. Top edge tinted to the FACEIT skill color, and
				    the nickname itself picks up that color — both mirror how FACEIT colors a profile by rank. */}
				<div className='border border-border bg-neutral-950'>
					{faceit && <div className='h-1' style={{ backgroundColor: accentColor }} />}
					<div className='flex flex-col sm:flex-row sm:items-stretch'>
					<div className='flex items-center gap-4 p-5 flex-1 min-w-0'>
						<div className='relative h-20 w-20 shrink-0'>
							{isOwner && isEditing ? (
								<button type='button' className='block rounded-full' onClick={() => setIsAvatarEditing(true)} aria-label='Edit profile picture'>
									<Image
										src={profile.image || '/placeholder.svg'}
										alt={`${profile.name}'s Profile`}
										width={80}
										height={80}
										priority
										className={`rounded-full w-20 h-20 border-2 border-border object-cover transition-opacity ${avatarLoaded ? 'opacity-100' : 'opacity-0'}`}
										onLoad={() => setAvatarLoaded(true)}
									/>
								</button>
							) : (
								<Image
									src={profile.image || '/placeholder.svg'}
									alt={`${profile.name}'s Profile`}
									width={80}
									height={80}
									priority
									className={`rounded-full w-20 h-20 border-2 border-border object-cover transition-opacity ${avatarLoaded ? 'opacity-100' : 'opacity-0'}`}
									onLoad={() => setAvatarLoaded(true)}
								/>
							)}
							{!avatarLoaded && <Skeleton className='absolute inset-0 h-20 w-20 rounded-full bg-gray-800' />}

							{faceit && (
								<div className='absolute -bottom-1 -right-1'>
									<LevelBadge level={faceit.level} size='lg' />
								</div>
							)}

							{overlayBadges.map(({ badge }, i) => (
								<span
									key={badge.id}
									title={badge.description ?? badge.name}
									className='absolute -left-1.5 flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-black'
									style={{ backgroundColor: badge.color, top: `${-2 + i * 22}px`, zIndex: 10 - i }}
								>
									<BadgeIcon name={badge.icon} className='h-4 w-4 text-white' />
								</span>
							))}
						</div>

						<div className='min-w-0 flex-1'>
							<div className='flex items-center gap-2.5 flex-wrap'>
								{!isEditing ? (
									// FACEIT colors the nickname itself by skill level rather than leaving it plain white.
									<h1 className='text-xl font-bold truncate' style={{ color: faceit ? accentColor : '#fff' }}>
										{profile.name}
									</h1>
								) : (
									<Input value={editName} onChange={(e) => setEditName(e.target.value)} className='bg-gray-800 border-border text-white h-8 max-w-xs' />
								)}
								{showcaseBadges.map(({ badge }) => (
									<span
										key={badge.id}
										title={badge.description ?? badge.name}
										className='flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-black'
										style={{ backgroundColor: badge.color }}
									>
										<BadgeIcon name={badge.icon} className='h-4 w-4 text-white' />
									</span>
								))}
							</div>

							{/* FACEIT level — real data from FACEIT's Data API (src/lib/faceit.ts), not a homegrown
							    activity metric. Elo bar shows progress through the current level's band. */}
							{faceit && (
								<div className='flex items-center gap-2 mt-1'>
									<LevelBadge level={faceit.level} size='sm' />
									<span className='text-xs font-semibold' style={{ color: accentColor }}>
										Level {faceit.level}
									</span>
									<span className='text-xs text-gray-500'>{faceit.elo.toLocaleString()} Elo</span>
									{progress && progress.ceiling !== null && (
										<div className='hidden items-center gap-1.5 sm:flex'>
											<div className='h-1 w-20 overflow-hidden rounded-full bg-gray-800'>
												<div className='h-full rounded-full' style={{ width: `${progress.percent}%`, backgroundColor: accentColor }} />
											</div>
											<span className='text-[10px] text-gray-600'>{(progress.ceiling - faceit.elo + 1).toLocaleString()} to Lvl {faceit.level + 1}</span>
										</div>
									)}
									{faceit.faceitUrl && (
										<a href={faceit.faceitUrl} target='_blank' rel='noopener noreferrer' className='text-gray-600 hover:text-white' title='View on FACEIT'>
											<ExternalLink className='h-3 w-3' />
										</a>
									)}
								</div>
							)}
							{!faceit && isOwner && !profile.steam && <p className='text-xs text-gray-500 mt-1'>Link your Steam account below to show your FACEIT level</p>}

							<p className='text-xs text-gray-500 mt-1'>Member since {formatDate(profile.createdAt)}</p>
							{!isEditing ? (
								profile.bio && <p className='text-sm text-gray-400 mt-1.5 truncate'>{profile.bio}</p>
							) : (
								<Input value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder='Bio' className='bg-gray-800 border-border text-white h-8 mt-1.5 max-w-sm' />
							)}
						</div>

						{isOwner &&
							(!isEditing ? (
								<Button variant='outline' size='sm' onClick={startEdit} className='border-border text-gray-300 hover:text-white shrink-0'>
									Edit
								</Button>
							) : (
								<div className='flex gap-2 shrink-0'>
									<Button variant='outline' size='sm' onClick={() => setIsEditing(false)} className='border-border text-red-400'>
										Cancel
									</Button>
									<Button size='sm' onClick={saveProfile} style={{ backgroundColor: accentColor }} className='text-black hover:opacity-90'>
										Save
									</Button>
								</div>
							))}
					</div>

					{headlineStats.length > 0 && (
						<div className='flex border-t border-border sm:border-t-0 sm:border-l divide-x divide-border'>
							{headlineStats.map((s) => (
								<div key={s.label} className='flex-1 px-5 py-3 text-center sm:min-w-[92px]'>
									<div className='text-lg font-bold' style={{ color: accentColor }}>
										{s.value}
									</div>
									<div className='text-[10px] uppercase tracking-widest text-gray-500 mt-0.5'>{s.label}</div>
								</div>
							))}
						</div>
					)}
					</div>
				</div>

				{isOwner && isEditing && (
					<Dialog open={isAvatarEditing} onOpenChange={setIsAvatarEditing}>
						<DialogContent className='max-w-none w-fit border-border bg-black text-white'>
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

				{/* Trophies — HLTV-style achievement cabinet: every earned (non-overlay) badge as its own
				    card (icon, name, date). Overlay badges (e.g. Verified) are status markers pinned to the
				    avatar, not achievements, so they're excluded here — same overlay/showcase split already
				    used for the avatar/name badges above. Sits right under the header since it's the first
				    thing a visitor should see. */}
				{showcaseBadges.length > 0 && (
					<div className='mt-8'>
						<h2 className='text-lg font-bold text-white mb-3 flex items-center gap-2'>
							<Trophy className='h-4 w-4 text-yellow-500' /> Trophies
						</h2>
						<div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3'>
							{[...showcaseBadges]
								.sort((a, b) => new Date(b.awardedAt).getTime() - new Date(a.awardedAt).getTime())
								.map(({ badge, awardedAt }) => (
									<div key={badge.id} className='border border-border bg-neutral-950 p-4 flex flex-col items-center text-center gap-2 hover:border-white/40 transition-colors'>
										<span className='flex h-12 w-12 items-center justify-center rounded-full ring-1 ring-white/10' style={{ backgroundColor: badge.color }}>
											<BadgeIcon name={badge.icon} className='h-6 w-6 text-white' />
										</span>
										<div className='min-w-0'>
											<p className='text-sm font-semibold text-white truncate'>{badge.name}</p>
											{badge.description && <p className='text-xs text-gray-500 mt-0.5 line-clamp-2'>{badge.description}</p>}
											<p className='text-[10px] text-gray-600 mt-1.5 uppercase tracking-wide'>{formatDate(awardedAt)}</p>
										</div>
									</div>
								))}
						</div>
					</div>
				)}

				{/* Statistics — sits directly below the player, not behind a tab */}
				<div className='mt-8'>
					<h2 className='text-lg font-bold text-white mb-3'>Statistics</h2>
					{!stats ? (
						<p className='text-center text-gray-500 py-10 border border-border'>No CS2 match stats yet.</p>
					) : (
						<div className='grid grid-cols-2 sm:grid-cols-4 border border-border divide-x divide-y divide-border sm:divide-y-0'>
							{statRows.map((row) => (
								<div key={row.label} className='p-4 text-center'>
									<div className='text-2xl font-bold text-white'>{row.value}</div>
									<div className='text-xs text-gray-500 mt-1'>{row.label}</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Match history — HLTV-style table, with recent-form squares folded into the header */}
				{recentMatches.length > 0 && (
					<div className='mt-8'>
						<div className='flex items-baseline justify-between mb-3'>
							<h2 className='text-lg font-bold text-white'>Match History</h2>
							<div className='flex gap-1'>
								{recentMatches.slice(0, 5).map((m) => (
									<Link
										key={m.matchId}
										href={`/matches/${m.matchId}`}
										title={`${m.result === 'W' ? 'Won' : 'Lost'} vs ${m.opponentName} (${m.scoreFor ?? '-'}-${m.scoreAgainst ?? '-'})`}
										className={`flex h-6 w-6 items-center justify-center text-[11px] font-bold text-white transition-opacity hover:opacity-80 ${m.result === 'W' ? 'bg-green-600' : 'bg-red-600'}`}
									>
										{m.result}
									</Link>
								))}
							</div>
						</div>
						<table className='w-full border border-border text-sm'>
							<thead>
								<tr className='border-b border-border text-left text-[10px] uppercase tracking-widest text-gray-500'>
									<th className='p-3 font-medium'>Result</th>
									<th className='p-3 font-medium'>Opponent</th>
									<th className='p-3 font-medium hidden sm:table-cell'>Tournament</th>
									<th className='p-3 font-medium text-center'>Score</th>
									<th className='p-3 font-medium text-right hidden sm:table-cell'>Date</th>
								</tr>
							</thead>
							<tbody>
								{recentMatches.map((m) => (
									<tr key={m.matchId} className='border-b border-border last:border-b-0 hover:bg-white/5'>
										<td className='p-3'>
											<Link href={`/matches/${m.matchId}`} className={`inline-flex h-6 w-6 items-center justify-center text-[10px] font-bold text-white ${m.result === 'W' ? 'bg-green-600' : 'bg-red-600'}`}>
												{m.result}
											</Link>
										</td>
										<td className='p-3'>
											<Link href={`/matches/${m.matchId}`} className='text-white hover:underline'>
												{m.opponentName}
											</Link>
										</td>
										<td className='p-3 text-gray-500 hidden sm:table-cell truncate max-w-[220px]'>{m.tournamentName}</td>
										<td className='p-3 text-center font-mono text-gray-300'>
											{m.scoreFor ?? '-'}:{m.scoreAgainst ?? '-'}
										</td>
										<td className='p-3 text-right text-gray-500 hidden sm:table-cell'>{formatDate(m.matchDate)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				{/* Team & connected accounts */}
				<div className='mt-8'>
					<h2 className='text-lg font-bold text-white mb-3'>Team &amp; Accounts</h2>
					<div className='border border-border divide-y divide-border'>
						{profile.cs2Team && (
							<Link href={`/teams/${profile.cs2Team.id}`} className='flex items-center gap-3 p-4 hover:bg-white/5 transition-colors'>
								{profile.cs2Team.logo ? (
									<Image src={profile.cs2Team.logo} alt={profile.cs2Team.name} width={32} height={32} className='w-8 h-8 object-contain' />
								) : (
									<div className='w-8 h-8 bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400'>{profile.cs2Team.name.substring(0, 2).toUpperCase()}</div>
								)}
								<p className='font-medium text-white'>{profile.cs2Team.name}</p>
							</Link>
						)}

						<div className='flex items-center justify-between p-4'>
							<div className='flex items-center gap-3'>
								<div className={`w-9 h-9 rounded-full flex items-center justify-center ${profile.discord ? 'bg-[#5865F2]' : 'bg-gray-800'}`}>
									<FaDiscord className={`h-5 w-5 ${profile.discord ? 'text-white' : 'text-gray-500'}`} />
								</div>
								<div className='flex flex-col items-start'>
									<span className='font-medium text-white'>Discord</span>
									{profile.discord ? (
										<a href={`https://discord.com/users/${profile.discord.discordId}`} target='_blank' rel='noreferrer' className='text-xs text-gray-500 hover:text-white'>
											ID: {profile.discord.discordId}
										</a>
									) : (
										<span className='text-xs text-gray-500'>{isOwner ? 'Not connected' : 'Not shown'}</span>
									)}
								</div>
							</div>
							{isOwner && !profile.discord && (
								<Button variant='outline' size='sm' onClick={() => (window.location.href = '/sign-in')}>
									Connect
								</Button>
							)}
						</div>

						<div className='flex items-center justify-between p-4'>
							<div className='flex items-center gap-3'>
								<div className={`w-9 h-9 rounded-full flex items-center justify-center ${profile.steam ? 'bg-[#1B2838]' : 'bg-gray-800'}`}>
									<FaSteam className={`h-5 w-5 ${profile.steam ? 'text-white' : 'text-gray-500'}`} />
								</div>
								<div className='flex flex-col items-start'>
									<span className='font-medium text-white'>Steam</span>
									{profile.steam ? (
										<a
											href={`https://steamcommunity.com/profiles/${profile.steam.steamId}`}
											target='_blank'
											rel='noopener noreferrer'
											className='text-xs text-gray-500 hover:text-white flex items-center gap-1'
										>
											View Profile <ExternalLink className='h-3 w-3' />
										</a>
									) : (
										<span className='text-xs text-gray-500'>Not linked</span>
									)}
								</div>
							</div>
							{isOwner &&
								(profile.steam ? (
									<Button
										variant='ghost'
										size='sm'
										className='text-red-400'
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
								) : (
									<Button
										variant='outline'
										size='sm'
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
												if (!response.ok) throw new Error('Failed to initiate Steam auth');
												const data = await response.json();
												if (!data.url) throw new Error('Missing Steam login URL');
												window.location.href = data.url;
											} catch (e) {
												console.error('Failed to initiate Steam auth', e);
											}
										}}
									>
										Link Account
									</Button>
								))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
