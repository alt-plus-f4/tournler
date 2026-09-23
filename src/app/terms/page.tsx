import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDocument, type LegalSection } from '@/components/legal/LegalDocument';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = {
	title: 'Terms of Service · Tournler',
	description: 'The rules for using Tournler: accounts, fair play, tournaments, game servers, content and liability.',
};

const mail = <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>;

const sections: LegalSection[] = [
	{
		id: 'agreement',
		title: 'Agreement',
		body: (
			<>
				<p>
					These terms are an agreement between you and {LEGAL.operator} (&ldquo;we&rdquo;, &ldquo;us&rdquo;), who operates Tournler from {LEGAL.country}. By creating an account or using Tournler you accept them. If you don&apos;t agree, don&apos;t use the service.
				</p>
				<p>
					How we handle personal data is described in the <Link href='/privacy'>Privacy Policy</Link>, which is part of these terms.
				</p>
			</>
		),
	},
	{
		id: 'service',
		title: 'The service',
		body: (
			<>
				<p>
					Tournler lets organisers run Counter-Strike 2 tournaments and pickup matches. It handles registration, brackets and map veto, provisions a game server for each match, and records results and statistics that the server reports.
				</p>
				<p>
					Tournler is free and is still in development. Features may change, pause or stop, and matches can be disrupted by server, network or game-update problems we don&apos;t control. We don&apos;t guarantee that the service or any server will be available at a given time.
				</p>
			</>
		),
	},
	{
		id: 'eligibility',
		title: 'Eligibility and accounts',
		body: (
			<ul>
				<li>
					You must be at least {LEGAL.minimumAge}. If you are under the age of digital consent where you live, you need a parent or guardian&apos;s permission.
				</li>
				<li>
					You sign in with an email link, Discord or Steam. Keep access to those accounts secure. You are responsible for what happens under your Tournler account.
				</li>
				<li>Connecting to match servers requires a linked Steam account that you own and that is allowed to play CS2 online.</li>
				<li>One account per person. Don&apos;t share, sell or transfer accounts, and don&apos;t create a new one to get around a ban.</li>
			</ul>
		),
	},
	{
		id: 'conduct',
		title: 'Fair play and conduct',
		body: (
			<>
				<p>You agree not to:</p>
				<ul>
					<li>cheat, use hacks, exploits or any third-party software that gives an unfair advantage, or play on a Steam account with an active VAC or game ban;</li>
					<li>let someone else play on your account, or play on someone else&apos;s (&ldquo;smurfing&rdquo; or account boosting);</li>
					<li>fix matches, throw games, or bet on matches you play in;</li>
					<li>harass, threaten or discriminate against others, or use hateful or sexual names, team names, avatars or logos;</li>
					<li>impersonate a person, team or organisation, including Tournler staff;</li>
					<li>attack, overload, reverse-engineer or misuse Tournler or its game servers, or use their connection details or RCON outside the match you were given them for;</li>
					<li>scrape the site or use it for spam, advertising or anything illegal.</li>
				</ul>
				<p>
					Tournament organisers and staff may disqualify players or teams, overturn results, or remove content for breaking these rules or a tournament&apos;s own rules.
				</p>
			</>
		),
	},
	{
		id: 'tournaments',
		title: 'Tournaments, organisers and prizes',
		body: (
			<>
				<p>
					Each tournament is run by its organiser, who sets its format, schedule and rules. Organisers are responsible for running their event fairly and for any promise they make, including a listed <strong>prize pool</strong>.
				</p>
				<p>
					Tournler doesn&apos;t collect entry fees, hold prize money or pay out prizes, and it isn&apos;t a party to any prize arrangement between an organiser and players. Take any prize dispute up with the organiser.
				</p>
				<p>
					Results come from the game server where possible. Organisers and staff may correct a result, for example when a server fails or a rule is broken. Their decision on a match is final within Tournler.
				</p>
			</>
		),
	},
	{
		id: 'servers',
		title: 'Game servers, stats and demos',
		body: (
			<ul>
				<li>Each match gets a server that only its rostered players can join. Connection details and passwords are for those players only.</li>
				<li>
					Every match is recorded. Scores, player statistics and <strong>demos</strong> (recordings that include every player&apos;s in-game name, Steam ID and gameplay) are published on the match page. By playing, you agree to this.
				</li>
				<li>Admins can pause, restart or end a match and send commands to the server while it runs.</li>
			</ul>
		),
	},
	{
		id: 'content',
		title: 'Your content',
		body: (
			<>
				<p>
					You keep ownership of what you upload or write: nicknames, bios, avatars, team names and logos. You give us a worldwide, non-exclusive, royalty-free licence to host, display and distribute it as part of running Tournler, for as long as it stays on the service and afterwards in historical match and tournament records.
				</p>
				<p>
					Only upload content you have the right to use. Don&apos;t use another team&apos;s or company&apos;s logo or name unless you are allowed to. We may remove content that breaks these terms or someone else&apos;s rights. To report content, email {mail}.
				</p>
			</>
		),
	},
	{
		id: 'third-parties',
		title: 'Third-party services and trademarks',
		body: (
			<>
				<p>
					Tournler connects to Steam, Discord and FACEIT, whose own terms apply when you use them. Counter-Strike 2, Steam and their logos are trademarks of Valve Corporation. FACEIT is a trademark of its owner.
				</p>
				<p>Tournler isn&apos;t affiliated with, endorsed by or sponsored by Valve, Discord or FACEIT. Team names and logos belong to their owners.</p>
			</>
		),
	},
	{
		id: 'termination',
		title: 'Suspension and termination',
		body: (
			<>
				<p>
					You can stop using Tournler at any time and delete your account from your profile page, or by emailing {mail}.
				</p>
				<p>
					We may suspend or close an account, or remove it from a tournament, if it breaks these terms, puts other users or the service at risk, or if the law requires it. Where it is reasonable to do so, we will tell you why.
				</p>
			</>
		),
	},
	{
		id: 'liability',
		title: 'Disclaimers and liability',
		body: (
			<>
				<p>
					Tournler is provided free of charge, &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the extent the law allows, we don&apos;t give warranties about its availability, accuracy or fitness for a particular purpose, and we aren&apos;t liable for lost matches, rankings, prizes, data or other indirect losses.
				</p>
				<p>
					Nothing in these terms limits liability that cannot be limited by law, including liability for death or personal injury caused by negligence, for fraud, or for intent or gross negligence, and nothing affects your statutory rights as a consumer.
				</p>
			</>
		),
	},
	{
		id: 'law',
		title: 'Governing law',
		body: (
			<p>
				These terms are governed by the laws of {LEGAL.country}. Disputes go to the competent courts of {LEGAL.country}. If you are a consumer living in another EU country, you keep the protection of that country&apos;s mandatory consumer laws and can also bring a claim in its courts.
			</p>
		),
	},
	{
		id: 'changes',
		title: 'Changes to these terms',
		body: (
			<p>
				We may update these terms as Tournler changes. We will move the &ldquo;Last updated&rdquo; date, and for significant changes tell signed-in users on the site before they take effect. If you keep using Tournler after that, the new terms apply.
			</p>
		),
	},
	{
		id: 'contact',
		title: 'Contact',
		body: <p>Questions about these terms: {mail}.</p>,
	},
];

export default function TermsPage() {
	return (
		<LegalDocument
			title='Terms of Service'
			updated={LEGAL.updated}
			sibling={{ href: '/privacy', label: 'Privacy Policy' }}
			intro={<p>The rules for using Tournler: who can play, how to behave, how tournaments, servers and results work, and what we&apos;re responsible for.</p>}
			sections={sections}
		/>
	);
}
