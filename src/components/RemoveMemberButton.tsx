'use client';

import { toast } from '@/lib/hooks/use-toast';
import { Button } from './ui/button';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from './ui/tooltip';
import { LuUserX } from 'react-icons/lu';
import { removeMember } from '@/lib/helpers/remove-member';

interface RemoveMemberButtonProps {
	teamId: number;
	memberId: string;
	memberName: string;
}

export function RemoveMemberButton({
	teamId,
	memberId,
	memberName,
}: RemoveMemberButtonProps) {
	async function lremoveMember() {
		const response = await removeMember(teamId, memberId);
		if (response?.error) {
			toast({
				variant: 'destructive',
				title: response.error,
				description: 'Try Again',
			});
		} else {
			toast({
				variant: 'default',
				title: 'Member removed',
				description: `${memberName} has been removed from the team.`,
			});
			window.location.reload();
		}
	}

	return (
		<>
			<div className='absolute top-0 left-0 w-full h-full flex justify-center items-center transition-opacity opacity-0 group-hover:opacity-100'>
				<div className='flex space-x-2'>
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant='secondary'
									onClick={() => lremoveMember()}
								>
									<LuUserX />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Remove Member</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
			</div>
		</>
	);
}
