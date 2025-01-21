import { AdminSidebar } from '@/components/AdminSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
	return (
		<>
			<SidebarProvider>
				<AdminSidebar />
                {children}
			</SidebarProvider>
		</>
	);
}
