import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { AccessDenied } from '@/components/AccessDenied';
import { Editor } from '@/components/news/Editor';

export const metadata: Metadata = { title: 'Edit post', robots: { index: false } };

interface EditNewsPostPageProps {
	params: Promise<{ id: string }>;
}

export default async function EditNewsPostPage({ params }: EditNewsPostPageProps) {
	const { id } = await params;
	const session = await getAuthSession();
	if (!session) redirect('/sign-in');
	if (!(await userHasPermission(session.user.id, 'content:manage'))) return <AccessDenied resource='news' />;

	if (!/^\d{1,9}$/.test(id)) notFound();
	const post = await db.newsPost.findUnique({
		where: { id: Number(id) },
		select: { id: true, title: true, blurb: true, content: true, imageUrl: true, isFeatured: true },
	});
	if (!post) notFound();

	return (
		<div className='mx-auto my-8 w-full max-w-4xl px-4'>
			<h1 className='mb-6 text-2xl font-bold'>Edit post</h1>
			<Editor post={post} />
		</div>
	);
}
