import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import { Toaster } from '@/components/ui/toaster';
import { Roboto } from 'next/font/google';
import { OnboardingStatus } from '@/components/OnboardingStatus';
import Providers from './redux/Providers';
import { ConvexClientProvider } from '@/convex/ConvexClientProvider';
import Footer from '@/components/Footer';
import { getSessionIncludingBanned } from '@/lib/auth';
import { SuspensionNotice } from '@/components/SuspensionNotice';
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

export default async function RootLayout({
	children,
	authModal,
}: Readonly<{
	children: React.ReactNode;
	authModal: React.ReactNode;
}>) {
	// Banned users are signed out for every action (getAuthSession returns null for them), but the
	// shell still recognizes them so it can explain the suspension and let them sign out.
	const rawSession = await getSessionIncludingBanned();
	const ban = rawSession?.user?.ban ?? null;
	const session = ban ? null : rawSession;

	return (
		<html lang='en' data-scroll-behavior='smooth'>
			<body className={`${roboto.className} antialiased dark text-foreground bg-background min-h-screen flex flex-col`}>
				<a href='#content' className='sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-black'>
					Skip to content
				</a>
				<InteractiveBackground />
				<ConvexClientProvider signedIn={!!session?.user}>
					<Navbar session={session} suspended={!!ban} />
					{ban && <SuspensionNotice ban={ban} />}

					{authModal}

					<Providers>
						<OnboardingStatus session={session} />
					</Providers>

					<main id='content' className='flex-1'>
						{children}
					</main>

					<Toaster />
				</ConvexClientProvider>

				<Footer />
			</body>
		</html>
	);
}
