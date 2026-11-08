'use client';

import { useEffect, useState } from 'react';
import { ThemePicker } from '@/components/ThemePicker';
import { TrophyIcon } from '@/components/trophies/TrophyIcon';
import { VisibilitySwitch } from '@/components/profile/VisibilitySwitch';
import { useClientSession } from '@/lib/hooks/use-client-session';
import { useToast } from '@/lib/hooks/use-toast';
import { applyThemeInBrowser, THEMES, type ThemeId } from '@/lib/theme';
import { cn } from '@/lib/utils';

export interface PreferenceAward {
	id: number;
	name: string;
	description: string | null;
	icon: string;
	color: string;
	imageUrl: string | null;
	/** Hidden by the player. */
	hidden: boolean;
	/** An admin allows this badge in the avatar corner. */
	avatarEligible: boolean;
}

/** The owner's own display preferences (theme + badge choices), sent to the profile owner only. */
export interface ProfilePreferences {
	/** The player's own theme, null = follow the site default. */
	theme: ThemeId | null;
	siteTheme: ThemeId;
	/** SiteSettings.playerBadgeChoice: may the player hide badges and pick their avatar badge? */
	badgeChoice: boolean;
	avatarBadgeId: number | null;
	awards: PreferenceAward[];
}

async function patch(url: string, body: unknown) {
	const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
	const payload = await res.json().catch(() => null);
	if (!res.ok) throw new Error(payload?.error || 'Could not save');
	return payload;
}

/** Owner-only profile settings: colour theme, which badges show, and which one sits on the avatar. */
export function ProfilePreferencesSection({ preferences, onChanged }: { preferences: ProfilePreferences; onChanged: () => void }) {
	const { toast } = useToast();
	const { refresh: refreshSession } = useClientSession();
	const [theme, setTheme] = useState<ThemeId | null>(preferences.theme);
	const [savingTheme, setSavingTheme] = useState(false);
	const [avatarBadgeId, setAvatarBadgeId] = useState<number | null>(preferences.avatarBadgeId);
	const [hidden, setHidden] = useState<Record<number, boolean>>(() => Object.fromEntries(preferences.awards.map((a) => [a.id, a.hidden])));
	const [busy, setBusy] = useState<string | null>(null);

	useEffect(() => setTheme(preferences.theme), [preferences.theme]);
	useEffect(() => setAvatarBadgeId(preferences.avatarBadgeId), [preferences.avatarBadgeId]);
	useEffect(() => setHidden(Object.fromEntries(preferences.awards.map((a) => [a.id, a.hidden]))), [preferences.awards]);

	const chooseTheme = async (next: ThemeId | null) => {
		const previous = theme;
		setTheme(next);
		applyThemeInBrowser(next);
		setSavingTheme(true);
		try {
			await patch('/api/user', { theme: next });
			await refreshSession();
			toast({ title: next ? `Theme set to ${THEMES.find((t) => t.id === next)?.label}` : 'Following the site theme' });
		} catch (error) {
			setTheme(previous);
			applyThemeInBrowser(previous);
			toast({ variant: 'destructive', title: 'Theme not saved', description: error instanceof Error ? error.message : undefined });
		} finally {
			setSavingTheme(false);
		}
	};

	const toggleHidden = async (award: PreferenceAward, nextHidden: boolean) => {
		setHidden((h) => ({ ...h, [award.id]: nextHidden }));
		setBusy(`hide-${award.id}`);
		try {
			await patch('/api/user/badges', { badgeId: award.id, hidden: nextHidden });
			onChanged();
		} catch (error) {
			setHidden((h) => ({ ...h, [award.id]: !nextHidden }));
			toast({ variant: 'destructive', title: 'Badge not updated', description: error instanceof Error ? error.message : undefined });
		} finally {
			setBusy(null);
		}
	};

	const chooseAvatar = async (badgeId: number | null) => {
		const previous = avatarBadgeId;
		setAvatarBadgeId(badgeId);
		setBusy('avatar');
		try {
			await patch('/api/user', { avatarBadgeId: badgeId });
			onChanged();
		} catch (error) {
			setAvatarBadgeId(previous);
			toast({ variant: 'destructive', title: 'Avatar badge not saved', description: error instanceof Error ? error.message : undefined });
		} finally {
			setBusy(null);
		}
	};

	const eligible = preferences.awards.filter((a) => a.avatarEligible && !hidden[a.id]);

	return (
		<section aria-labelledby='preferences-heading' className='mt-10 rounded-md border border-border bg-neutral-950/80 p-5'>
			<h2 id='preferences-heading' className='text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground'>
				Preferences
			</h2>

			<div className='mt-4 space-y-3'>
				<div>
					<p className='text-sm font-medium text-white'>Theme</p>
					<p className='mt-0.5 text-xs text-muted-foreground'>Only changes how Tournler looks for you. Game hubs keep their tint.</p>
				</div>
				<ThemePicker name='profile-theme' label='Theme' value={theme} onChange={chooseTheme} defaultOption={{ theme: preferences.siteTheme }} disabled={savingTheme} />
			</div>

			{preferences.awards.length > 0 && (
				<div className='mt-8 space-y-3 border-t border-border pt-6'>
					<div>
						<p className='text-sm font-medium text-white'>Badges</p>
						<p className='mt-0.5 text-xs text-muted-foreground'>
							{preferences.badgeChoice
								? 'Hide badges you’d rather not show, and pick the one that sits on your avatar.'
								: 'Badge choices are turned off on this site, so every badge shows where the admins placed it.'}
						</p>
					</div>

					{preferences.badgeChoice && (
						<>
							<ul className='divide-y divide-border rounded-md border border-border'>
								{preferences.awards.map((award) => (
									<li key={award.id} className='flex items-center gap-3 px-3 py-2.5'>
										<TrophyIcon badge={award} size={28} decorative />
										<VisibilitySwitch
											className='min-w-0 flex-1 items-center'
											label={award.name}
											description={hidden[award.id] ? 'Hidden from your profile' : 'Shown'}
											checked={!hidden[award.id]}
											disabled={busy !== null}
											onCheckedChange={(shown) => toggleHidden(award, !shown)}
										/>
									</li>
								))}
							</ul>

							{eligible.length > 0 && (
								<fieldset className='space-y-2'>
									<legend className='mb-2 text-sm font-medium text-white'>On your avatar</legend>
									<div className='flex flex-wrap gap-2'>
										{[null, ...eligible].map((award) => {
											const id = award?.id ?? null;
											// A pick that's no longer eligible (hidden, or moved off avatars) falls back to Automatic.
											const current = eligible.some((a) => a.id === avatarBadgeId) ? avatarBadgeId : null;
											const checked = current === id;
											return (
												<label
													key={id ?? 'auto'}
													className={cn(
														'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
														checked ? 'border-white text-white' : 'border-border text-neutral-300 hover:border-neutral-600',
													)}
												>
													<input type='radio' name='avatar-badge' className='sr-only' checked={checked} disabled={busy !== null} onChange={() => chooseAvatar(id)} />
													{award ? <TrophyIcon badge={award} size={20} decorative /> : null}
													{award ? award.name : 'Automatic'}
												</label>
											);
										})}
									</div>
								</fieldset>
							)}
						</>
					)}
				</div>
			)}
		</section>
	);
}
