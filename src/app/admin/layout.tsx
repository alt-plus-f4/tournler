import { AdminSidebar } from '@/components/AdminSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { getAuthSession } from '@/lib/auth';
import { isAdmin } from '@/lib/helpers/is-admin';
import { ReactNode } from 'react';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
	children,
}: {
	children: ReactNode;
}) {
	const session = await getAuthSession();
	const isAdminStatus = session ? await isAdmin(session.user.id) : false;

	// Redirect if not authenticated or not an admin
	if (!session || !isAdminStatus) redirect('/');

	return (
		<SidebarProvider>
			<AdminSidebar />
			{children}
		</SidebarProvider>
	);
}
