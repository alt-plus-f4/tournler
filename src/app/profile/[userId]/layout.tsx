import type { Metadata } from 'next';
import { getProfileUser } from './_lib/load-profile';

// Profiles change with every match, badge and edit; always render per request.
export const dynamic = 'force-dynamic';

// Same lookup order as GET /api/users/[slug]: user id first, then a case-insensitive name.
// getProfileUser is React-cached, so this shares the page's query.
export async function generateMetadata({ params }: { params: Promise<{ userId: string }> }): Promise<Metadata> {
	const { userId } = await params;
	const user = await getProfileUser(decodeURIComponent(userId));
	return { title: user?.name ?? 'Player' };
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
	return children;
}
