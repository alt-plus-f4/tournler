'use client';

import { ConvexClientProvider } from '@/convex/ConvexClientProvider';
import Notifications from '@/components/Notifications';

/** The Convex client and its provider live only here, so pages don't ship them to every visitor. */
export default function NotificationsIsland({ userId }: { userId: string }) {
	return (
		<ConvexClientProvider signedIn>
			<Notifications userId={userId} />
		</ConvexClientProvider>
	);
}
