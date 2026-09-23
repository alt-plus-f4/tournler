import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDocument, type LegalSection } from '@/components/legal/LegalDocument';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = {
	title: 'Privacy Policy · Tournler',
	description: 'What personal data Tournler collects, why, who it is shared with, and your rights under the GDPR.',
};

const mail = <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>;

const sections: LegalSection[] = [
	{
		id: 'controller',
		title: 'Who is responsible',
		body: (
			<>
				<p>
					Tournler is operated by {LEGAL.operator}, an individual based in {LEGAL.country}, who is the controller of your personal data under the EU General Data Protection Regulation (GDPR) and the Bulgarian Personal Data Protection Act.
				</p>
				<p>For anything about your data, including the requests described below, email {mail}.</p>
			</>
		),
	},
	{
		id: 'data-we-collect',
		title: 'Data we collect',
		body: (
			<>
				<h3>Account data</h3>
				<ul>
					<li>
						<strong>Email address</strong>, if you sign in with a magic link or Discord.
					</li>
					<li>
						<strong>Nickname, bio and avatar</strong> you set during onboarding or on your profile.
					</li>
					<li>
						<strong>Discord account ID</strong> and the access token Discord issues when you sign in with or link Discord.
					</li>
					<li>
						<strong>Steam ID</strong> (your SteamID64) when you link Steam. We receive only the ID through Steam&apos;s OpenID sign-in, not your Steam password or library.
					</li>
					<li>Your account role (for example player or tournament admin) and when the account was created.</li>
				</ul>
				<h3>Competition data</h3>
				<ul>
					<li>Teams you create or join, team invitations, team names and logos.</li>
					<li>Tournaments you organise or play in, and the matches you take part in, including side, captain status, draft picks and map veto actions.</li>
					<li>
						<strong>Match statistics</strong> reported by the game server: kills, deaths and assists per match, and results derived from them.
					</li>
					<li>
						<strong>Match demos</strong>: recordings of the match that the game server uploads. A demo contains every player&apos;s in-game name, Steam ID and gameplay.
					</li>
					<li>Badges awarded to your profile and in-app notifications (for example team invites).</li>
				</ul>
				<h3>Technical data</h3>
				<p>
					Our hosting provider processes your IP address and basic request information (browser, time, requested page) to deliver the site and keep it secure. We don&apos;t run analytics, advertising or tracking tools.
				</p>
			</>
		),
	},
	{
		id: 'why',
		title: 'Why we use it, and our legal basis',
		body: (
			<table>
				<thead>
					<tr>
						<th>Purpose</th>
						<th>Legal basis (GDPR Art. 6)</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Creating your account, signing you in, and running teams, tournaments and matches you join</td>
						<td>Performance of our contract with you (Art. 6(1)(b))</td>
					</tr>
					<tr>
						<td>Sending your Steam ID and nickname to the match&apos;s game server so only rostered players can connect</td>
						<td>Performance of contract (Art. 6(1)(b))</td>
					</tr>
					<tr>
						<td>Publishing profiles, rosters, results, stats and demos so competitions are transparent and verifiable</td>
						<td>Legitimate interest in running fair, public competitions (Art. 6(1)(f))</td>
					</tr>
					<tr>
						<td>Looking up your public FACEIT level from your Steam ID to show on your profile</td>
						<td>Legitimate interest (Art. 6(1)(f)); unlink Steam to stop it</td>
					</tr>
					<tr>
						<td>Security, preventing cheating and abuse, and enforcing our Terms</td>
						<td>Legitimate interest (Art. 6(1)(f))</td>
					</tr>
					<tr>
						<td>Complying with legal obligations</td>
						<td>Legal obligation (Art. 6(1)(c))</td>
					</tr>
				</tbody>
			</table>
		),
	},
	{
		id: 'public',
		title: 'What is public',
		body: (
			<>
				<p>
					Tournler is a public competition platform. Anyone, signed in or not, can see your <strong>nickname, avatar, bio, team, badges, Steam and Discord IDs, match history, stats and demos</strong>, and your FACEIT level if one is found. Uploaded avatars, team logos and demos are stored as publicly accessible files.
				</p>
				<p>
					Your email address is never shown on your profile. Don&apos;t put anything in your nickname, bio or team name that you don&apos;t want to be public.
				</p>
			</>
		),
	},
	{
		id: 'sharing',
		title: 'Who we share it with',
		body: (
			<>
				<p>We don&apos;t sell your data or share it for advertising. We use these service providers (processors) to run Tournler:</p>
				<ul>
					<li>
						<strong>Vercel</strong>: hosting, and storage for avatars, logos and demos (Vercel Blob).
					</li>
					<li>
						<strong>Our database host</strong>: stores the account and competition data above.
					</li>
					<li>
						<strong>Convex</strong>: delivers real-time in-app notifications.
					</li>
					<li>
						<strong>Our email provider</strong>: sends sign-in links to your email address.
					</li>
					<li>
						<strong>CS2 game servers</strong> we run for each match: receive rostered players&apos; Steam IDs and nicknames, and send back scores, stats and demos.
					</li>
				</ul>
				<p>We also exchange data with these independent services when you use them:</p>
				<ul>
					<li>
						<strong>Discord</strong> and <strong>Steam (Valve)</strong>, when you sign in with or link those accounts. Their own privacy policies apply.
					</li>
					<li>
						<strong>FACEIT</strong>: we send your Steam ID to FACEIT&apos;s public Data API and receive your CS2 skill level and Elo. We cache the answer for about an hour and don&apos;t store it in our database.
					</li>
				</ul>
				<p>We may disclose data if the law requires it, or to protect the safety of users or the service.</p>
			</>
		),
	},
	{
		id: 'transfers',
		title: 'International transfers',
		body: (
			<p>
				Some of our providers, including Vercel and Convex, are based in or process data in the United States. Where data leaves the European Economic Area, we rely on the EU–U.S. Data Privacy Framework where the provider is certified, or on the European Commission&apos;s Standard Contractual Clauses.
			</p>
		),
	},
	{
		id: 'retention',
		title: 'How long we keep it',
		body: (
			<ul>
				<li>
					<strong>Account data</strong>: for as long as your account exists.
				</li>
				<li>
					<strong>Sign-in links</strong>: expire within 24 hours.
				</li>
				<li>
					<strong>Session cookie</strong>: up to 30 days, or until you sign out.
				</li>
				<li>
					<strong>Competition records</strong> (results, brackets, stats, demos): kept after a match so tournament history stays accurate. When you delete your account, we remove your account, profile, linked accounts, avatar, notifications and personal stats. Captaincy of your team passes to a teammate. On request we also remove or anonymise your name elsewhere where we reasonably can. Demos already published may still contain your in-game name and Steam ID. Organisers and news authors need to remove or hand over their tournaments and posts first, so other players&apos; results aren&apos;t lost.
				</li>
			</ul>
		),
	},
	{
		id: 'cookies',
		title: 'Cookies and browser storage',
		body: (
			<>
				<p>We only use what the site needs to work, so we don&apos;t ask for cookie consent:</p>
				<ul>
					<li>Sign-in cookies that keep you logged in and protect forms against cross-site request forgery.</li>
					<li>A cookie that remembers whether the sidebar is open, on pages that have one.</li>
					<li>Session storage that remembers which page to return you to after signing in, and whether you finished onboarding. It is cleared when you close the tab.</li>
				</ul>
				<p>No analytics, advertising or third-party tracking cookies are used.</p>
			</>
		),
	},
	{
		id: 'rights',
		title: 'Your rights',
		body: (
			<>
				<p>Under the GDPR you have the right to:</p>
				<ul>
					<li>access the personal data we hold about you and get a copy of it;</li>
					<li>correct inaccurate data (you can edit your nickname, bio and avatar yourself);</li>
					<li>have your data erased;</li>
					<li>restrict or object to processing based on our legitimate interests, including publication of your stats;</li>
					<li>receive your data in a portable, machine-readable format.</li>
				</ul>
				<p>
					You can do the most common ones yourself on your profile page, under <strong>Your data</strong>: <strong>Download my data</strong> gives you a JSON file of everything we store about you, and <strong>Delete account</strong> erases it. You can also unlink Steam there at any time.
				</p>
				<p>For anything else, email {mail} from the address on your account, or tell us your profile link. We answer within one month.</p>
				<p>
					You can also complain to the Bulgarian supervisory authority, the Commission for Personal Data Protection (<a href='https://www.cpdp.bg/en/'>cpdp.bg</a>), or to the authority where you live.
				</p>
			</>
		),
	},
	{
		id: 'children',
		title: 'Age requirement',
		body: (
			<p>
				You must be at least {LEGAL.minimumAge} to create an account, the age at which you can consent to online services yourself in Bulgaria. If you are under the digital-consent age where you live, you need a parent or guardian&apos;s permission. If you believe a younger child has created an account, email {mail} and we will delete it.
			</p>
		),
	},
	{
		id: 'security',
		title: 'Security',
		body: <p>We use encrypted connections (HTTPS), sign-in without passwords, and role-based access for staff tools. No system is perfectly secure; if a breach affects your data, we will notify you and the authority as the GDPR requires.</p>,
	},
	{
		id: 'changes',
		title: 'Changes to this policy',
		body: (
			<p>
				We will update this page when our data practices change and move the &ldquo;Last updated&rdquo; date. If a change is significant, we will tell signed-in users on the site before it takes effect. See also our <Link href='/terms'>Terms of Service</Link>.
			</p>
		),
	},
];

export default function PrivacyPage() {
	return (
		<LegalDocument
			title='Privacy Policy'
			updated={LEGAL.updated}
			sibling={{ href: '/terms', label: 'Terms of Service' }}
			intro={
				<p>
					This policy explains what personal data Tournler collects when you use it, why, who it goes to, and how to control it. The short version: we collect what&apos;s needed to run CS2 tournaments and matches, most of your competitive profile is public by design, and we don&apos;t sell data or track you with analytics.
				</p>
			}
			sections={sections}
		/>
	);
}
