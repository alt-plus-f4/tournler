import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { CalendarClock, ClipboardList, Flag, Gamepad2, LogIn, MonitorPlay, Play, Server, ShieldCheck, Swords, Trophy, Users } from 'lucide-react';

export const metadata: Metadata = {
	title: 'How it works',
	description: 'How a Tournler CS2 tournament runs, for organizers and for players.',
};

function Step({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
	return (
		<li className='grid grid-cols-[1.5rem_1fr] gap-x-4'>
			<span className='mt-1 text-muted-foreground' aria-hidden>
				{icon}
			</span>
			<div>
				<h3 className='text-lg font-bold text-white'>{title}</h3>
				<div className='mt-1 space-y-2 text-neutral-300'>{children}</div>
			</div>
		</li>
	);
}

const ICON = 'h-5 w-5';
const LINK = 'font-medium text-white underline underline-offset-4 hover:text-neutral-300';

export default function InformationPage() {
	return (
		<div className='container mx-auto max-w-[1400px] px-4 py-12 lg:px-8'>
			<div className='mx-auto max-w-prose'>
				<h1 className='text-4xl font-black uppercase tracking-wide text-white'>How Tournler works</h1>
				<p className='mt-4 text-lg text-neutral-300'>
					Tournler runs a CS2 tournament end to end: registration, bracket, server, match and result. The organizer sets up the event. Tournler generates the bracket, loads a CS2 server for every match, and records the score the game server reports.
				</p>

				<nav aria-label='On this page' className='mt-8 flex flex-wrap gap-x-6 gap-y-2 border-y border-border py-3 text-sm'>
					<a href='#organizers' className={LINK}>
						For organizers
					</a>
					<a href='#players' className={LINK}>
						For players
					</a>
				</nav>

				<section id='organizers' aria-labelledby='organizers-heading' className='mt-12 scroll-mt-24'>
					<h2 id='organizers-heading' className='text-2xl font-bold text-white'>
						For organizers
					</h2>
					<p className='mt-2 text-muted-foreground'>Creating and starting tournaments currently needs a staff role (tournament admin or admin).</p>

					<ol className='mt-8 space-y-8'>
						<Step icon={<Swords className={ICON} />} title='Pick a format'>
							<ul className='list-disc space-y-1 pl-5'>
								<li>
									<strong className='text-white'>Single elimination.</strong> Losers are out. The two semifinal losers play a 3rd-place match.
								</li>
								<li>
									<strong className='text-white'>Double elimination.</strong> A winners and a losers bracket that meet in a grand final. Needs at least 4 teams.
								</li>
								<li>
									<strong className='text-white'>Round robin.</strong> Every team plays every other team once, ranked in a standings table.
								</li>
							</ul>
						</Step>

						<Step icon={<ClipboardList className={ICON} />} title='Open registration'>
							<p>Teams register themselves from the tournament page until the start time or until every slot is taken. A tournament needs at least 2 registered teams to start.</p>
						</Step>

						<Step icon={<Play className={ICON} />} title='Start it, or let it start itself'>
							<p>
								Start a tournament from its page with <strong className='text-white'>Start tournament</strong>. The confirmation shows the registered teams against capacity before anything happens. If you don&apos;t, a scheduled check starts it once its start time has passed, so it can begin a few minutes late.
							</p>
							<p>Starting locks the teams, generates the bracket and creates every match.</p>
						</Step>

						<Step icon={<Server className={ICON} />} title='Servers are handled for you'>
							<p>
								Each match gets a CS2 dedicated server from Tournler&apos;s pool, configured through MatchZy. About 5 minutes before a match&apos;s scheduled start, the server is loaded with that match so players can connect and warm up. You never hand out IPs or passwords.
							</p>
							<p>Only as many matches can run at once as there are servers in the pool.</p>
						</Step>

						<Step icon={<Trophy className={ICON} />} title='Scores come from the server'>
							<p>
								A match goes live when the game server reports that the series has started. The server reports the score as it happens. When a series ends, the winner advances in the bracket automatically and player stats are recorded.
							</p>
						</Step>

						<Step icon={<ShieldCheck className={ICON} />} title='Step in from the match room'>
							<p>Admins can pause, resume, restart or end a match from its match page. Those controls send real commands to the server. If the server fails to report a score, an admin can enter it by hand there.</p>
						</Step>
					</ol>
				</section>

				<section id='players' aria-labelledby='players-heading' className='mt-16 scroll-mt-24'>
					<h2 id='players-heading' className='text-2xl font-bold text-white'>
						For players
					</h2>

					<ol className='mt-8 space-y-8'>
						<Step icon={<LogIn className={ICON} />} title='Sign in'>
							<p>
								<Link href='/sign-in' className={LINK}>
									Sign in
								</Link>{' '}
								with Steam, Discord or an email link.
							</p>
						</Step>

						<Step icon={<Gamepad2 className={ICON} />} title='Link your Steam account'>
							<p>You need a linked Steam account to connect to match servers. The server knows you by it. Link it from your profile if you signed in another way. It also lets your profile show your FACEIT level, if you have one.</p>
						</Step>

						<Step icon={<Users className={ICON} />} title='Put a team together'>
							<p>
								Go to{' '}
								<Link href='/teams' className={LINK}>
									Teams
								</Link>{' '}
								to create a team and invite your teammates.
							</p>
						</Step>

						<Step icon={<CalendarClock className={ICON} />} title='Register for a tournament'>
							<p>
								Open a tournament from{' '}
								<Link href='/tournaments' className={LINK}>
									Tournaments
								</Link>{' '}
								and register your team while registration is open. The bracket and your matches appear once the tournament starts.
							</p>
						</Step>

						<Step icon={<Flag className={ICON} />} title='Ban and pick maps'>
							<p>Before the match, both teams take turns banning and picking maps from the tournament&apos;s map pool on the match page. The match can&apos;t start until the veto is done.</p>
						</Step>

						<Step icon={<MonitorPlay className={ICON} />} title='Connect when your server is ready'>
							<p>The match page tells you when your server is ready, about 5 minutes before the start. It then shows the server address, a button that launches CS2 and connects you, and a button that copies the console command. Join early to warm up.</p>
						</Step>
					</ol>

					<p className='mt-10 border-t border-border pt-6 text-muted-foreground'>
						<strong className='text-white'>Pickup matches</strong> work without teams: join a side from the match page, up to 5 players each, with no map veto.
					</p>
				</section>
			</div>
		</div>
	);
}
