import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

interface StatusGroup {
	title: string;
	description: string;
	checks: { label: string; configured: boolean }[];
}

function envConfigured(name: string): boolean {
	return Boolean(process.env[name]?.trim());
}

function buildStatusGroups(): StatusGroup[] {
	return [
		{
			title: 'Database',
			description: 'Primary Postgres connection.',
			checks: [{ label: 'DATABASE_URL', configured: envConfigured('DATABASE_URL') }],
		},
		{
			title: 'Authentication',
			description: 'NextAuth session signing and magic-link email.',
			checks: [
				{ label: 'NEXTAUTH_URL', configured: envConfigured('NEXTAUTH_URL') },
				{ label: 'NEXTAUTH_SECRET', configured: envConfigured('NEXTAUTH_SECRET') },
				{ label: 'EMAIL_SERVER_HOST', configured: envConfigured('EMAIL_SERVER_HOST') },
				{ label: 'EMAIL_SERVER_PORT', configured: envConfigured('EMAIL_SERVER_PORT') },
				{ label: 'EMAIL_FROM', configured: envConfigured('EMAIL_FROM') },
			],
		},
		{
			title: 'Discord',
			description: 'Discord OAuth login and bot integration.',
			checks: [
				{ label: 'DISCORD_CLIENT_ID', configured: envConfigured('DISCORD_CLIENT_ID') },
				{ label: 'DISCORD_CLIENT_SECRET', configured: envConfigured('DISCORD_CLIENT_SECRET') },
				{ label: 'DISCORD_BOT_TOKEN', configured: envConfigured('DISCORD_BOT_TOKEN') },
				{ label: 'DISCORD_GUILD_ID', configured: envConfigured('DISCORD_GUILD_ID') },
			],
		},
		{
			title: 'Steam',
			description: 'Steam OpenID login.',
			checks: [
				{ label: 'STEAM_API_KEY', configured: envConfigured('STEAM_API_KEY') },
				{ label: 'STEAM_REDIRECT_URI', configured: envConfigured('STEAM_REDIRECT_URI') },
			],
		},
		{
			title: 'Storage',
			description: 'Avatar, team logo, and tournament banner uploads.',
			checks: [{ label: 'BLOB_READ_WRITE_TOKEN', configured: envConfigured('BLOB_READ_WRITE_TOKEN') }],
		},
		{
			title: 'CS2 Game Servers',
			description: 'Dedicated server connect info and score-ingestion auth.',
			checks: [
				{ label: 'GAME_SERVER_IP', configured: envConfigured('GAME_SERVER_IP') },
				{ label: 'GAME_SERVER_TOKEN', configured: envConfigured('GAME_SERVER_TOKEN') },
			],
		},
		{
			title: 'Cron / Automation',
			description: 'External scheduler that auto-starts tournaments (see /api/tournaments/check-start).',
			checks: [
				{ label: 'CRON_API_KEY', configured: envConfigured('CRON_API_KEY') },
				{ label: 'CRON_SECRET', configured: envConfigured('CRON_SECRET') },
			],
		},
	];
}

export default function AdminSettingsPage() {
	const groups = buildStatusGroups();

	return (
		<div className='mx-12 mt-12 w-[80%] overflow-hidden'>
			<h1 className='text-2xl font-bold mb-2'>System Status</h1>
			<p className='text-muted-foreground mb-6'>Read-only view of which integrations are configured for this environment. Values are never shown, only whether each is set.</p>

			<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
				{groups.map((group) => (
					<Card key={group.title}>
						<CardHeader>
							<CardTitle className='text-base'>{group.title}</CardTitle>
							<p className='text-sm text-muted-foreground'>{group.description}</p>
						</CardHeader>
						<CardContent className='space-y-2'>
							{group.checks.map((check) => (
								<div key={check.label} className='flex items-center justify-between text-sm'>
									<span className='font-mono'>{check.label}</span>
									{check.configured ? <FaCheckCircle className='text-green-500' /> : <FaTimesCircle className='text-red-500' />}
								</div>
							))}
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
