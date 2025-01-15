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

interface NotificationsProps {
  userId: string;
}

export default function Notifications({ userId }: NotificationsProps) {
  const notifications = useQuery(api.notifications.getUserNotifications, {
    id: userId,
  });
  const markAsRead = useMutation(api.notifications.markNotificationAsRead);
  const markAllAsRead = useMutation(
    api.notifications.markAllNotificationsAsRead
  );
  const hasNewNotifications = (notifications?.length ?? 0) > 0;

  const { toast } = useToast();

  async function handleAcceptInvite(id: any, teamId: number) {
    try {
      await acceptTeamInvite({ userId, teamId });
      await markAsRead({ id: id });
      toast({
        variant: 'default',
        title: 'Success',
        description: 'Team invitation accepted.',
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
        title: 'Success',
        description: 'Team invitation denied.',
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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant='ghost' size='icon' className='p-2 relative'>
          <Bell width={16} />
          {hasNewNotifications && (
            <div className='absolute text-xs -top-0 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600'>
              {notifications?.length}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[200px] md:w-[400px] rounded-md mr-12'>
        <div className='flex p-4'>
          <h3 className='text-lg font-medium'>Notifications</h3>
        </div>
        <Separator />
        <ScrollArea>
          <div className='space-y-4 p-4'>
            {!hasNewNotifications && (
              <p>You have no unread Notifications</p>
            )}
            {hasNewNotifications &&
              notifications?.map(
                ({
                  _id,
                  text,
                  _creationTime,
                  type,
                  teamId,
                }) => (
                  <div
                    key={_id}
                    className='grid grid-cols-[1fr_auto] items-start gap-4'
                  >
                    <div className='space-y-1'>
                      <p className='text-sm font-medium'>
                        {text}
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        {timeAgo(_creationTime)}
                      </p>
                    </div>
                    <div>
                      {type === 1 ? (
                        <>
                          <Button
                            variant={'default'}
                            onClick={() => handleAcceptInvite(_id, teamId || -1)}
                          >
                            <CheckIcon className='h-5 w-5' />
                          </Button>
                          <Button
                            className='ml-2'
                            variant={'outline'}
                            onClick={() => handleDenyInvite(_id, teamId || -1)}
                          >
                            <X className='h-5 w-5' />
                          </Button>
                        </>
                      ) : (
                        <Button
                          className='ml-2'
                          variant={'outline'}
                          onClick={() => markAsRead({ id: _id })}
                        >
                          <X className='h-5 w-5' />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              )}
          </div>
        </ScrollArea>
        {hasNewNotifications && (
          <>
            <Separator />
            <div className='p-4'>
              <Button
                variant={'outline'}
                className='w-full'
                onClick={() => markAllAsRead()}
              >
                Mark all as read
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}