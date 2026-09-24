import type { Metadata } from 'next';
import { getProfileUser } from './_lib/load-profile';

// Profiles change with every match, badge and edit; always render per request.
export const dynamic = 'force-dynamic';

// Same lookup order as GET /api/users/[slug]: user id first, then a case-insensitive name.
// getProfileUser is React-cached, so this shares the page's query.
export async function generateMetadata({ params }: { params: Promise<{ userId: string }> }): Promise<Metadata> {
	const { userId } = await params;
	const user = await getProfileUser(decodeURIComponent(userId));
	if (!user) return { title: 'Player' };
	const name = user.name ?? 'Player';
	return { title: name, description: `${name} on Tournler: CS2 stats, recent matches, team and trophies.` };
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
	return children;
}
