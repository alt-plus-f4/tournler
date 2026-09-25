'use client';

import { usePathname } from 'next/navigation';
import Footer from '@/components/Footer';

// The match room (/matches/[matchId]) is built to fit one screen on its own — see its zoom-out
// treatment in src/app/matches/[matchId]/page.tsx — so the footer doesn't get a slice of that
// screen too. /matches itself (the list) keeps it.
const HIDDEN_ON = /^\/matches\/\d+/;

export function ConditionalFooter() {
	const pathname = usePathname();
	if (HIDDEN_ON.test(pathname)) return null;
	return <Footer />;
}
