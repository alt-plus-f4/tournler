'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ExternalLink } from 'lucide-react';
import type { HomepageLayout } from '@prisma/client';
import { StatusPill } from '@/components/admin/AdminPage';
import { ThemePicker } from '@/components/ThemePicker';
import { TrophyIcon } from '@/components/trophies/TrophyIcon';
import { DeleteSimulatedTournamentsButton } from '@/components/DeleteSimulatedTournamentsButton';
import { HOME_LAYOUTS } from '@/lib/home/layouts';
import { BADGE_PLACEMENTS, BADGE_PLACEMENT_LABELS, badgeStatus, type BadgePlacement, type BadgePlacementFlags } from '@/lib/badges/placement';
import { readThemeCookie, type ThemeId } from '@/lib/theme';
import { useToast } from '@/lib/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { IntegrationGroup } from '../_lib/integrations';

export interface SettingsBadge extends BadgePlacementFlags {
	id: number;
	name: string;
	description: string | null;
	icon: string;
	color: string;
	imageUrl: string | null;
	holders: number;
}

interface SettingsClientProps {
	general: { environment: string; siteUrl: string | null; signIn: { label: string; enabled: boolean }[] };
	appearance: { defaultTheme: ThemeId; pageLayout: HomepageLayout };
	badges: SettingsBadge[];
	playerBadgeChoice: boolean;
	integrations: IntegrationGroup[];
	/** content:manage (appearance, badges) and tournaments:manage (danger zone). */
	can: { content: boolean; tournaments: boolean };
}

const SECTIONS = [
	{ id: 'general', label: 'General' },
	{ id: 'appearance', label: 'Appearance' },
	{ id: 'badges', label: 'Badges' },
	{ id: 'integrations', label: 'Integrations' },
	{ id: 'danger', label: 'Danger zone' },
] as const;

async function patch(url: string, body: unknown) {
	const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
	const payload = await res.json().catch(() => null);
	if (!res.ok) throw new Error(payload?.error || 'Could not save');
	return payload;
}

function Section({ id, title, aside, children, tone }: { id: string; title: string; aside?: ReactNode; children: ReactNode; tone?: 'danger' }) {
	return (
		<section id={id} aria-labelledby={`${id}-title`} className={cn('scroll-mt-6 overflow-hidden rounded-xl border bg-card', tone === 'danger' ? 'border-signal-live/40' : 'border-border')}>
			<div className='flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5'>
				<h2 id={`${id}-title`} className={cn('text-[13px] font-black uppercase tracking-[0.1em]', tone === 'danger' && 'text-signal-live')}>
					{title}
				</h2>
				{aside && <div className='text-xs text-muted-foreground'>{aside}</div>}
			</div>
			{children}
		</section>
	);
}

/** A setting row: name + helper text on the left, the control on the right (stacked on mobile). */
function Row({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
	return (
		<div className='grid gap-4 border-t border-border p-5 first:border-t-0 md:grid-cols-[240px_minmax(0,1fr)] md:gap-6'>
			<div>
				<div className='text-sm font-semibold text-white'>{title}</div>
				{description && <div className='mt-1 text-[13px] leading-snug text-muted-foreground'>{description}</div>}
			</div>
			<div className='min-w-0'>{children}</div>
		</div>
	);
}

function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean }) {
	return (
		<button
			type='button'
			role='switch'
			aria-checked={checked}
			disabled={disabled}
			onClick={() => onChange(!checked)}
			className='inline-flex items-center gap-2.5 text-sm focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&:focus-visible>span]:ring-2 [&:focus-visible>span]:ring-ring'
		>
			<span className={cn('relative h-5 w-9 rounded-full transition-colors', checked ? 'bg-white' : 'bg-neutral-700')}>
				<span className={cn('absolute top-0.5 h-4 w-4 rounded-full transition-[left] motion-reduce:transition-none', checked ? 'left-[18px] bg-black' : 'left-0.5 bg-neutral-400')} />
			</span>
			{label}
		</button>
	);
}

function PlacementCheckbox({ checked, onChange, label, disabled }: { checked: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean }) {
	return (
		<label title={label} className={cn('relative inline-flex cursor-pointer items-center justify-center', disabled && 'cursor-not-allowed opacity-50')}>
			<input type='checkbox' className='peer sr-only' checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
			<span
				aria-hidden
				className={cn(
					'flex h-[18px] w-[18px] items-center justify-center rounded border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring',
					checked ? 'border-white bg-white text-black' : 'border-neutral-700 bg-transparent',
				)}
			>
				{checked && <Check className='h-3 w-3' strokeWidth={3} />}
			</span>
			<span className='sr-only'>{label}</span>
		</label>
	);
}

/** Small previews of each placement, drawn with the first badge that uses it. */
function PlacementPreviews({ badges }: { badges: SettingsBadge[] }) {
	const first = (p: BadgePlacement) => badges.find((b) => b[p]);
	const row = badges.filter((b) => b.showInTrophyRow).slice(0, 3);
	const avatar = first('showOnAvatar');
	const name = first('showNextToName');
	const tile = 'flex flex-col gap-2.5 rounded-lg border border-border bg-background p-3.5';
	const label = 'font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground';
	return (
		<div className='grid gap-2.5 px-5 pb-5 sm:grid-cols-3'>
			<div className={tile}>
				<span className={label}>Trophy row</span>
				<span className='flex h-11 gap-2'>
					{row.length > 0 ? row.map((b) => <TrophyIcon key={b.id} badge={b} size={44} decorative />) : <span className='self-center text-xs text-muted-foreground'>No badges here yet</span>}
				</span>
				<span className='text-xs text-muted-foreground'>Under the profile header, with name and year.</span>
			</div>
			<div className={tile}>
				<span className={label}>On avatar</span>
				<span className='relative h-11 w-11'>
					<span className='flex h-11 w-11 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 text-sm font-bold text-neutral-400'>K</span>
					{avatar && (
						<span className='absolute -bottom-1 -right-1 flex rounded-full ring-[3px] ring-background'>
							<TrophyIcon badge={avatar} size={20} decorative />
						</span>
					)}
				</span>
				<span className='text-xs text-muted-foreground'>One badge in the avatar corner.</span>
			</div>
			<div className={tile}>
				<span className={label}>Next to name</span>
				<span className='flex h-11 items-center gap-1.5 font-semibold text-white'>
					kaval
					{name && <TrophyIcon badge={name} size={19} decorative />}
				</span>
				<span className='text-xs text-muted-foreground'>Small mark after the name in rosters, match rooms and the forum.</span>
			</div>
		</div>
	);
}

export function SettingsClient({ general, appearance, badges: initialBadges, playerBadgeChoice, integrations, can }: SettingsClientProps) {
	const router = useRouter();
	const { toast } = useToast();
	const [defaultTheme, setDefaultTheme] = useState<ThemeId>(appearance.defaultTheme);
	const [pageLayout, setPageLayout] = useState<HomepageLayout>(appearance.pageLayout);
	const [badges, setBadges] = useState(initialBadges);
	const [choice, setChoice] = useState(playerBadgeChoice);
	const [saving, setSaving] = useState<string | null>(null);

	const save = async (key: string, run: () => Promise<unknown>, rollback: () => void, success: string) => {
		setSaving(key);
		try {
			await run();
			toast({ title: success });
			router.refresh();
		} catch (error) {
			rollback();
			toast({ variant: 'destructive', title: 'Not saved', description: error instanceof Error ? error.message : undefined });
		} finally {
			setSaving(null);
		}
	};

	const chooseTheme = (next: ThemeId | null) => {
		if (!next || next === defaultTheme) return;
		const previous = defaultTheme;
		setDefaultTheme(next);
		void save(
			'theme',
			async () => {
				await patch('/api/admin/site-settings', { defaultTheme: next });
				// Preview it right away unless this admin picked a personal theme.
				document.documentElement.dataset.siteTheme = next;
				if (!readThemeCookie(document.cookie)) document.documentElement.setAttribute('data-theme', next);
			},
			() => setDefaultTheme(previous),
			'Default theme saved',
		);
	};

	const chooseLayout = (next: HomepageLayout) => {
		if (next === pageLayout) return;
		const previous = pageLayout;
		setPageLayout(next);
		void save(
			'layout',
			() => patch('/api/admin/homepage-settings', { pageLayout: next }),
			() => setPageLayout(previous),
			'Homepage layout saved',
		);
	};

	const setPlacement = (badge: SettingsBadge, placement: BadgePlacement, value: boolean) => {
		const apply = (v: boolean) => setBadges((list) => list.map((b) => (b.id === badge.id ? { ...b, [placement]: v } : b)));
		apply(value);
		void save(
			`badge-${badge.id}`,
			() => patch(`/api/admin/badges/${badge.id}`, { [placement]: value }),
			() => apply(!value),
			`${badge.name}: ${BADGE_PLACEMENT_LABELS[placement]} ${value ? 'on' : 'off'}`,
		);
	};

	const setChoiceAllowed = (next: boolean) => {
		setChoice(next);
		void save(
			'choice',
			() => patch('/api/admin/site-settings', { playerBadgeChoice: next }),
			() => setChoice(!next),
			next ? 'Players can choose their badges' : 'Player badge choice turned off',
		);
	};

	const readOnly = <span>Needs content management access to change</span>;
	const grid = 'grid grid-cols-[minmax(0,1fr)_repeat(3,72px)_64px] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_repeat(3,104px)_80px]';

	return (
		<div className='flex flex-col gap-5'>
			<nav aria-label='Settings sections' className='flex gap-6 overflow-x-auto border-b border-border'>
				{SECTIONS.map((s) => (
					<a
						key={s.id}
						href={`#${s.id}`}
						className='flex h-10 shrink-0 items-center border-b-2 border-transparent px-0.5 text-sm font-medium text-muted-foreground transition-colors hover:border-neutral-600 hover:text-white'
					>
						{s.label}
					</a>
				))}
			</nav>

			<Section id='general' title='General' aside='Read from the server environment'>
				<Row title='Environment' description='Where this deployment runs.'>
					<span className='font-mono text-sm'>{general.environment}</span>
				</Row>
				<Row title='Site URL' description='Used in sign-in emails and OAuth callbacks (NEXTAUTH_URL).'>
					{general.siteUrl ? <span className='break-all font-mono text-sm'>{general.siteUrl}</span> : <StatusPill tone='hold'>Not set</StatusPill>}
				</Row>
				<Row title='Sign-in methods' description='Players can sign in with whichever of these are configured.'>
					<div className='flex flex-wrap gap-2'>
						{general.signIn.map((m) => (
							<StatusPill key={m.label} tone={m.enabled ? 'ready' : 'line'}>
								{m.label} {m.enabled ? 'on' : 'off'}
							</StatusPill>
						))}
					</div>
				</Row>
			</Section>

			<Section id='appearance' title='Appearance' aside={can.content ? 'Players can pick their own theme on their profile' : readOnly}>
				<Row title='Default theme' description='Black and white by default. Game hubs keep their tint: yellow for CS2, blue for League.'>
					<ThemePicker name='site-theme' label='Default theme' value={defaultTheme} onChange={chooseTheme} disabled={!can.content || saving === 'theme'} />
				</Row>
				<Row title='Homepage layout' description='The original stays available next to the redesigns. Preview any of them before switching.'>
					<div role='radiogroup' aria-label='Homepage layout' className='grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3'>
						{HOME_LAYOUTS.map((layout) => {
							const checked = layout.value === pageLayout;
							return (
								<div key={layout.value} className={cn('flex flex-col gap-1.5 rounded-lg border p-2.5 transition-colors', checked ? 'border-white' : 'border-border hover:border-neutral-600')}>
									<label
										className={cn('flex cursor-pointer flex-col gap-1.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring', (!can.content || saving === 'layout') && 'cursor-not-allowed')}
									>
										<input type='radio' name='home-layout' className='sr-only' checked={checked} disabled={!can.content || saving === 'layout'} onChange={() => chooseLayout(layout.value)} />
										<span aria-hidden className='h-14 rounded bg-background bg-[repeating-linear-gradient(0deg,hsl(var(--border))_0_6px,transparent_6px_12px)]' />
										<span className='flex items-center justify-between gap-2'>
											<strong className='text-[13px] text-white'>{layout.label}</strong>
											{checked && <Check className='h-4 w-4 text-white' aria-hidden />}
										</span>
										<span className='text-xs leading-snug text-muted-foreground'>{layout.description}</span>
									</label>
									<Link href={`/home-preview/${layout.value.toLowerCase()}`} target='_blank' className='inline-flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-white'>
										Preview <ExternalLink className='h-3 w-3' aria-hidden />
									</Link>
								</div>
							);
						})}
					</div>
				</Row>
			</Section>

			<Section
				id='badges'
				title='Badges'
				aside={
					<Link href='/admin/badges' className='text-[13px] text-white hover:underline hover:underline-offset-4'>
						Manage badges →
					</Link>
				}
			>
				<p className='px-5 pb-1 pt-3.5 text-[13px] leading-normal text-muted-foreground'>Choose where each badge appears. Turn everything off to hide a badge without taking it away from players.</p>
				<PlacementPreviews badges={badges} />

				{badges.length === 0 ? (
					<p className='border-t border-border px-5 py-6 text-sm text-muted-foreground'>No badges yet. Create one on the badges page.</p>
				) : (
					<div role='table' aria-label='Badge placements' className='overflow-x-auto'>
						<div role='row' className={cn(grid, 'min-w-[480px] px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground')}>
							<span role='columnheader'>Badge</span>
							{BADGE_PLACEMENTS.map((p) => (
								<span key={p} role='columnheader' className='text-center'>
									{BADGE_PLACEMENT_LABELS[p]}
								</span>
							))}
							<span role='columnheader' className='text-right'>
								Status
							</span>
						</div>
						{badges.map((badge) => {
							const status = badgeStatus(badge);
							return (
								<div key={badge.id} role='row' className={cn(grid, 'min-w-[480px] border-t border-border px-5 py-3 text-sm')}>
									<span role='cell' className='flex min-w-0 items-center gap-3'>
										<TrophyIcon badge={badge} size={32} decorative />
										<span className='min-w-0'>
											<strong className='block truncate text-white'>{badge.name}</strong>
											<span className='text-xs text-muted-foreground'>
												{badge.holders} {badge.holders === 1 ? 'player' : 'players'}
											</span>
										</span>
									</span>
									{BADGE_PLACEMENTS.map((p) => (
										<span key={p} role='cell' className='text-center'>
											<PlacementCheckbox
												checked={badge[p]}
												label={`${badge.name}: ${BADGE_PLACEMENT_LABELS[p]}`}
												disabled={!can.content || saving === `badge-${badge.id}`}
												onChange={(v) => setPlacement(badge, p, v)}
											/>
										</span>
									))}
									<span role='cell' className={cn('text-right text-xs', status === 'hidden' ? 'text-signal-hold' : 'text-muted-foreground')}>
										{status === 'hidden' ? 'Hidden' : 'Shown'}
									</span>
								</div>
							);
						})}
					</div>
				)}

				<div className='border-t border-border'>
					<Row title='Player choice' description='Players can hide any of their own badges, and pick which one sits on their avatar.'>
						<Toggle checked={choice} onChange={setChoiceAllowed} label={choice ? 'Allowed' : 'Off'} disabled={!can.content || saving === 'choice'} />
					</Row>
				</div>
			</Section>

			<Section id='integrations' title='Integrations' aside='Values are never shown, only whether each is set'>
				<div className='grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3'>
					{integrations.map((group) => {
						const set = group.checks.filter((c) => c.configured).length;
						const complete = set === group.checks.length;
						return (
							<div key={group.title} className='flex flex-col gap-3 rounded-lg border border-border bg-background p-4'>
								<div className='flex items-start justify-between gap-3'>
									<div className='min-w-0'>
										<strong className='text-sm text-white'>{group.title}</strong>
										<p className='mt-0.5 text-xs text-muted-foreground'>{group.description}</p>
									</div>
									<StatusPill tone={complete ? 'ready' : 'hold'}>
										{set}/{group.checks.length}
									</StatusPill>
								</div>
								<ul className='space-y-1.5 border-t border-border pt-3'>
									{group.checks.map((c) => (
										<li key={c.label} className='flex items-center justify-between gap-3 font-mono text-xs'>
											<span className='min-w-0 truncate'>{c.label}</span>
											<span className={c.configured ? 'text-signal-ready-text' : 'text-signal-live'}>{c.configured ? 'set' : 'missing'}</span>
										</li>
									))}
								</ul>
							</div>
						);
					})}
				</div>
			</Section>

			<Section id='danger' title='Danger zone' tone='danger'>
				<Row title='Simulated tournaments' description='Removes every tournament made with “Test data”, with its matches, teams and generated players.'>
					{can.tournaments ? <DeleteSimulatedTournamentsButton /> : <span className='text-sm text-muted-foreground'>Needs tournament management access.</span>}
				</Row>
			</Section>
		</div>
	);
}
