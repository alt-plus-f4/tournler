import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Toaster } from "@/components/ui/toaster"
import { OnboardingStatus } from "@/components/OnboardingStatus";
import { Roboto } from 'next/font/google'
import Providers from '@/redux/Providers';

const roboto = Roboto({
	weight: '400',
	subsets: ['latin'],
	display: 'swap',
})

export const metadata: Metadata = {
	title: "Tournler",
	description: " Website for gaming tournament organizing",
};

export default function RootLayout({
	children,
	authModal,
}: Readonly<{
	children: React.ReactNode,
	authModal: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={`${roboto.className} antialiased dark text-foreground bg-background min-h-screen flex flex-col`}>

				<Navbar />

				{authModal}
				<Providers>
				
				{children}
				<OnboardingStatus />
				
				</Providers>
				<Toaster />

				<div className='text-foreground p-5 text-center text-sm w-full mt-auto bottom-0 border-t'>Shits hard</div>

			</body>
		</html>
	);
}
