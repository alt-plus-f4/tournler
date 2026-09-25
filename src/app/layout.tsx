import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import { Toaster } from '@/components/ui/toaster';
import { Roboto } from 'next/font/google';
import { ConditionalFooter } from '@/components/shell/ConditionalFooter';
import { SuspensionBanner } from '@/components/shell/SuspensionBanner';
import { OnboardingGate } from '@/components/shell/OnboardingGate';
import { InteractiveBackground } from '@/components/InteractiveBackground';

const roboto = Roboto({
	weight: ['400', '500', '700', '900'],
	subsets: ['latin'],
	display: 'swap',
});

export const metadata: Metadata = {
	title: {
		default: 'Tournler - Simplifying Competitive Events',
		// Pages export `metadata.title` (or generateMetadata) and get "<title> · Tournler".
		template: '%s · Tournler',
	},
	description: 'Effortlessly organize and manage tournaments with Tournler – your all-in-one platform for seamless competition management.',
};

export default function RootLayout({
	children,
	authModal,
}: Readonly<{
	children: React.ReactNode;
	authModal: React.ReactNode;
}>) {
	return (
		<html lang='en' data-scroll-behavior='smooth'>
			<body className={`${roboto.className} antialiased dark text-foreground bg-background min-h-screen flex flex-col`}>
				<a href='#content' className='sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-black'>
					Skip to content
				</a>
				<InteractiveBackground />
				{/* No session read here: the shell is static and every page can prerender or stream.
				    Signed-in chrome (account menu, suspension notice, onboarding) hydrates client-side. */}
				<Navbar />
				<SuspensionBanner />

				{authModal}

				<OnboardingGate />

				<main id='content' className='relative z-10 min-h-[100svh] flex-1 shadow-[0_16px_50px_-18px_rgba(0,0,0,0.8),0_8px_32px_-8px_hsl(var(--background))]'>
					{children}
				</main>

				<Toaster />

				<ConditionalFooter />
			</body>
		</html>
	);
}
