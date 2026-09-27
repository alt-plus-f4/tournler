import { render, screen } from '@testing-library/react';
import type { Game } from '@prisma/client';
import Page from '../teams/page';

// The page reads the game filter cookie (next/headers), which only works inside a request scope.
const cookiesGet = jest.fn<{ value: string } | undefined, []>(() => undefined);
jest.mock('next/headers', () => ({ cookies: () => Promise.resolve({ get: cookiesGet }) }));

// Page itself only resolves the active game and renders the static shell plus three async server
// components, each in its own Suspense boundary — the jsdom renderer can't render those directly.
// See TeamsBanner.test.tsx and TeamsCreateSlot.test.tsx for their own (real-implementation) coverage.
jest.mock('../teams/_components/TeamsBanner', () => ({
	TeamsBanner: ({ game }: { game: Game }) => <div>Teams Banner ({game})</div>,
	TeamsBannerSkeleton: () => null,
}));
jest.mock('../teams/_components/TeamsCreateSlot', () => ({
	TeamsCreateSlot: ({ game }: { game: Game }) => <div>Teams Create Slot ({game})</div>,
}));
jest.mock('../teams/_components/TeamsCards', () => ({
	TeamsCards: ({ game }: { game: Game }) => <div>Teams Cards ({game})</div>,
	TeamsCardsSkeleton: () => null,
}));

describe('Teams Page', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		cookiesGet.mockReturnValue(undefined);
	});

	it('renders the page title correctly', async () => {
		const page = await Page({});
		render(page);

		expect(screen.getByRole('heading', { level: 1, name: 'Teams' })).toBeInTheDocument();
	});

	it('streams the banner, create-slot and card grid, defaulting to CS2', async () => {
		const page = await Page({});
		render(page);

		expect(screen.getByText('Teams Banner (CS2)')).toBeInTheDocument();
		expect(screen.getByText('Teams Create Slot (CS2)')).toBeInTheDocument();
		expect(screen.getByText('Teams Cards (CS2)')).toBeInTheDocument();
	});

	it('re-scopes every tile to the LoL channel remembered in the game filter cookie', async () => {
		cookiesGet.mockReturnValue({ value: 'lol' });

		const page = await Page({});
		render(page);

		expect(screen.getByText('Teams Banner (LOL)')).toBeInTheDocument();
		expect(screen.getByText('Teams Create Slot (LOL)')).toBeInTheDocument();
		expect(screen.getByText('Teams Cards (LOL)')).toBeInTheDocument();
	});
});
