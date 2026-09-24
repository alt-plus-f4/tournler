import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { AccessDenied } from '@/components/AccessDenied';
import { Editor } from '@/components/news/Editor';

export const metadata: Metadata = { title: 'Write a post', robots: { index: false } };

export default async function NewNewsPostPage() {
	const session = await getAuthSession();
	if (!session) redirect('/sign-in');
	if (!(await userHasPermission(session.user.id, 'content:manage'))) return <AccessDenied resource='news' />;

	return (
		<div className='mx-auto my-8 w-full max-w-4xl px-4'>
			<h1 className='mb-6 text-2xl font-bold'>Write a post</h1>
			<Editor />
		</div>
	);
}
