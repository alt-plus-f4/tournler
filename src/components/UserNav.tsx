import { User } from 'next-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings, Users, UserPlus } from 'lucide-react';
import SignOut from './SignOut';

interface UserAccountNavProps extends React.HTMLAttributes<HTMLDivElement> {
	user: Pick<User, 'name' | 'image' | 'email'>;
}

export function UserNav({ user }: UserAccountNavProps) {

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant='ghost'
					className='relative h-8 w-8 rounded-full'
				>
					<Avatar className='h-8 w-8'>
						<AvatarImage src={user.image ?? ''} alt='image' />
						<AvatarFallback>CN</AvatarFallback>
					</Avatar>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className='w-56' align='end' forceMount>
				<DropdownMenuLabel className='font-normal'>
					<div className='flex flex-col space-y-1'>
						<p className='text-sm font-medium leading-none'>
							{user.name}
						</p>
						<p className='text-xs leading-none text-muted-foreground'>
							{user.email}
						</p>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem>
						<Users />
						<span>Profile</span>
						<DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
					</DropdownMenuItem>
					<DropdownMenuItem>
						<Settings />
						<span>Settings</span>
						<DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<a href='/teams'>
							<UserPlus />
							<span>New Team</span>
						</a>
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<SignOut />
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
