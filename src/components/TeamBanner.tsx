import { Icons } from './Icons';
import { TeamMemberAvatar } from './TeamMemberAvatar';
import { ExtendedCs2Team } from '@/lib/models/team-model';

interface TeamBannerProps {
	team: ExtendedCs2Team;
	enableTeamCapitanControls?: boolean;
	capitanId: string;
	userId?: string;
}

export function TeamBanner({
	team,
	enableTeamCapitanControls,
	capitanId,
	userId,
}: TeamBannerProps) {
	const members = team.members || [];
	const teamName = team.name || 'TEAM NAME';

	return (
		<>
			<div
				className='absolute inset-0 flex flex-col w-full h-full pt-5 overflow-ellipsis items-center text-center text-white'
				style={{ backgroundColor: 'white' }}
			>
				<span className='w-fit p-2 text-3xl font-bold bg-white text-black dark:bg-black dark:text-white'>
					{teamName.toUpperCase()}
				</span>
				<Icons.logo className='px-4 py-2 scale-50 -mt-3 bg-white text-black dark:bg-black dark:text-white' />
			</div>
			<div
				className='absolute inset-0 w-full h-full grid justify-center items-end'
				style={{
					padding: `0px ${2 + (5 - members.length) * 9.75}%`,
					gridTemplateColumns: `repeat(${members.length}, 1fr)`,
				}}
			>
				{members.map((member) => (
					<TeamMemberAvatar
						key={member.id}
						team={team}
						member={member}
						userId={userId}
						capitanId={capitanId}
						enableTeamCapitanControls={enableTeamCapitanControls}
					/>
				))}
			</div>
		</>
	);
}
