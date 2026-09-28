'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, UserCheck, UserPlus, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/hooks/use-toast';
import { acceptFriendRequest, declineFriendRequest, removeFriend, sendFriendRequest } from '@/lib/helpers/friends';
import type { FriendStatus } from '@/lib/helpers/friend-status';
import { cn } from '@/lib/utils';

interface FriendButtonProps {
	profileUserId: string;
	initialStatus: FriendStatus;
	className?: string;
}

/** Add/accept/decline/unfriend action for a profile the viewer isn't the owner of. */
export function FriendButton({ profileUserId, initialStatus, className }: FriendButtonProps) {
	const [status, setStatus] = useState(initialStatus);
	const [pending, setPending] = useState(false);
	const router = useRouter();
	const { toast } = useToast();

	const run = (action: () => Promise<void>, next: FriendStatus, successTitle: string) => async () => {
		setPending(true);
		try {
			await action();
			setStatus(next);
			toast({ title: successTitle });
			router.refresh();
		} catch (error) {
			toast({ variant: 'destructive', title: 'Something went wrong', description: error instanceof Error ? error.message : undefined });
		} finally {
			setPending(false);
		}
	};

	if (status === 'FRIENDS') {
		return (
			<Button type='button' variant='outline' size='sm' disabled={pending} onClick={run(() => removeFriend(profileUserId), 'NONE', 'Friend removed')} className={cn('border-white/15 bg-black/50 backdrop-blur-sm', className)} title='Remove friend'>
				<UserCheck className='mr-2 h-3.5 w-3.5' aria-hidden /> Friends
			</Button>
		);
	}

	if (status === 'REQUEST_SENT') {
		return (
			<Button
				type='button'
				variant='outline'
				size='sm'
				disabled={pending}
				onClick={run(() => removeFriend(profileUserId), 'NONE', 'Friend request canceled')}
				className={cn('border-white/15 bg-black/50 backdrop-blur-sm', className)}
				title='Cancel request'
			>
				<Clock className='mr-2 h-3.5 w-3.5' aria-hidden /> Request sent
			</Button>
		);
	}

	if (status === 'REQUEST_RECEIVED') {
		return (
			<div className={cn('flex gap-2', className)}>
				<Button type='button' size='sm' disabled={pending} onClick={run(() => acceptFriendRequest(profileUserId), 'FRIENDS', 'Friend added')}>
					<UserCheck className='mr-2 h-3.5 w-3.5' aria-hidden /> Accept
				</Button>
				<Button type='button' variant='outline' size='sm' disabled={pending} onClick={run(() => declineFriendRequest(profileUserId), 'NONE', 'Request declined')} className='border-white/15 bg-black/50 backdrop-blur-sm'>
					<UserX className='mr-2 h-3.5 w-3.5' aria-hidden /> Decline
				</Button>
			</div>
		);
	}

	return (
		<Button type='button' size='sm' disabled={pending} onClick={run(() => sendFriendRequest(profileUserId), 'REQUEST_SENT', 'Friend request sent')} className={className}>
			<UserPlus className='mr-2 h-3.5 w-3.5' aria-hidden /> Add friend
		</Button>
	);
}
