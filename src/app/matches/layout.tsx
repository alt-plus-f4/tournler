import type { Metadata } from 'next';

// The matches list is a client component, so its title lives here. Detail routes under
// /matches/[matchId] can override it with their own metadata.
export const metadata: Metadata = {
	title: 'Matches',
};

export default function MatchesLayout({ children }: { children: React.ReactNode }) {
	return children;
}
