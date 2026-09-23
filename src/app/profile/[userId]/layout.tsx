import type { Metadata } from 'next';
import { db } from '@/lib/db';

// The profile page is a client component, so its <title> comes from this segment layout.
// Same lookup order as GET /api/users/[slug]: user id first, then a case-insensitive name.
export async function generateMetadata({ params }: { params: Promise<{ userId: string }> }): Promise<Metadata> {
	const { userId } = await params;
	const slug = decodeURIComponent(userId);
	const user =
		(await db.user.findUnique({ where: { id: slug }, select: { name: true } })) ??
		(await db.user.findFirst({ where: { name: { equals: slug, mode: 'insensitive' } }, select: { name: true } }));

	return { title: user?.name ?? 'Player' };
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
	return children;
}
