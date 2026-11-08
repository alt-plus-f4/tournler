'use client';

import { Check } from 'lucide-react';
import { THEMES, type ThemeId, type ThemeOption } from '@/lib/theme';
import { cn } from '@/lib/utils';

function Swatch({ theme }: { theme: ThemeOption }) {
	const { bg, card, accent } = theme.swatch;
	// Literal colours on purpose: each swatch previews its own theme, whatever theme is active.
	return (
		<span aria-hidden className='flex h-16 flex-col gap-1.5 rounded-md p-2' style={{ background: bg }}>
			<span className='h-2 w-3/5 rounded-sm' style={{ background: card }} />
			<span className='h-2 w-2/5 rounded-sm' style={{ background: card }} />
			<span className='mt-auto h-2.5 w-9 rounded-sm' style={{ background: accent }} />
		</span>
	);
}

interface ThemePickerProps {
	/** Selected theme; `null` selects the "site default" option when `defaultOption` is given. */
	value: ThemeId | null;
	onChange: (theme: ThemeId | null) => void;
	/** Adds a leading "Site default" option (for players), naming the theme it currently resolves to. */
	defaultOption?: { theme: ThemeId };
	disabled?: boolean;
	name: string;
	label: string;
}

/** Radio grid of theme swatches (admin default theme, player's own theme). */
export function ThemePicker({ value, onChange, defaultOption, disabled, name, label }: ThemePickerProps) {
	const options: { key: string; value: ThemeId | null; label: string; theme: ThemeOption }[] = [
		...(defaultOption ? [{ key: 'default', value: null, label: 'Site default', theme: THEMES.find((t) => t.id === defaultOption.theme) ?? THEMES[0] }] : []),
		...THEMES.map((t) => ({ key: t.id, value: t.id, label: t.label, theme: t })),
	];

	return (
		<div role='radiogroup' aria-label={label} className='grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6'>
			{options.map((option) => {
				const checked = option.value === value;
				return (
					<label
						key={option.key}
						className={cn(
							'group flex cursor-pointer flex-col gap-2 rounded-lg border p-1.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
							checked ? 'border-white' : 'border-border hover:border-neutral-600',
							disabled && 'cursor-not-allowed opacity-60',
						)}
					>
						<input type='radio' name={name} className='sr-only' checked={checked} disabled={disabled} onChange={() => onChange(option.value)} />
						<Swatch theme={option.theme} />
						<span className='flex items-center justify-between gap-2 px-1 pb-0.5 text-sm'>
							<span className='min-w-0'>
								<span className='block truncate font-medium text-white'>{option.label}</span>
								{option.value === null && <span className='block truncate text-xs text-muted-foreground'>{option.theme.label}</span>}
							</span>
							{checked && <Check className='h-4 w-4 shrink-0 text-white' aria-hidden />}
						</span>
					</label>
				);
			})}
		</div>
	);
}
