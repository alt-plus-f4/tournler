import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FaArrowLeft } from 'react-icons/fa6';

export default function TournamentNotFound() {
	return (
		<div className='min-h-screen bg-black px-4 py-12 flex items-center justify-center'>
			<Card className='w-full max-w-xl border-gray-800 bg-gradient-to-br from-zinc-950 to-black'>
				<CardContent className='p-8 text-center space-y-6'>
					<div className='mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-3xl font-black text-red-400'>404</div>
					<div className='space-y-2'>
						<h1 className='text-3xl font-extrabold text-white'>Tournament not found</h1>
						<p className='text-sm text-zinc-400'>This tournament may have finished, been removed, or the link is invalid.</p>
					</div>
					<Button asChild className='gap-2'>
						<Link href='/tournaments'>
							<FaArrowLeft className='h-4 w-4' />
							Back to Tournaments
						</Link>
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
