import {
	HoverCard,
	HoverCardTrigger,
	HoverCardContent,
} from '@radix-ui/react-hover-card';
import { FaCrown } from 'react-icons/fa';
import { Cs2Team } from '@prisma/client';
import { UserCard } from './UserCard';
import { ExtendedUser } from '@/lib/models/user-model';
import Image from 'next/image';
import { RemoveMemberButton } from './RemoveMemberButton';

interface TeamMemberAvatarProps {
	team: Cs2Team;
	member: ExtendedUser;
	enableTeamCapitanControls?: boolean;
	capitanId: string;
	userId?: string;
}

export function TeamMemberAvatar({
	team,
	member,
	enableTeamCapitanControls,
	capitanId,
	userId,
}: TeamMemberAvatarProps) {
	return (
		<HoverCard>
			<HoverCardTrigger asChild>
				<div className='group relative'>
					{member.id == capitanId && (
						<FaCrown className='absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-yellow-500' />
					)}
					<Image
						className='transition group-hover:z-10 group-hover:scale-[125%] cursor-default mb-[-10px]'
						src={member.image ?? ''}
						alt={`${member.name} avatar`}
						width={300}
						height={200}
					/>

					{enableTeamCapitanControls &&
						userId &&
						member.id !== userId && (
							<RemoveMemberButton
								teamId={team.id}
								memberId={member.id}
								memberName={member.name ?? ''}
							/>
						)}
				</div>
			</HoverCardTrigger>

			<HoverCardContent
				className='w-fit p-4 rounded-lg bg-black min-w-64 max-w-96 z-40 cursor-default '
				side='top'
			>
				<UserCard member={member} />
			</HoverCardContent>
		</HoverCard>
	);
}
