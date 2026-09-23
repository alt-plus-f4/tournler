import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FaArrowLeft } from 'react-icons/fa6';

export default function TeamNotFound() {
	return (
		<div className='flex min-h-[60vh] items-center justify-center px-4 py-12'>
			<div className='w-full max-w-xl rounded-md border border-border bg-card p-8 text-center'>
				<h1 className='text-3xl font-black uppercase tracking-wide text-white'>Team not found</h1>
				<p className='mt-2 text-sm text-muted-foreground'>This team may have been deleted, or the link is wrong.</p>
				<Button asChild className='mt-6 gap-2'>
					<Link href='/teams'>
						<FaArrowLeft aria-hidden className='h-4 w-4' />
						Back to Teams
					</Link>
				</Button>
			</div>
		</div>
	);
}
