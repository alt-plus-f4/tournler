import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import { userHasPermission } from '@/lib/helpers/permissions';
import { HOME_LAYOUTS } from '@/lib/home/layouts';
import { HomeLayoutView } from '../../_components/home-layouts';

export const metadata: Metadata = {
	title: 'Homepage preview',
	robots: { index: false, follow: false },
};

/**
 * Staff-only preview of one homepage layout (slug classic|season|doors|campus|week), with real
 * data. Anyone without `content:manage` gets a 404, so the route does not reveal itself.
 */
export default async function HomePreviewPage({ params }: { params: Promise<{ layout: string }> }) {
	const { layout: slug } = await params;
	const layout = HOME_LAYOUTS.find((item) => item.value.toLowerCase() === slug);
	if (!layout) notFound();

	const session = await getAuthSession();
	const allowed = session ? await userHasPermission(session.user.id, 'content:manage') : false;
	if (!allowed) notFound();

	return (
		<>
			<div className='border-b border-border bg-neutral-950'>
				<div className='container mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-2 text-xs lg:px-8'>
					<p className='font-bold uppercase tracking-[0.2em] text-muted-foreground'>
						Preview: <span className='text-white'>{layout.label}</span> (not live)
					</p>
					<Link href='/admin/featured' className='font-medium uppercase text-muted-foreground transition-colors hover:text-white'>
						Back to featured
					</Link>
				</div>
			</div>
			<HomeLayoutView layout={layout.value} />
		</>
	);
}
