import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowRight, ClipboardList, LogIn, ShieldCheck, Trophy, Users } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';
import { OpenTournamentsBlock, RankingBlock, TickerBlock } from './blocks';
import { Eyebrow, SectionHead } from './parts';
import { RankingSkeleton, TickerSkeleton } from './skeletons';

function Steps({ steps }: { steps: string[] }) {
	return (
		<ol className='flex flex-col gap-3'>
			{steps.map((step, i) => (
				<li key={step} className='flex items-start gap-3 text-sm'>
					<i className='mt-px grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border border-current font-mono text-[11px] font-bold not-italic opacity-80' aria-hidden>
						{i + 1}
					</i>
					<span>{step}</span>
				</li>
			))}
		</ol>
	);
}

const HOW_IT_WORKS = [
	{ icon: LogIn, title: 'Sign in', text: 'Sign in with Discord or email and link your Steam or Riot account.' },
	{ icon: Users, title: 'Build a team', text: 'Join your school team or create one and invite your classmates.' },
	{ icon: Trophy, title: 'Play', text: 'Register for a tournament. Brackets, servers and results run themselves.' },
];

/** DOORS: two entry points (play / organize), this week's matches, open tournaments, ranking and a how-it-works row. Static links only, so the page stays cacheable. */
export function DoorsHome() {
	return (
		<div className='container mx-auto max-w-[1400px] px-4 py-8 lg:px-8'>
			<div className='mx-auto mb-8 mt-2 max-w-3xl text-center sm:mb-10'>
				<Eyebrow className='mb-3.5'>Tournler for schools</Eyebrow>
				<h1 className='text-3xl font-black uppercase tracking-wide text-white sm:text-5xl'>Competitive gaming for school teams</h1>
				<p className='mx-auto mt-4 max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground'>Brackets, schedules and live results for school tournaments. Organizers set it up, players just play.</p>
			</div>

			<div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
				<section aria-labelledby='door-play' className='flex min-h-[320px] flex-col gap-5 rounded-lg border border-neutral-700 bg-gradient-to-b from-neutral-900 to-black p-6 transition-colors hover:border-white sm:p-7'>
					<div className='flex items-center justify-between text-muted-foreground'>
						<Eyebrow>I play</Eyebrow>
						<Users aria-hidden className='h-[22px] w-[22px]' />
					</div>
					<h2 id='door-play' className='text-3xl font-black uppercase tracking-wide text-white'>
						Play for your school
					</h2>
					<div className='text-neutral-200'>
						<Steps steps={['Sign in and link your Steam or Riot account', 'Join a team or create one with your classmates', 'Register your team for a tournament']} />
					</div>
					<div className='mt-auto flex flex-wrap gap-3 pt-2'>
						<Link href='/sign-in' className={cn(buttonVariants({ size: 'lg' }), 'font-bold')}>
							Sign in
						</Link>
						<Link href='/teams' className={buttonVariants({ variant: 'outline', size: 'lg' })}>
							Teams
						</Link>
						<Link href='/tournaments' className={buttonVariants({ variant: 'outline', size: 'lg' })}>
							Tournaments
						</Link>
					</div>
				</section>

				<section aria-labelledby='door-organize' className='flex min-h-[320px] flex-col gap-5 rounded-lg border border-white bg-white p-6 text-black sm:p-7'>
					<div className='flex items-center justify-between text-black/70'>
						<p className='text-xs font-bold uppercase tracking-[0.2em]'>I organize</p>
						<ShieldCheck aria-hidden className='h-[22px] w-[22px]' />
					</div>
					<h2 id='door-organize' className='text-3xl font-black uppercase tracking-wide'>
						Run a tournament
					</h2>
					<Steps steps={['Create a tournament and pick the format', 'Open registration for teams', 'Matches and game servers are handled for you']} />
					<div className='mt-auto flex flex-wrap gap-3 pt-2'>
						<Link href='/information#organizers' className={cn(buttonVariants({ size: 'lg' }), 'bg-black font-bold text-white hover:bg-neutral-800')}>
							How organizing works
							<ArrowRight aria-hidden />
						</Link>
						<Link href='/sign-in' className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'border-black/30 bg-transparent text-black hover:bg-black/10 hover:text-black')}>
							Sign in
						</Link>
					</div>
				</section>
			</div>

			<div className='mt-9'>
				<Suspense fallback={<TickerSkeleton />}>
					<TickerBlock />
				</Suspense>
			</div>

			<div className='mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]'>
				<section aria-labelledby='doors-open' className='min-w-0'>
					<SectionHead id='doors-open' title='Open for registration' href='/tournaments' />
					<Suspense fallback={<OpenSkeleton />}>
						<OpenTournamentsBlock />
					</Suspense>
				</section>
				<section aria-labelledby='doors-ranking' className='min-w-0'>
					<SectionHead id='doors-ranking' title='Team ranking' />
					<Suspense fallback={<RankingSkeleton />}>
						<RankingBlock limit={5} />
					</Suspense>
				</section>
			</div>

			<section aria-labelledby='doors-how' className='mt-12'>
				<SectionHead id='doors-how' title='How it works' href='/information' linkLabel='Read more' />
				<ol className='grid grid-cols-1 gap-3 md:grid-cols-3'>
					{HOW_IT_WORKS.map(({ icon: Icon, title, text }, i) => (
						<li key={title}>
							<Link
								href='/information'
								className='group flex h-full gap-4 rounded-md border border-border bg-black p-4 transition-colors hover:border-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5'
							>
								<span className='grid h-10 w-10 shrink-0 place-items-center rounded-md border border-border text-white'>
									<Icon aria-hidden className='h-5 w-5' />
								</span>
								<span className='min-w-0'>
									<span className='block text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground'>Step {i + 1}</span>
									<span className='mt-1 block text-lg font-black uppercase tracking-wide text-white'>{title}</span>
									<span className='mt-1 block text-sm text-muted-foreground'>{text}</span>
								</span>
							</Link>
						</li>
					))}
				</ol>
				<p className='mt-4 flex items-center gap-2 text-sm text-muted-foreground'>
					<ClipboardList aria-hidden className='h-4 w-4' />
					Organizing?{' '}
					<Link href='/information#organizers' className='font-medium text-white underline underline-offset-4 hover:text-neutral-300'>
						Read the organizer guide
					</Link>
				</p>
			</section>
		</div>
	);
}

function OpenSkeleton() {
	return (
		<div aria-hidden className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
			{Array.from({ length: 2 }).map((_, i) => (
				<div key={i} className='flex min-h-[200px] flex-col overflow-hidden rounded-md border border-border bg-black'>
					<div className='h-24 w-full bg-neutral-900' />
				</div>
			))}
		</div>
	);
}
