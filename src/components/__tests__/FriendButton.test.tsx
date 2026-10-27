import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FriendButton } from '../FriendButton';
import { sendFriendRequest } from '@/lib/helpers/friends';

const refresh = jest.fn();
const toast = jest.fn();

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
jest.mock('@/lib/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
jest.mock('@/lib/helpers/friends', () => ({
	acceptFriendRequest: jest.fn(),
	declineFriendRequest: jest.fn(),
	removeFriend: jest.fn(),
	sendFriendRequest: jest.fn(),
}));

describe('FriendButton optimistic updates', () => {
	beforeEach(() => jest.clearAllMocks());

	it('shows the sent state before the request settles', async () => {
		let resolve!: () => void;
		(sendFriendRequest as jest.Mock).mockReturnValue(new Promise<void>((r) => (resolve = r)));
		render(<FriendButton profileUserId='u1' initialStatus='NONE' />);

		fireEvent.click(screen.getByRole('button', { name: /add friend/i }));
		expect(screen.getByRole('button', { name: /request sent/i })).toBeDisabled();

		await act(async () => resolve());
		await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: 'Friend request sent' }));
		expect(refresh).toHaveBeenCalled();
	});

	it('rolls back and shows the error toast when the request fails', async () => {
		(sendFriendRequest as jest.Mock).mockRejectedValue(new Error('Nope'));
		render(<FriendButton profileUserId='u1' initialStatus='NONE' />);

		fireEvent.click(screen.getByRole('button', { name: /add friend/i }));

		await waitFor(() => expect(screen.getByRole('button', { name: /add friend/i })).toBeEnabled());
		expect(toast).toHaveBeenCalledWith({ variant: 'destructive', title: 'Something went wrong', description: 'Nope' });
		expect(refresh).not.toHaveBeenCalled();
	});
});
