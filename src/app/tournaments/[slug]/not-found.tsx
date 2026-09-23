import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TournamentNotFound() {
	return (
		<div className='flex min-h-[60vh] items-center justify-center px-4 py-12'>
			<div className='w-full max-w-xl space-y-6 rounded-md border border-border p-8 text-center'>
				<p className='font-mono text-4xl font-black tabular-nums text-muted-foreground'>404</p>
				<div className='space-y-2'>
					<h1 className='text-3xl font-extrabold text-white'>Tournament not found</h1>
					<p className='text-sm text-muted-foreground'>This tournament may have been removed, or the link is wrong.</p>
				</div>
				<Button asChild className='gap-2'>
					<Link href='/tournaments'>
						<ArrowLeft className='h-4 w-4' aria-hidden />
						Back to tournaments
					</Link>
				</Button>
			</div>
		</div>
	);
}
