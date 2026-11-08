import { AdminSidebar } from '@/components/AdminSidebar';
import { getAdminSidebarData } from '@/lib/admin/nav-counts';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
	title: {
		template: '%s — Admin · Tournler',
		default: 'Admin',
	},
};

// Staff-only access is enforced once in src/proxy.ts; each admin page then checks its own
// permission server-side, so the layout itself doesn't block rendering on a session lookup: the
// sidebar's counts/current user are passed as an un-awaited promise (it resolves to null for anyone
// without admin:access) and stream in.
export default function AdminLayout({ children }: { children: ReactNode }) {
	const sidebarData = getAdminSidebarData();
	return (
		<SidebarProvider>
			<AdminSidebar data={sidebarData} />
			<div className='flex-1 h-svh overflow-y-auto'>{children}</div>
		</SidebarProvider>
	);
}
