'use client';

import { Suspense, use } from 'react';
import Link from 'next/link';
import { LinkPendingBar } from '@/components/shell/LinkPending';
import { usePathname } from 'next/navigation';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarRail } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Award, Ban, ExternalLink, Gamepad2, LayoutDashboard, MessagesSquare, Server, Settings, ShieldCheck, Star, Trophy, UserCog, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdminSidebarData } from '@/lib/admin/nav-types';

type Counts = AdminSidebarData['counts'];
type ChipTone = 'neutral' | 'live';
type Chip = { label: string; tone: ChipTone; srLabel?: string } | null;

const fmt = (n: number) => n.toLocaleString('en-US');

type NavItem = { title: string; url: string; icon: typeof Users; exact?: boolean; chip?: (c: Counts) => Chip };

const NAV: { title: string; items: NavItem[] }[] = [
	{ title: 'Overview', items: [{ title: 'Dashboard', url: '/admin', icon: LayoutDashboard, exact: true }] },
	{
		title: 'Competition',
		items: [
			{ title: 'Tournaments', url: '/admin/tournaments', icon: Trophy, chip: (c) => ({ label: fmt(c.tournaments), tone: 'neutral' }) },
			{
				title: 'Matches',
				url: '/admin/matches',
				icon: Gamepad2,
				chip: (c) => (c.liveMatches > 0 ? { label: `${fmt(c.liveMatches)} live`, tone: 'live' } : { label: fmt(c.matches), tone: 'neutral' }),
			},
			{ title: 'Servers', url: '/admin/servers', icon: Server, chip: (c) => (c.servers === null ? null : { label: fmt(c.servers), tone: 'neutral', srLabel: `${c.servers} configured` }) },
		],
	},
	{
		title: 'People',
		items: [
			{ title: 'Users', url: '/admin/users', icon: Users, chip: (c) => ({ label: fmt(c.users), tone: 'neutral' }) },
			{ title: 'Teams', url: '/admin/teams', icon: UserCog, chip: (c) => ({ label: fmt(c.teams), tone: 'neutral' }) },
			{ title: 'Badges', url: '/admin/badges', icon: Award, chip: (c) => ({ label: fmt(c.badges), tone: 'neutral' }) },
			{ title: 'Bans', url: '/admin/bans', icon: Ban, chip: (c) => (c.activeBans > 0 ? { label: fmt(c.activeBans), tone: 'neutral', srLabel: `${c.activeBans} active` } : null) },
		],
	},
	{
		title: 'Content',
		items: [
			{ title: 'Featured & homepage', url: '/admin/featured', icon: Star },
			{ title: 'Forum', url: '/admin/forum', icon: MessagesSquare, chip: (c) => ({ label: fmt(c.forumThreads), tone: 'neutral', srLabel: `${c.forumThreads} threads` }) },
		],
	},
	{ title: 'System', items: [{ title: 'Settings', url: '/admin/settings', icon: Settings }] },
];

const CHIP_TONE: Record<ChipTone, string> = {
	neutral: 'text-muted-foreground',
	live: 'bg-signal-live/15 text-signal-live',
};

const ROLE_LABEL: Record<string, string> = {
	ADMIN: 'Admin',
	MODERATOR: 'Moderator',
	TOURNAMENT_ADMIN: 'Tournament admin',
	CONTENT_ADMIN: 'Content admin',
	USER: 'User',
};

function CountChip({ data, chip }: { data: Promise<AdminSidebarData | null>; chip: NonNullable<NavItem['chip']> }) {
	const resolved = use(data);
	if (!resolved) return null;
	const c = chip(resolved.counts);
	if (!c) return null;
	return (
		<span className={cn('ml-auto shrink-0 rounded-full px-1.5 py-px font-mono text-[11px] font-medium tabular-nums', CHIP_TONE[c.tone])}>
			{c.label}
			{c.srLabel && <span className='sr-only'> ({c.srLabel})</span>}
		</span>
	);
}

function CurrentUser({ data }: { data: Promise<AdminSidebarData | null> }) {
	const resolved = use(data);
	if (!resolved) return <span className='flex-1' />;
	const { user } = resolved;
	return (
		<span className='flex min-w-0 flex-1 items-center gap-2.5'>
			<Avatar className='h-8 w-8 border border-border'>
				{user.image && <AvatarImage src={user.image} alt='' />}
				<AvatarFallback className='bg-muted text-xs font-bold uppercase'>{user.name.slice(0, 2)}</AvatarFallback>
			</Avatar>
			<span className='flex min-w-0 flex-col leading-tight'>
				<span className='truncate text-[13px] font-semibold'>{user.name}</span>
				<span className='truncate font-mono text-[11px] uppercase tracking-wider text-muted-foreground'>{ROLE_LABEL[user.role] ?? user.role}</span>
			</span>
		</span>
	);
}

/**
 * Floating admin nav. `data` is an un-awaited promise from the layout (getAdminSidebarData), so the
 * links paint immediately and the count chips + current user stream in.
 */
export function AdminSidebar({ data, ...props }: React.ComponentProps<typeof Sidebar> & { data: Promise<AdminSidebarData | null> }) {
	const pathname = usePathname() ?? '';
	const isActive = (item: NavItem) => (item.exact ? pathname === item.url : pathname === item.url || pathname.startsWith(`${item.url}/`));

	return (
		<Sidebar {...props} className='left-3 top-20 h-[85%] overflow-hidden rounded-xl border border-border bg-card text-foreground'>
			<SidebarHeader className='border-b border-border p-0'>
				<Link
					href='/admin'
					className='flex items-center gap-3 p-3.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
				>
					<span aria-hidden className='flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background'>
						<ShieldCheck size={20} />
					</span>
					<span className='flex flex-col leading-tight'>
						<span className='text-sm font-black uppercase tracking-wide'>Admin</span>
						<span className='text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground'>Tournler</span>
					</span>
				</Link>
			</SidebarHeader>
			<SidebarContent>
				<nav aria-label='Admin' className='px-1 pb-2'>
					{NAV.map((group) => (
						<SidebarGroup key={group.title} className='py-1'>
							<SidebarGroupLabel className='text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-500'>{group.title}</SidebarGroupLabel>
							<SidebarMenu>
								{group.items.map((item) => {
									const active = isActive(item);
									return (
										<SidebarMenuItem key={item.url}>
											<SidebarMenuButton
												asChild
												isActive={active}
												className='h-[34px] text-neutral-300 hover:bg-muted hover:text-foreground data-[active=true]:bg-muted data-[active=true]:font-medium data-[active=true]:text-foreground data-[active=true]:shadow-[inset_2px_0_0_hsl(var(--foreground))]'
											>
												<Link href={item.url} aria-current={active ? 'page' : undefined}>
													<item.icon aria-hidden />
													<span className='truncate'>{item.title}</span>
													{item.chip && (
														<Suspense fallback={null}>
															<CountChip data={data} chip={item.chip} />
														</Suspense>
													)}
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
			<SidebarFooter className='flex-row items-center gap-2.5 border-t border-border p-3'>
				<Suspense fallback={<span className='flex-1' />}>
					<CurrentUser data={data} />
				</Suspense>
				<Link
					href='/'
					aria-label='View site'
					title='View site'
					className='flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md border border-border text-neutral-300 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
				>
					<ExternalLink aria-hidden size={14} />
				</Link>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
