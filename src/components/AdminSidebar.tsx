'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarRail } from '@/components/ui/sidebar';
import { FaUsers, FaUsersCog, FaTrophy, FaCog, FaGamepad, FaAward, FaStar, FaComments } from 'react-icons/fa';
import { MdAdminPanelSettings } from 'react-icons/md';
import { cn } from '@/lib/utils';

const NAV = [
	{
		title: 'Management',
		items: [
			{ title: 'Users', url: '/admin/users', icon: FaUsers },
			{ title: 'Teams', url: '/admin/teams', icon: FaUsersCog },
			{ title: 'Tournaments', url: '/admin/tournaments', icon: FaTrophy },
			{ title: 'Matches', url: '/admin/matches', icon: FaGamepad },
			{ title: 'Badges', url: '/admin/badges', icon: FaAward },
			{ title: 'Featured', url: '/admin/featured', icon: FaStar },
			{ title: 'Forum', url: '/admin/forum', icon: FaComments },
		],
	},
	{
		title: 'System',
		items: [{ title: 'Settings', url: '/admin/settings', icon: FaCog }],
	},
];

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const pathname = usePathname() ?? '';
	const isActive = (url: string) => pathname === url || pathname.startsWith(`${url}/`);
	const onDashboard = pathname === '/admin';

	return (
		<Sidebar {...props} className='left-3 top-20 h-[85%] rounded-md border border-border bg-card text-foreground'>
			<SidebarHeader className='mt-2'>
				<Link
					href='/admin'
					aria-current={onDashboard ? 'page' : undefined}
					className={cn('flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', onDashboard && 'bg-muted')}
				>
					<span aria-hidden className='flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background'>
						<MdAdminPanelSettings size={22} />
					</span>
					<span className='flex flex-col'>
						<span className='text-base font-bold leading-tight'>Admin</span>
						<span className='text-xs text-muted-foreground'>Dashboard</span>
					</span>
				</Link>
			</SidebarHeader>
			<SidebarContent>
				<nav aria-label='Admin'>
					{NAV.map((group) => (
						<SidebarGroup key={group.title}>
							<SidebarGroupLabel className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>{group.title}</SidebarGroupLabel>
							<SidebarMenu>
								{group.items.map((item) => {
									const active = isActive(item.url);
									return (
										<SidebarMenuItem key={item.url}>
											<SidebarMenuButton asChild isActive={active} className='h-9 text-neutral-300 hover:bg-muted hover:text-foreground data-[active=true]:bg-muted data-[active=true]:font-semibold data-[active=true]:text-foreground'>
												<Link href={item.url} aria-current={active ? 'page' : undefined}>
													<item.icon aria-hidden />
													<span>{item.title}</span>
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
				<p className='p-4 text-center text-xs text-muted-foreground'>© Tournler</p>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
