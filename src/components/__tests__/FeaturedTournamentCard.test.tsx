import { render, screen } from '@testing-library/react';
import { FeaturedTournamentCard } from '../FeaturedTournamentCard';

const mockProps = {
	id: 1,
	name: 'Featured Tournament',
	startDate: '2023-12-31T12:00:00Z',
	bannerUrl: '/featured-banner.jpg',
	prizePool: 50000,
	location: 'Featured Location',
};

describe('FeaturedTournamentCard', () => {
	it('renders tournament information correctly', () => {
		render(<FeaturedTournamentCard {...mockProps} />);

		// Check if tournament name is rendered
		expect(screen.getByText('Featured Tournament')).toBeInTheDocument();

		// Check if location is rendered
		expect(screen.getByText('Featured Location')).toBeInTheDocument();

		// A past start date on a tournament that never started reads as pending, not upcoming
		expect(screen.getByText('Start pending')).toBeInTheDocument();
		expect(screen.getByText(/Set for Dec 31, 2023/)).toBeInTheDocument();

		// Check if prize pool is rendered (formatted)
		expect(screen.getByText('$50,000')).toBeInTheDocument();

		// The whole card is the single link — no fake nested "Read more" link
		expect(screen.queryByText('Read more')).not.toBeInTheDocument();
	});

	it('shows the start date for a future tournament', () => {
		render(<FeaturedTournamentCard {...mockProps} startDate='2999-06-01T12:00:00Z' status='UPCOMING' />);
		expect(screen.getByText('Jun 1, 2999')).toBeInTheDocument();
		expect(screen.queryByText('Start pending')).not.toBeInTheDocument();
	});

	it('links to the correct tournament page', () => {
		render(<FeaturedTournamentCard {...mockProps} />);

		// Check if the link points to the correct tournament
		const link = screen.getByRole('link');
		expect(link).toHaveAttribute('href', '/tournaments/1');
	});

	it('has the correct hover effects', () => {
		render(<FeaturedTournamentCard {...mockProps} />);

		// Check if the card has hover effect classes
		const card = screen.getByRole('link');
		expect(card).toHaveClass('motion-safe:hover:scale-[1.02]');
	});
});
