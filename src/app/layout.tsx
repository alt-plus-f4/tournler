import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import { Toaster } from '@/components/ui/toaster';
import { Roboto } from 'next/font/google';
import { OnboardingStatus } from '@/components/OnboardingStatus';
import Providers from './redux/Providers';
import { ConvexClientProvider } from '@/convex/ConvexClientProvider';
import Footer from '@/components/Footer';

const roboto = Roboto({
	weight: '400',
	subsets: ['latin'],
	display: 'swap',
});

export const metadata: Metadata = {
	title: 'Tournler',
	description: ' Website for gaming tournament organizing',
};

export default function RootLayout({
	children,
	authModal,
}: Readonly<{
	children: React.ReactNode;
	authModal: React.ReactNode;
}>)
 {
	
	return (
		<html lang='en'>
			<body
				className={`${roboto.className} antialiased dark text-foreground bg-background min-h-screen flex flex-col`}
			>
				<ConvexClientProvider>
				<Navbar />
				
				{authModal}
				
				<Providers>
					<OnboardingStatus />
				</Providers>

				{children}
				<Toaster />

				</ConvexClientProvider>

				<Footer />
					
			</body>
		</html>
	);
}
