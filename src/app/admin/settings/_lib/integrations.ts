import 'server-only';

export interface IntegrationGroup {
	title: string;
	description: string;
	checks: { label: string; configured: boolean }[];
}

function envConfigured(name: string): boolean {
	return Boolean(process.env[name]?.trim());
}

const check = (label: string) => ({ label, configured: envConfigured(label) });

/** Which integrations this environment has configured. Values are never exposed, only whether each is set. */
export function buildIntegrationGroups(): IntegrationGroup[] {
	return [
		{ title: 'Database', description: 'Primary Postgres connection.', checks: [check('DATABASE_URL')] },
		{
			title: 'Authentication',
			description: 'NextAuth session signing and magic-link email.',
			checks: ['NEXTAUTH_URL', 'NEXTAUTH_SECRET', 'EMAIL_SERVER_HOST', 'EMAIL_SERVER_PORT', 'EMAIL_FROM'].map(check),
		},
		{ title: 'Discord', description: 'Discord OAuth login and bot integration.', checks: ['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'DISCORD_BOT_TOKEN', 'DISCORD_GUILD_ID'].map(check) },
		{ title: 'Steam', description: 'Steam OpenID login.', checks: ['STEAM_API_KEY', 'STEAM_REDIRECT_URI'].map(check) },
		{ title: 'Storage', description: 'Avatar, team logo, and tournament banner uploads.', checks: [check('BLOB_READ_WRITE_TOKEN')] },
		{ title: 'CS2 game servers', description: 'Dedicated server connect info and score-ingestion auth.', checks: ['GAME_SERVER_IP', 'GAME_SERVER_TOKEN'].map(check) },
		{ title: 'Cron / automation', description: 'External scheduler that auto-starts tournaments (see /api/tournaments/check-start).', checks: ['CRON_API_KEY', 'CRON_SECRET'].map(check) },
	];
}
