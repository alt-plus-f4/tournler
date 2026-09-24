import Link from 'next/link';

interface ForumHomeBlockProps {
	threads: { id: number; title: string; _count: { replies: number } }[];
}

/** HLTV-style homepage sidebar block: most recently active threads with reply counts. */
export function ForumHomeBlock({ threads }: ForumHomeBlockProps) {
	return (
		<section aria-labelledby='home-forum-heading' className='pt-4'>
			<div className='mb-3 flex items-center justify-between'>
				<h2 id='home-forum-heading' className='text-2xl font-bold tracking-tight'>
					Forum
				</h2>
				<Link href='/forum' className='text-base font-medium uppercase text-muted-foreground transition-colors hover:text-white'>
					All<span className='sr-only'> forum threads</span>
				</Link>
			</div>
			{threads.length > 0 ? (
				<ul className='divide-y divide-border overflow-hidden rounded-md border border-border'>
					{threads.map((thread) => (
						<li key={thread.id}>
							<Link href={`/forum/${thread.id}`} className='flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'>
								<span className='min-w-0 flex-1 truncate text-foreground'>{thread.title}</span>
								<span className='shrink-0 font-mono text-xs tabular-nums text-muted-foreground'>
									{thread._count.replies}
									<span className='sr-only'> {thread._count.replies === 1 ? 'reply' : 'replies'}</span>
								</span>
							</Link>
						</li>
					))}
				</ul>
			) : (
				<p className='rounded-md border border-border px-3 py-4 text-sm text-muted-foreground'>
					No posts yet —{' '}
					<Link href='/forum/new' className='text-foreground underline underline-offset-2'>
						start a thread
					</Link>
				</p>
			)}
		</section>
	);
}
