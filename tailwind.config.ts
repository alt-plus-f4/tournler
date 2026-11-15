import type { Config } from 'tailwindcss';

const config: Config = {
	darkMode: ['class'],
	content: [
		'./src/pages/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/components/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/app/**/*.{js,ts,jsx,tsx,mdx}',
		// Some Tailwind class names (GAME_ACCENT's `text-[#..]`/`border-[#..]`) live in plain data
		// modules, not components — without this, the JIT scanner never sees them and silently
		// drops the classes (no build error, the utility just never gets generated).
		'./src/lib/**/*.{js,ts,jsx,tsx,mdx}',
	],
	theme: {
		extend: {
			colors: {
				// Theme-aware (src/app/globals.css): Mono resolves to Tailwind's own values, the other
				// themes (src/lib/theme.ts) swap in their palette.
				black: 'rgb(var(--c-black) / <alpha-value>)',
				white: 'rgb(var(--c-white) / <alpha-value>)',
				neutral: {
					50: 'rgb(var(--c-neutral-50) / <alpha-value>)',
					100: 'rgb(var(--c-neutral-100) / <alpha-value>)',
					200: 'rgb(var(--c-neutral-200) / <alpha-value>)',
					300: 'rgb(var(--c-neutral-300) / <alpha-value>)',
					400: 'rgb(var(--c-neutral-400) / <alpha-value>)',
					500: 'rgb(var(--c-neutral-500) / <alpha-value>)',
					600: 'rgb(var(--c-neutral-600) / <alpha-value>)',
					700: 'rgb(var(--c-neutral-700) / <alpha-value>)',
					800: 'rgb(var(--c-neutral-800) / <alpha-value>)',
					900: 'rgb(var(--c-neutral-900) / <alpha-value>)',
					950: 'rgb(var(--c-neutral-950) / <alpha-value>)',
				},
				popupcolor: '#0000009e',
				discordColor: '#5865F2',
				steamColor: '#171a21',
				steamLogoColor: '#66c0f4',
				hoverColor: '#1d1e21',
				grey: '#2f3136',
				foregroundgray: 'rgb(167, 167, 167)',
				tColor: '#7a030386',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))',
				},
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))',
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))',
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))',
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))',
				},
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				chart: {
					'1': 'hsl(var(--chart-1))',
					'2': 'hsl(var(--chart-2))',
					'3': 'hsl(var(--chart-3))',
					'4': 'hsl(var(--chart-4))',
					'5': 'hsl(var(--chart-5))',
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))',
				},
				signal: {
					live: 'hsl(var(--signal-live))',
					ready: 'hsl(var(--signal-ready))',
					'ready-text': 'hsl(var(--signal-ready-text))',
					hold: 'hsl(var(--signal-hold))',
				},
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
			},
		},
	},
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
};
export default config;
