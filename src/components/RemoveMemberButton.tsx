'use client';

import { toast } from '@/lib/hooks/use-toast';
import { Button } from './ui/button';
import { ConfirmAction } from './ConfirmAction';
import { UserX } from 'lucide-react';
import { removeMember } from '@/lib/helpers/remove-member';
import { useRouter } from 'next/navigation';
interface RemoveMemberButtonProps {
	teamId: number;
	memberId: string;
	memberName: string;
}

export function RemoveMemberButton({ teamId, memberId, memberName }: RemoveMemberButtonProps) {
	const router = useRouter();
	async function lremoveMember() {
		const response = await removeMember(teamId, memberId);
		if (response?.error) {
			toast({
				variant: 'destructive',
				title: response.error,
				description: 'Try Again',
			});
			// Keeps the confirm dialog open so the captain can see the error and retry.
			throw new Error(response.error);
		}
		toast({
			variant: 'default',
			title: 'Member removed',
			description: `${memberName} has been removed from the team.`,
		});
		router.refresh();
	}

	return (
		<>
			<div className='absolute top-0 left-0 w-full h-full flex justify-center items-center transition-opacity opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100'>
				<div className='flex space-x-2'>
					<ConfirmAction
						title='Remove this member?'
						description={`${memberName || 'This player'} loses their slot on the team and will need a new invite to rejoin.`}
						confirmLabel='Remove member'
						onConfirm={lremoveMember}
						trigger={
							<Button variant='secondary' aria-label={`Remove ${memberName || 'member'} from the team`}>
								<UserX aria-hidden />
							</Button>
						}
					/>
				</div>
			</div>
		</>
	);
}
