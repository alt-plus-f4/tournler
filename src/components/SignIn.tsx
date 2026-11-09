import Image from 'next/image';
import Link from 'next/link';
import { GameGlyph } from '@/components/games/GameMark';
import { cn } from '@/lib/utils';
import UserAuthForm from './UserAuthForm';

export interface SignInStats {
	teams: number;
	openTournaments: number;
}

interface SignInProps {
	/** Heading element for the title: 'h1' on the standalone /sign-in page, 'h2' inside a modal over another page. */
	headingAs?: 'h1' | 'h2';
	/** 'page' fills the viewport under the navbar; 'modal' fits the auth dialog. */
	variant?: 'page' | 'modal';
	/** Site-wide counts for the showcase; omitted when they couldn't be loaded. */
	stats?: SignInStats | null;
}

function plural(n: number, one: string, many: string) {
	return `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
}

/** Left half: the photo, the pitch and a couple of live counts. Hidden below lg on the page, below md in the modal. */
function Showcase({ variant, stats }: { variant: 'page' | 'modal'; stats?: SignInStats | null }) {
	const page = variant === 'page';
	return (
		<div className={cn('relative isolate overflow-hidden bg-black', page ? 'hidden lg:block' : 'hidden md:block')}>
			<Image src='/sign-in.jpg' alt='' fill priority={page} sizes={page ? '50vw' : '380px'} className='-z-10 object-cover opacity-60' />
			<div aria-hidden className='absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/60 to-black/30' />
			<div aria-hidden className='absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_50%_at_20%_100%,rgba(253,230,138,0.12),transparent_70%)]' />

			<div className={cn('flex h-full flex-col justify-between', page ? 'p-12 xl:p-16' : 'p-8')}>
				<Image src='/logo.png' alt='Tournler' width={210} height={32} className={cn('h-auto', page ? 'w-[150px]' : 'w-[110px]')} />

				<div className='flex flex-col gap-5'>
					<div className='flex gap-2'>
						<span className='inline-flex items-center gap-1.5 rounded-sm border border-white/15 bg-black/50 px-2 py-1 text-xs font-bold uppercase tracking-widest text-neutral-100'>
							<GameGlyph game='CS2' className='h-3.5 w-3.5' />
							CS2
						</span>
						<span className='inline-flex items-center gap-1.5 rounded-sm border border-white/15 bg-black/50 px-2 py-1 text-xs font-bold uppercase tracking-widest text-neutral-100'>
							<GameGlyph game='LOL' className='h-3.5 w-3.5 rounded-sm' />
							League
						</span>
					</div>
					<p className={cn('font-black uppercase leading-[0.95] tracking-wide text-white text-balance', page ? 'text-5xl xl:text-6xl' : 'text-3xl')}>Tournaments for school teams</p>
					<p className={cn('max-w-md text-neutral-300', page ? 'text-base' : 'text-sm')}>
						Build a team of five, sign up for brackets and play on our own servers. Scores and stats land on your profile.
					</p>
					{/* Counts only appear when they say something; a row of zeros undersells the site. */}
					{page && stats && stats.teams > 0 && (
						<dl className='mt-2 flex gap-10 border-t border-white/10 pt-6'>
							<div>
								<dt className='text-xs font-bold uppercase tracking-[0.15em] text-neutral-400'>Teams</dt>
								<dd className='mt-1 font-mono text-3xl tabular-nums text-white'>{stats.teams.toLocaleString('en-US')}</dd>
							</div>
							{stats.openTournaments > 0 && (
								<div>
									<dt className='text-xs font-bold uppercase tracking-[0.15em] text-neutral-400'>Open tournaments</dt>
									<dd className='mt-1 font-mono text-3xl tabular-nums text-white'>{stats.openTournaments.toLocaleString('en-US')}</dd>
								</div>
							)}
						</dl>
					)}
				</div>
			</div>
		</div>
	);
}

/** The split sign-in: showcase on the left, the form on the right. Used by /sign-in and its modal. */
const SignIn = ({ headingAs: Heading = 'h1', variant = 'page', stats }: SignInProps) => {
	const page = variant === 'page';
	return (
		<div className={cn('grid w-full', page ? 'min-h-[calc(100dvh-4rem)] lg:grid-cols-2' : 'md:grid-cols-[1fr_1.1fr]')}>
			<Showcase variant={variant} stats={stats} />

			<div className={cn('flex flex-col justify-center', page ? 'stage-grid px-6 py-12 sm:px-12 lg:px-16' : 'px-6 py-10 sm:px-10')}>
				<div className='mx-auto flex w-full max-w-sm flex-col gap-8'>
					<div className='flex flex-col gap-2'>
						<span className='text-xs font-bold uppercase tracking-[0.2em] text-neutral-400'>Welcome back</span>
						<Heading className={cn('font-black uppercase tracking-wide text-white', page ? 'text-4xl' : 'text-3xl')}>Sign in</Heading>
						<p className='text-sm text-neutral-400'>
							{stats && !page ? `Join ${plural(stats.teams, 'team', 'teams')} already on Tournler. ` : ''}
							After signing in you&apos;ll link Steam (needed for CS2 match servers) or a Riot ID for League.
						</p>
					</div>

					<UserAuthForm />

					<p className='text-xs text-neutral-500'>
						By continuing, you agree to our{' '}
						<Link href='/terms' className='text-neutral-300 underline underline-offset-4 hover:text-white'>
							Terms of Service
						</Link>{' '}
						and{' '}
						<Link href='/privacy' className='text-neutral-300 underline underline-offset-4 hover:text-white'>
							Privacy Policy
						</Link>
						.
					</p>
				</div>
			</div>
		</div>
	);
};

export default SignIn;
