'use client';

import { ExtendedUser } from '@/lib/models/user-model';
import { Avatar, AvatarImage, AvatarFallback } from '@radix-ui/react-avatar';

interface UserCardProps {
	member: ExtendedUser;
}

export function UserCard({ member }: UserCardProps) {
	return (
		<div className='flex justify-between space-x-4'>
			<Avatar className='h-12 w-12'>
				<AvatarImage src={member.image ?? ''} alt={`${member.name}`} />
				<AvatarFallback>{member.name ?? 'X'}</AvatarFallback>
			</Avatar>
			<div className='space-y-1 w-full'>
				<h4 className='text-sm font-semibold'>{member.name}</h4>
				<p className='text-sm'>
					{member.bio || member.name + ' is a player.'} 
				</p>
			</div>
		</div>
	);
}
