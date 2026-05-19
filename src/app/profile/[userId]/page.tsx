'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { useToast } from '@/lib/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { FaDiscord, FaSteam } from 'react-icons/fa6';
import { ExternalLink, Pencil, User as UserIcon } from 'lucide-react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AvatarStep } from '@/components/onboarding/AvatarStep';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface SteamData {
	steamId: string;
	createdAt: string;
}

interface PublicProfileData {
	id: string;
	name: string;
	bio?: string;
	image?: string;
	steam?: SteamData | null;
	discord?: { discordId: string } | null;
	createdAt: string;
}

export default function PublicProfilePage() {
	const { userId } = useParams();
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [notFound, setNotFound] = useState(false);
	const [profile, setProfile] = useState<PublicProfileData | null>(null);
	const [isEditing, setIsEditing] = useState(false);
	const [isAvatarEditing, setIsAvatarEditing] = useState(false);
	const [avatarLoaded, setAvatarLoaded] = useState(false);
	const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
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

			// Determine current session user and, if owner, merge their private account info
			try {
				const meRes = await fetch('/api/user');
				if (meRes.ok) {
					const meJson = await meRes.json();
					const me = meJson.user;
					setCurrentUserId(me?.id || null);

					if (me?.id === pub.id) {
						// Owner view — merge steam/discord from private record (may be more accurate)
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

	// simple derived stats
	const memberDays = Math.max(0, Math.floor((Date.now() - new Date(profile.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
	const level = Math.floor(memberDays / 30) + (profile.steam ? 1 : 0);
	const xp = memberDays * 10;
	const xpForNext = (level + 1) * 300;

	// editing handlers
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

	return (
		<div className='min-h-screen py-12 bg-black'>
			<Card className='max-w-2xl mx-auto border-gray-800 relative'>
				<CardContent className='p-6 pt-12 relative'>
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
					<div className='flex flex-col items-center text-center'>
						<div className='relative'>
							{isOwner && isEditing ? (
								<button type='button' className='block rounded-full' onClick={() => setIsAvatarDialogOpen(true)} aria-label='Edit profile picture'>
									<Image
										src={profile.image || '/placeholder.svg'}
										alt={`${profile.name}'s Profile`}
										width={100}
										height={100}
										className={`rounded-full w-24 h-24 border-2 border-gray-700 shadow-lg transition-opacity ${avatarLoaded ? 'opacity-100' : 'opacity-0'}`}
										onLoadingComplete={() => setAvatarLoaded(true)}
									/>
								</button>
							) : (
								<Image
									src={profile.image || '/placeholder.svg'}
									alt={`${profile.name}'s Profile`}
									width={100}
									height={100}
									className={`rounded-full w-24 h-24 border-2 border-gray-700 shadow-lg transition-opacity ${avatarLoaded ? 'opacity-100' : 'opacity-0'}`}
									onLoadingComplete={() => setAvatarLoaded(true)}
								/>
							)}
							{!avatarLoaded && <Skeleton className='absolute inset-0 h-24 w-24 rounded-full bg-gray-800' />}
							{isOwner && (
								<Button
									variant='ghost'
									size='icon'
									className='absolute -bottom-1 -right-1 h-8 w-8 rounded-full border border-gray-700 bg-black/80 text-white shadow-lg hover:bg-black'
									onClick={() => setIsAvatarEditing(true)}
									aria-label='Change profile picture'
								>
									<Pencil className='h-4 w-4' />
								</Button>
							)}
						</div>
						<div className='flex items-center gap-4'>
							<h2 className='text-3xl font-bold mt-6 text-white'>{profile.name}</h2>
						</div>

						{!isEditing ? (
							profile.bio && <p className='text-gray-300 mt-2 max-w-md'>{profile.bio}</p>
						) : (
							<div className='mt-4 w-full max-w-md space-y-3'>
								<div>
									<Label className='text-white'>Display Name</Label>
									<Input value={editName} onChange={(e) => setEditName(e.target.value)} className='bg-gray-800 border-gray-700 text-white' />
								</div>
								<div>
									<Label className='text-white'>Bio</Label>
									<Input value={editBio} onChange={(e) => setEditBio(e.target.value)} className='bg-gray-800 border-gray-700 text-white' />
								</div>
								<div>
									<Label className='text-white'>Avatar</Label>
									<div className='mt-2'>
										{isAvatarEditing && (
											<div className='mt-2'>
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
											</div>
										)}
									</div>
								</div>
							</div>
						)}

						<div className='text-xs text-gray-500 mt-4'>Member since {new Date(profile.createdAt).toLocaleDateString()}</div>

						{/* Stats */}
						<div className='mt-4 w-full max-w-md'>
							<div className='flex items-center justify-between text-sm text-gray-400 mb-2'>
								<span>Level</span>
								<span>{level}</span>
							</div>
							<div className='w-full bg-gray-800 rounded-full h-3 overflow-hidden mb-2'>
								<div className='h-3 bg-gradient-to-r from-green-400 to-blue-400' style={{ width: `${Math.min(100, (xp / xpForNext) * 100)}%` }} />
							</div>
							<div className='flex items-center justify-between text-xs text-gray-500'>
								<span>{xp} XP</span>
								<span>{xpForNext} XP</span>
							</div>
						</div>
					</div>

					{/* Account Linking Section */}
					<div className='mt-8 w-full max-w-md mx-auto'>
						<h3 className='text-lg font-semibold mb-4 text-left text-white'>Connected Accounts</h3>
						<div className='space-y-3'>
							{/* Discord */}
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

							{/* Steam */}
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
														// ensure authenticated before initiating Steam flow
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
				</CardContent>
			</Card>

			<Dialog
				open={isAvatarDialogOpen}
				onOpenChange={(open) => {
					setIsAvatarDialogOpen(open);
					if (open) setIsAvatarEditing(true);
				}}
			>
				<DialogContent className='max-w-none w-fit border-gray-800 bg-black text-white'>
					<DialogTitle className='text-white'>Change Avatar</DialogTitle>
					<AvatarStep
						loading={false}
						previousStep={() => {
							setIsAvatarDialogOpen(false);
							setIsAvatarEditing(false);
						}}
						nextStep={async (blob) => {
							try {
								const text = await blob.text();
								const res = await fetch('/api/user/avatar', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ avatar: text }) });
								if (res.ok) {
									toast({ title: 'Avatar updated' });
									await fetchUserProfile();
									setIsAvatarDialogOpen(false);
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
		</div>
	);
}
