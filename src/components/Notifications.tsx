'use client';

import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { Bell, CheckIcon, X } from 'lucide-react';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { timeAgo } from '@/lib/utils';
import { acceptTeamInvite } from '@/lib/helpers/accept-team-invite';
import { denyTeamInvite } from '@/lib/helpers/deny-team-invitation';
import { useToast } from '@/lib/hooks/use-toast';
import { useEffect, useState } from 'react';

interface NotificationsProps {
	userId: string;
}

export default function Notifications({ userId }: NotificationsProps) {
	const [mounted, setMounted] = useState(false);
	const notifications = useQuery(api.notifications.getMyNotifications);
	const markAsRead = useMutation(api.notifications.markNotificationAsRead);
	const markAllAsRead = useMutation(api.notifications.markAllMyNotificationsAsRead);
	const hasNewNotifications = (notifications?.length ?? 0) > 0;

	const { toast } = useToast();

	useEffect(() => {
		setMounted(true);
	}, []);

	async function handleAcceptInvite(id: any, teamId: number) {
		try {
			await acceptTeamInvite({ userId, teamId });
			await markAsRead({ id: id });
			toast({
				variant: 'default',
				title: 'Invite accepted',
			});
			window.location.reload();
		} catch (error) {
			toast({
				variant: 'destructive',
				title: 'Error',
				description: 'Failed to accept team invitation.',
			});
			console.error('Failed to accept team invitation:', error);
		}
	}

	async function handleDenyInvite(id: any, teamId: number) {
		try {
			await denyTeamInvite({ userId, teamId });
			await markAsRead({ id: id });
			toast({
				variant: 'default',
				title: 'Invite declined',
			});
			window.location.reload();
		} catch (error) {
			toast({
				variant: 'destructive',
				title: 'Error',
				description: 'Failed to deny team invitation.',
			});
			console.error('Failed to deny team invitation:', error);
		}
	}

	const count = notifications?.length ?? 0;
	// Convex caps the query at 10 unread; say "10+" rather than implying an exact count.
	const countLabel = count >= 10 ? '10+' : String(count);
	const triggerLabel = count > 0 ? `Notifications, ${countLabel} unread` : 'Notifications';

	if (!mounted) {
		return (
			<Button variant='ghost' size='icon' className='relative' aria-label='Notifications'>
				<Bell aria-hidden className='h-4 w-4' />
			</Button>
		);
	}

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant='ghost' size='icon' className='relative' aria-label={triggerLabel}>
					<Bell aria-hidden className='h-4 w-4' />
					{hasNewNotifications && (
						<span aria-hidden className='absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 font-mono text-xs leading-none tabular-nums text-background'>
							{countLabel}
						</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent align='end' className='w-[calc(100vw-2rem)] max-w-[400px] rounded-md p-0'>
				<div className='flex items-center justify-between px-4 py-3'>
					<h3 className='text-base font-semibold'>Notifications</h3>
					{hasNewNotifications && <span className='font-mono text-xs tabular-nums text-muted-foreground'>{countLabel} unread</span>}
				</div>
				<Separator />
				<ScrollArea className='max-h-[60vh]'>
					<ul className='divide-y divide-border'>
						{!hasNewNotifications && <li className='px-4 py-6 text-sm text-muted-foreground'>You&apos;re all caught up.</li>}
						{hasNewNotifications &&
							notifications?.map(({ _id, text, _creationTime, type, teamId }) => {
								const teamName = teamNameFromText(text);
								const textId = `notification-${_id}`;
								return (
									<li key={_id} className='grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3'>
										<div className='min-w-0 space-y-1'>
											<p id={textId} className='text-sm font-medium'>
												{text}
											</p>
											<p className='text-xs text-muted-foreground'>{timeAgo(_creationTime)}</p>
										</div>
										<div className='flex gap-2'>
											{type === 1 ? (
												<>
													<Button size='icon' onClick={() => handleAcceptInvite(_id, teamId || -1)} aria-label={`Accept invite to ${teamName}`}>
														<CheckIcon aria-hidden className='h-5 w-5' />
													</Button>
													<Button size='icon' variant='outline' onClick={() => handleDenyInvite(_id, teamId || -1)} aria-label={`Decline invite to ${teamName}`}>
														<X aria-hidden className='h-5 w-5' />
													</Button>
												</>
											) : (
												<Button size='icon' variant='ghost' onClick={() => markAsRead({ id: _id })} aria-label='Dismiss notification' aria-describedby={textId}>
													<X aria-hidden className='h-5 w-5' />
												</Button>
											)}
										</div>
									</li>
								);
							})}
					</ul>
				</ScrollArea>
				{hasNewNotifications && (
					<>
						<Separator />
						<div className='p-3'>
							<Button variant='outline' className='w-full' onClick={() => markAllAsRead()}>
								Mark all as read
							</Button>
						</div>
					</>
				)}
			</PopoverContent>
		</Popover>
	);
}

/** Invite notifications are written as "You have been invited to join the team <name>." (see UsersSearch). */
function teamNameFromText(text: string): string {
	const match = /join the team (.+?)\.?$/.exec(text);
	return match?.[1] ?? 'this team';
}
