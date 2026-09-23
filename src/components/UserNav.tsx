'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Users, UserPlus } from 'lucide-react';
import SignOut from './SignOut';
import useSWR from 'swr';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function UserNav() {
	const [imageLoaded, setImageLoaded] = useState(false);
	const [imageErrored, setImageErrored] = useState(false);
	const { data, error } = useSWR(
		'/api/user',
		async () => {
			const res = await fetch('/api/user');
			if (!res.ok) throw new Error('Failed to fetch user');
			return res.json();
		},
		{ revalidateOnFocus: false },
	);

	const user = data?.user;
	const isLoadingUser = !data && !error;
	const profileHref = user?.id ? `/profile/${user.id}` : '/';
	const fallbackLabel = (user?.name?.trim().slice(0, 2) || 'CN').toUpperCase();

	useEffect(() => {
		setImageLoaded(false);
		setImageErrored(false);
	}, [user?.image]);

	if (isLoadingUser) {
		return (
			<div className='relative h-8 w-8 overflow-hidden rounded-full border border-border bg-muted' aria-hidden>
				<Skeleton className='h-full w-full rounded-full bg-neutral-800' />
			</div>
		);
	}

	if (!user) return null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant='ghost' className='relative h-8 w-8 rounded-full p-0 overflow-hidden' aria-label={`Account menu${user.name ? ` for ${user.name}` : ''}`}>
					<div className='relative h-8 w-8'>
						<Avatar className='h-8 w-8'>
							{user.image && !imageErrored ? (
								<AvatarImage
									src={user.image}
									alt=''
									onLoadingStatusChange={(status) => setImageLoaded(status === 'loaded')}
									onError={() => setImageErrored(true)}
									className={imageLoaded ? 'opacity-100 transition-opacity' : 'opacity-0'}
								/>
							) : null}
							<AvatarFallback aria-hidden className='bg-muted text-xs font-semibold text-foreground'>{fallbackLabel}</AvatarFallback>
						</Avatar>
						{user.image && !imageLoaded && !imageErrored && <Skeleton className='absolute inset-0 rounded-full bg-neutral-800 ring-1 ring-border' />}
					</div>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className='w-56' align='end' forceMount>
				<DropdownMenuLabel className='font-normal'>
					<div className='flex flex-col space-y-1'>
						<p className='text-sm font-medium leading-none'>{user.name}</p>
						<p className='text-xs leading-none text-muted-foreground'>{user.email}</p>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem asChild>
						<Link href={profileHref}>
							<Users aria-hidden />
							<span>Profile</span>
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link href='/teams'>
							<UserPlus aria-hidden />
							<span>New team</span>
						</Link>
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<SignOut />
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
