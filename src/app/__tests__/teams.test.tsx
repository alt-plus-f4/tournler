import { render, screen } from '@testing-library/react';
import Page from '../teams/page';
import { getAuthSession } from '@/lib/auth';
import { ExtendedCs2Team } from '@/lib/models/team-model';
// Removed the import of jest as it is available globally in the test environment

// Mock the auth session
jest.mock('@/lib/auth', () => ({ getAuthSession: jest.fn() }));

// Mock the components used in the page
jest.mock('@/components/TeamDrawer', () => ({
	__esModule: true,
	default: () => <div data-testid='team-drawer'>Team Drawer</div>,
}));

jest.mock('@/components/TeamCard', () => ({
	TeamCard: ({ team }: { team: ExtendedCs2Team }) => (
		<div data-testid={`team-card-${team.id}`}>Team Card: {team.name}</div>
	),
}));

jest.mock('@/components/LoginButtons', () => ({
	__esModule: true,
	default: ({ className }: { className?: string }) => (
		<div data-testid='login-buttons' className={className}>
			Login Buttons
		</div>
	),
}));

jest.mock('@/components/FallbackCards', () => ({
	FallbackCards: () => <div data-testid='fallback-cards'>Fallback Cards</div>,
}));

// Mock fetch
global.fetch = jest.fn();

describe('Teams Page', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders the page title correctly', async () => {
		// Mock session as null (not logged in)
		(getAuthSession as jest.Mock).mockResolvedValue(null);

		// Mock fetch to return empty teams array
		(global.fetch as jest.Mock).mockResolvedValue({
			ok: true,
			json: async () => ({ teams: [] }),
		});

		// Render the page component
		const page = await Page();
		render(page);

		// Check if the page title is rendered
		expect(screen.getByText('Counter-strike 2 Teams')).toBeInTheDocument();
	});

	it('shows login alert when user is not logged in', async () => {
		// Mock session as null (not logged in)
		(getAuthSession as jest.Mock).mockResolvedValue(null);

		// Mock fetch to return empty teams array
		(global.fetch as jest.Mock).mockResolvedValue({
			ok: true,
			json: async () => ({ teams: [] }),
		});

		// Render the page component
		const page = await Page();
		render(page);

		// Check if the login alert is shown
		expect(screen.getByText('Heads up!')).toBeInTheDocument();
		expect(
			screen.getByText('You need an account to create or join a team.')
		).toBeInTheDocument();
		expect(screen.getByTestId('login-buttons')).toBeInTheDocument();
	});

	it('shows team creation option when user is logged in but has no team', async () => {
		// Mock session with logged in user
		(getAuthSession as jest.Mock).mockResolvedValue({
			user: { email: 'test@example.com', id: '123' },
		});

		// Mock getUserTeam to return null (no team)
		(global.fetch as jest.Mock).mockImplementation((url: string) => {
			if (url.includes('/api/user/team')) {
				return Promise.resolve({
					ok: true,
					json: async () => ({ team: null }),
				});
			}
			return Promise.resolve({
				ok: true,
				json: async () => ({ teams: [] }),
			});
		});

		// Render the page component
		const page = await Page();
		render(page);

		// Check if team creation option is shown
		expect(screen.getByTestId('team-drawer')).toBeInTheDocument();
	});
});
