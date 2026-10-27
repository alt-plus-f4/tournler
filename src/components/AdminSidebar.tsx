'use client';

import Link from 'next/link';
import { LinkPendingBar } from '@/components/shell/LinkPending';
import { usePathname } from 'next/navigation';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarRail } from '@/components/ui/sidebar';
import { Award, Ban, Gamepad2, MessagesSquare, Server, Settings, ShieldCheck, Star, Trophy, UserCog, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
	{
		title: 'Management',
		items: [
			{ title: 'Users', url: '/admin/users', icon: Users },
			{ title: 'Teams', url: '/admin/teams', icon: UserCog },
			{ title: 'Tournaments', url: '/admin/tournaments', icon: Trophy },
			{ title: 'Matches', url: '/admin/matches', icon: Gamepad2 },
			{ title: 'Servers', url: '/admin/servers', icon: Server },
			{ title: 'Badges', url: '/admin/badges', icon: Award },
			{ title: 'Featured', url: '/admin/featured', icon: Star },
			{ title: 'Forum', url: '/admin/forum', icon: MessagesSquare },
			{ title: 'Bans', url: '/admin/bans', icon: Ban },
		],
	},
	{
		title: 'System',
		items: [{ title: 'Settings', url: '/admin/settings', icon: Settings }],
	},
];

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const pathname = usePathname() ?? '';
	const isActive = (url: string) => pathname === url || pathname.startsWith(`${url}/`);
	const onDashboard = pathname === '/admin';

	return (
		<Sidebar {...props} className='left-3 top-20 h-[85%] rounded-lg border border-border bg-card text-foreground'>
			<SidebarHeader className='mt-2 border-b border-border px-3 pb-3'>
				<Link
					href='/admin'
					aria-current={onDashboard ? 'page' : undefined}
					className={cn(
						'flex items-center gap-3 rounded-md p-1.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
						onDashboard && 'bg-muted shadow-[inset_2px_0_0_hsl(var(--foreground))]',
					)}
				>
					<span aria-hidden className='flex h-9 w-9 items-center justify-center rounded-md bg-foreground text-background'>
						<ShieldCheck size={22} />
					</span>
					<span className='flex flex-col'>
						<span className='text-sm font-black uppercase leading-tight tracking-wide'>Admin</span>
						<span className='text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground'>Dashboard</span>
					</span>
				</Link>
			</SidebarHeader>
			<SidebarContent>
				<nav aria-label='Admin'>
					{NAV.map((group) => (
						<SidebarGroup key={group.title}>
							<SidebarGroupLabel className='text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground'>{group.title}</SidebarGroupLabel>
							<SidebarMenu>
								{group.items.map((item) => {
									const active = isActive(item.url);
									return (
										<SidebarMenuItem key={item.url}>
											<SidebarMenuButton
												asChild
												isActive={active}
												className='h-9 text-neutral-300 hover:bg-muted hover:text-foreground data-[active=true]:bg-muted data-[active=true]:font-semibold data-[active=true]:text-foreground data-[active=true]:shadow-[inset_2px_0_0_hsl(var(--foreground))]'
											>
												<Link href={item.url} aria-current={active ? 'page' : undefined}>
													<item.icon aria-hidden />
													<span>{item.title}</span>
													<LinkPendingBar className='inset-x-2' />
												</Link>
											</SidebarMenuButton>
										</SidebarMenuItem>
									);
								})}
							</SidebarMenu>
						</SidebarGroup>
					))}
				</nav>
			</SidebarContent>
			<SidebarFooter>
				<p className='p-4 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground'>© Tournler</p>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
