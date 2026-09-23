import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import { Toaster } from '@/components/ui/toaster';
import { Roboto } from 'next/font/google';
import { OnboardingStatus } from '@/components/OnboardingStatus';
import Providers from './redux/Providers';
import { ConvexClientProvider } from '@/convex/ConvexClientProvider';
import Footer from '@/components/Footer';
import { getAuthSession } from '@/lib/auth';
import { InteractiveBackground } from '@/components/InteractiveBackground';

const roboto = Roboto({
	weight: ['400', '500', '700', '900'],
	subsets: ['latin'],
	display: 'swap',
});

export const metadata: Metadata = {
	title: 'Tournler - Simplifying Competitive Events',
	description: 'Effortlessly organize and manage tournaments with Tournler – your all-in-one platform for seamless competition management.',
};

export default async function RootLayout({
	children,
	authModal,
}: Readonly<{
	children: React.ReactNode;
	authModal: React.ReactNode;
}>) {
	const session = await getAuthSession();

	return (
		<html lang='en' data-scroll-behavior='smooth'>
			<body className={`${roboto.className} antialiased dark text-foreground bg-background min-h-screen flex flex-col`}>
				<a href='#content' className='sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-black'>
					Skip to content
				</a>
				<InteractiveBackground />
				<ConvexClientProvider>
					<Navbar session={session} />

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
