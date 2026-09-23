import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getAuthSession } from '@/lib/auth';
import { NewThreadForm } from '@/components/forum/NewThreadForm';
import { CATEGORY_SLUGS, parseCategorySlug } from '@/components/forum/forum-shared';

export const metadata: Metadata = { title: 'New thread · Forum', robots: { index: false } };

export default async function NewForumThreadPage({ searchParams }: { searchParams: Promise<{ category?: string | string[] }> }) {
	const query = await searchParams;
	const rawCategory = Array.isArray(query.category) ? query.category[0] : query.category;
	const category = parseCategorySlug(rawCategory) ?? 'GENERAL';

	const session = await getAuthSession();
	if (!session) {
		const back = rawCategory ? `/forum/new?category=${CATEGORY_SLUGS[category]}` : '/forum/new';
		redirect(`/sign-in?callbackUrl=${encodeURIComponent(back)}`);
	}

	return (
		<div className='container mx-auto max-w-3xl px-4 py-8'>
			<Link href='/forum' className='inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground'>
				<ArrowLeft aria-hidden className='h-4 w-4' />
				Forum
			</Link>
			<h1 className='mt-3 text-3xl font-black uppercase tracking-wide'>New thread</h1>
			<div className='mt-6 rounded-md border border-border p-4 sm:p-6'>
				<NewThreadForm defaultCategory={category} />
			</div>
		</div>
	);
}
