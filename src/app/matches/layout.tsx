import type { Metadata } from 'next';

// Section title for /matches. Detail routes under /matches/[matchId] override it with their own metadata.
export const metadata: Metadata = {
	title: 'Matches',
};

export default function MatchesLayout({ children }: { children: React.ReactNode }) {
	return children;
}
