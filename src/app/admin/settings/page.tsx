import type { Metadata } from 'next';
import { CircleCheck, CircleX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdminPage, AdminHeader, AdminPanel, StatusPill } from '@/components/admin/AdminPage';

// Reports the server's runtime environment; must not be frozen at build time.
export const dynamic = 'force-dynamic';

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

export const metadata: Metadata = { title: 'System status' };

export default function AdminSettingsPage() {
	const groups = buildStatusGroups();

	return (
		<AdminPage>
			<AdminHeader title='System status' subtitle='Read-only view of which integrations are configured for this environment. Values are never shown, only whether each is set.' />

			<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
				{groups.map((group) => {
					const missing = group.checks.filter((c) => !c.configured).length;
					return (
						<AdminPanel key={group.title} className='flex flex-col gap-4'>
							<div className='flex items-start justify-between gap-3'>
								<div className='min-w-0'>
									<h2 className='text-sm font-black uppercase tracking-wide'>{group.title}</h2>
									<p className='mt-1 text-sm text-muted-foreground'>{group.description}</p>
								</div>
								<StatusPill tone={missing === 0 ? 'ready' : 'hold'}>{missing === 0 ? 'Ready' : `${missing} missing`}</StatusPill>
							</div>
							<div className='space-y-2 border-t border-border pt-4'>
								{group.checks.map((check) => (
									<div key={check.label} className='flex items-center justify-between gap-3 text-sm'>
										<span className='min-w-0 truncate font-mono text-xs'>{check.label}</span>
										<span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', check.configured ? 'text-signal-ready-text' : 'text-signal-live')}>
											{check.configured ? <CircleCheck aria-hidden size='1em' /> : <CircleX aria-hidden size='1em' />}
											{check.configured ? 'Set' : 'Missing'}
										</span>
									</div>
								))}
							</div>
						</AdminPanel>
					);
				})}
			</div>
		</AdminPage>
	);
}
