import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';
import { getUserRole, hasPermission } from '@/lib/helpers/permissions';
import { AccessDenied } from '@/components/AccessDenied';
import { AdminPage, AdminHeader } from '@/components/admin/AdminPage';
import { SITE_SETTINGS_ID } from '@/lib/site-settings';
import { DEFAULT_THEME, themeIdFromEnum } from '@/lib/theme';
import { parseHomepageLayout } from '@/lib/home/layouts';
import { buildIntegrationGroups } from './_lib/integrations';
import { SettingsClient } from './_components/SettingsClient';

// Reports the server's runtime environment and live settings; must not be frozen at build time.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Settings' };

/**
 * Admin settings: General (environment), Appearance (default theme, homepage layout), Badges
 * (placement matrix, player choice), Integrations (env checks) and the Danger zone. Viewing needs
 * admin:access; each section's controls are enabled per permission and every save re-checks on the API.
 */
export default async function AdminSettingsPage() {
	const session = await getAuthSession();
	const role = session ? await getUserRole(session.user.id) : null;
	if (!hasPermission(role, 'admin:access')) return <AccessDenied resource='settings' />;

	const [site, homepage, badges] = await Promise.all([
		db.siteSettings.findUnique({ where: { id: SITE_SETTINGS_ID } }),
		db.homepageSettings.findUnique({ where: { id: 1 }, select: { pageLayout: true } }),
		db.badge.findMany({
			orderBy: { createdAt: 'asc' },
			select: {
				id: true,
				name: true,
				description: true,
				icon: true,
				color: true,
				imageUrl: true,
				showInTrophyRow: true,
				showOnAvatar: true,
				showNextToName: true,
				_count: { select: { awards: true } },
			},
		}),
	]);

	const vercelEnv = process.env.VERCEL_ENV;
	const general = {
		environment: vercelEnv ?? process.env.NODE_ENV ?? 'unknown',
		siteUrl: process.env.NEXTAUTH_URL?.trim() || null,
		signIn: [
			{ label: 'Email magic link', enabled: Boolean(process.env.EMAIL_SERVER_HOST?.trim() && process.env.EMAIL_FROM?.trim()) },
			{ label: 'Discord', enabled: Boolean(process.env.DISCORD_CLIENT_ID?.trim() && process.env.DISCORD_CLIENT_SECRET?.trim()) },
			{ label: 'Steam', enabled: Boolean(process.env.STEAM_API_KEY?.trim()) },
		],
	};

	return (
		<AdminPage>
			<AdminHeader title='Settings' subtitle='Site-wide appearance, where badges show up, and which integrations this environment has configured.' />
			<SettingsClient
				general={general}
				appearance={{ defaultTheme: themeIdFromEnum(site?.defaultTheme) ?? DEFAULT_THEME, pageLayout: parseHomepageLayout(homepage?.pageLayout) }}
				badges={badges.map(({ _count, ...b }) => ({ ...b, holders: _count.awards }))}
				playerBadgeChoice={site?.playerBadgeChoice ?? true}
				integrations={buildIntegrationGroups()}
				can={{ content: hasPermission(role, 'content:manage'), tournaments: hasPermission(role, 'tournaments:manage') }}
			/>
		</AdminPage>
	);
}
