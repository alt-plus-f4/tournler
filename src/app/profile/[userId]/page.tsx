'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { useToast } from '@/lib/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { FaDiscord, FaSteam } from 'react-icons/fa6';
import { ExternalLink, User as UserIcon } from 'lucide-react';
import { useParams } from 'next/navigation';

interface SteamData {
	steamId: string;
	createdAt: string;
}

interface PublicProfileData {
	id: string;
	name: string;
	bio?: string;
	image?: string;
	steam?: SteamData;
	discord?: {
		discordId: string;
	};
	createdAt: string;
}

export default function PublicProfilePage() {
	const { userId } = useParams();
	const [isLoading, setIsLoading] = useState(true);
	const [notFound, setNotFound] = useState(false);
	const [profile, setProfile] = useState<PublicProfileData | null>(null);
	const { toast } = useToast();

	useEffect(() => {
		const fetchUserProfile = async () => {
			try {
				const response = await fetch(`/api/user/${userId}`);

				if (response.status === 404) {
					setNotFound(true);
					setIsLoading(false);
					return;
				}

				if (!response.ok) {
					throw new Error('Failed to fetch user profile');
				}

				const data = await response.json();
				setProfile(data.user);
			} catch (error) {
				console.error('Error fetching profile:', error);
				toast({
					variant: 'destructive',
					title: 'Error loading profile',
					description: 'Unable to load user profile',
				});
			} finally {
				setIsLoading(false);
			}
		};

		if (userId && typeof userId === 'string') {
			fetchUserProfile();
		}
	}, [userId, toast]);

	// Render 404
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

	// Render loading skeletons
	if (isLoading) {
		return (
			<div className='min-h-screen py-12 bg-black'>
				<Card className='max-w-2xl mx-auto border-gray-800'>
					<CardContent className='p-6'>
						<div className='flex flex-col items-center text-center'>
							<Skeleton className='h-24 w-24 rounded-full bg-gray-800' />
							<div className='mt-6 space-y-4 w-full max-w-md'>
								<Skeleton className='h-8 w-[200px] mx-auto bg-gray-800' />
								<Skeleton className='h-4 w-[250px] mx-auto bg-gray-800' />
								<Skeleton className='h-12 w-full bg-gray-800' />
								<Skeleton className='h-12 w-full bg-gray-800' />
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!profile) {
		return null;
	}

	return (
		<div className='min-h-screen py-12 bg-black'>
			<Card className='max-w-2xl mx-auto border-gray-800'>
				<CardContent className='p-6'>
					<div className='flex flex-col items-center text-center'>
						<div className='relative'>
							<Image src={profile.image || '/placeholder.svg'} alt={`${profile.name}'s Profile`} width={100} height={100} className='rounded-full w-24 h-24 border-2 border-gray-700 shadow-lg' />
							<div className='absolute -bottom-1 -right-1 h-6 w-6 bg-green-500 rounded-full border-2 border-gray-800'></div>
						</div>
						<h2 className='text-3xl font-bold mt-6 text-white'>{profile.name}</h2>
						{profile.bio && <p className='text-gray-300 mt-2 max-w-md'>{profile.bio}</p>}
						<div className='text-xs text-gray-500 mt-4'>Member since {new Date(profile.createdAt).toLocaleDateString()}</div>
					</div>

					{/* Account Linking Section */}
					<div className='mt-8 w-full max-w-md mx-auto'>
						<h3 className='text-lg font-semibold mb-4 text-left text-white'>Connected Accounts</h3>
						<div className='space-y-3'>
							{/* Discord Account */}
							{profile.discord ? (
								<div className='flex items-center justify-between p-4 border border-gray-700 rounded-lg bg-gradient-to-r from-[#5865F2]/10 to-transparent'>
									<div className='flex items-center gap-3'>
										<div className='w-10 h-10 bg-[#5865F2] rounded-full flex items-center justify-center'>
											<FaDiscord className='h-6 w-6 text-white' />
										</div>
										<div className='flex flex-col items-start'>
											<span className='font-medium text-white'>Discord</span>
											<span className='text-sm text-gray-400'>Connected</span>
										</div>
									</div>
									<div className='flex items-center gap-2'>
										<div className='h-2 w-2 bg-green-500 rounded-full'></div>
										<span className='text-xs text-green-400'>Active</span>
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
											<span className='text-sm text-gray-400'>Not shown</span>
										</div>
									</div>
								</div>
							)}

							{/* Steam Account */}
							{profile.steam ? (
								<div className='flex items-center justify-between p-4 border border-gray-700 rounded-lg bg-gradient-to-r from-[#1B2838]/10 to-transparent'>
									<div className='flex items-center gap-3'>
										<div className='w-10 h-10 bg-[#1B2838] rounded-full flex items-center justify-center'>
											<FaSteam className='w-6 h-6 text-[#00B0E0]' />
										</div>
										<div className='flex flex-col items-start'>
											<span className='font-medium text-white'>Steam</span>
											<a href={`https://steamcommunity.com/gid/${profile.steam.steamId}`} target='_blank' rel='noopener noreferrer' className='text-sm text-[#00B0E0] hover:text-[#00D4FF] transition-colors flex items-center gap-1'>
												View Profile
												<ExternalLink className='h-3 w-3' />
											</a>
										</div>
									</div>
									<div className='flex items-center gap-2'>
										<div className='h-2 w-2 bg-green-500 rounded-full'></div>
										<span className='text-xs text-green-400'>Linked</span>
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
								</div>
							)}
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
