import { render, screen, act } from '@testing-library/react';
import Timer from '../Timer';

describe('Timer', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('displays the correct time format', () => {
		// 1 day, 2 hours, 3 minutes, 4 seconds in milliseconds
		const timeLeft =
			1 * 24 * 60 * 60 * 1000 +
			2 * 60 * 60 * 1000 +
			3 * 60 * 1000 +
			4 * 1000;

		render(<Timer timeLeft={timeLeft} />);

		// Get the span element that contains the timer text
		const timerDisplay = screen.getByText(/Time left to join:/);
		// Check if the timer displays the correct format including days
		expect(timerDisplay.textContent).toMatch(
			/Time left to join:\s*1d\s*02h\s*03m\s*04\s*s/ // Changed 01d to 1d
		);
	});

	it('updates the timer correctly', () => {
		// 10 seconds in milliseconds (0 days, 0 hours, 0 minutes, 10 seconds)
		const timeLeft = 10 * 1000;

		render(<Timer timeLeft={timeLeft} />);
		const timerDisplay = screen.getByText(/Time left to join:/);

		// Initial time - should not include "00d"
		expect(timerDisplay.textContent).toMatch(
			/Time left to join:\s*00h\s*00m\s*10\s*s/
		);

		// Advance timer by 1 second
		act(() => {
			jest.advanceTimersByTime(1000);
		});

		// Time should be updated
		expect(timerDisplay.textContent).toMatch(
			/Time left to join:\s*00h\s*00m\s*09\s*s/
		);

		// Advance timer by 9 more seconds
		act(() => {
			jest.advanceTimersByTime(9000);
		});

		// Time should be zero
		expect(timerDisplay.textContent).toMatch(
			/Time left to join:\s*00h\s*00m\s*00\s*s/
		);
	});

	it('stops at zero and does not go negative', () => {
		// 1 second in milliseconds
		const timeLeft = 1000;

		render(<Timer timeLeft={timeLeft} />);
		const timerDisplay = screen.getByText(/Time left to join:/);

		// Optionally, check initial time
		// expect(timerDisplay.textContent).toMatch(/Time left to join:\s*00h\s*00m\s*01\s*s/);

		// Advance timer by 2 seconds (more than timeLeft)
		act(() => {
			jest.advanceTimersByTime(2000);
		});

		// Time should be zero, not negative, and not include "00d"
		expect(timerDisplay.textContent).toMatch(
			/Time left to join:\s*00h\s*00m\s*00\s*s/
		);
	});
});
