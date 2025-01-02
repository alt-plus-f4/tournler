import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuItem,
	SidebarMenuButton,
	SidebarMenuSub,
	SidebarMenuSubItem,
	SidebarMenuSubButton,
	SidebarRail,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { FaUsers, FaUsersCog, FaTrophy, FaCog, FaAngry } from 'react-icons/fa';
import {
	Collapsible,
	CollapsibleTrigger,
	CollapsibleContent,
} from '@/components/ui/collapsible';
import { Plus, Minus } from 'lucide-react';
import { MdAdminPanelSettings } from 'react-icons/md';

export function AdminSidebar({
	...props
}: React.ComponentProps<typeof Sidebar>) {
	const data = {
		navMain: [
			{
				title: 'Management',
				items: [
					{
						title: 'Users',
						url: '/admin/users',
						isActive: false,
						icon: FaUsers,
					},
					{
						title: 'Teams',
						url: '/admin/teams',
						isActive: false,
						icon: FaUsersCog,
					},
					{
						title: 'Tournaments',
						url: '/admin/tournaments',
						isActive: false,
						icon: FaTrophy,
					},
					{
						title: 'Matches',
						url: '/admin/matches',
						isActive: false,
						icon: FaAngry,
					},
				],
			},
			{
				title: 'Settings',
				items: [
					{
						title: 'Settings',
						url: '/admin/settings',
						isActive: false,
						icon: FaCog,
					},
				],
			},
		],
	};

	return (
		<Sidebar
			{...props}
			className='h-[90%] left-3 top-20 rounded-[16px] text-white border bg-gray-800'
		>
			<SidebarHeader className='flex flex-row items-center transition-colors hover:bg-zinc-900 mt-4'>
				<div className='w-10 h-10 bg-red-500 flex items-center rounded-xl justify-center ml-4'>
					<MdAdminPanelSettings size={28} className='' />
				</div>
				<div className='flex flex-col justify-center ml-4'>
					<h2 className='text-lg font-bold'>Administrator</h2>
					<p className='text-xs'>Panel</p>
				</div>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarMenu>
						{data.navMain.map((item, index) => (
							<Collapsible
								key={item.title}
								defaultOpen={index === 0}
								className='group/collapsible'
							>
								<SidebarMenuItem>
									<CollapsibleTrigger asChild>
										<SidebarMenuButton>
											{item.title}
											<Plus className='ml-auto group-data-[state=open]/collapsible:hidden' />
											<Minus className='ml-auto group-data-[state=closed]/collapsible:hidden' />
										</SidebarMenuButton>
									</CollapsibleTrigger>
									{item.items?.length ? (
										<CollapsibleContent>
											<SidebarMenuSub>
												{item.items.map((subItem) => (
													<SidebarMenuSubItem
														key={subItem.title}
													>
														<SidebarMenuSubButton
															asChild
															isActive={
																subItem.isActive
															}
														>
															<Link
																href={
																	subItem.url
																}
																className='p-2 flex items-center gap-2 hover:bg-gray-700 inset-x-4'
															>
																<subItem.icon />
																{subItem.title}
															</Link>
														</SidebarMenuSubButton>
													</SidebarMenuSubItem>
												))}
											</SidebarMenuSub>
										</CollapsibleContent>
									) : null}
								</SidebarMenuItem>
							</Collapsible>
						))}
					</SidebarMenu>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				<p className='text-sm text-center p-4'>© 2023 Tournler</p>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
