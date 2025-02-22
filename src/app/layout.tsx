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

const roboto = Roboto({
	weight: '400',
	subsets: ['latin'],
	display: 'swap',
});

export const metadata: Metadata = {
	title: 'Tournler - Simplifying Competitive Events',
	description:
		'Effortlessly organize and manage tournaments with Tournler – your all-in-one platform for seamless competition management.',
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
		<html lang='en'>
			<body
				className={`${roboto.className} antialiased dark text-foreground bg-background min-h-screen flex flex-col`}
			>
				<ConvexClientProvider>
					<Navbar session={session} />

					{authModal}

					<Providers>
						<OnboardingStatus session={session}/>
					</Providers>

					{children}
					
					<Toaster />
					
				</ConvexClientProvider>

				<Footer />
			</body>
		</html>
	);
}
