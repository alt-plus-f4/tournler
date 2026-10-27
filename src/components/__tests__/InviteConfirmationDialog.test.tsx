import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { InviteConfirmationDialog } from '../InviteConfirmationDialog';

const toast = jest.fn();
jest.mock('@/lib/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

const user = { id: 'u1', name: 'Dexter', email: 'd@example.com', image: null };

describe('InviteConfirmationDialog optimistic invite', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('marks the player invited at click time and confirms on success', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as unknown as typeof fetch;
		const onStart = jest.fn();
		const onFailed = jest.fn();
		const onSuccess = jest.fn();
		render(<InviteConfirmationDialog user={user as never} teamId={1} completeSuccessfulInviteConfirmation={onSuccess} onInviteStart={onStart} onInviteFailed={onFailed} />);

		fireEvent.click(screen.getByRole('button', { name: 'Invite' }));
		expect(onStart).toHaveBeenCalledTimes(1);

		await waitFor(() => expect(onSuccess).toHaveBeenCalled());
		expect(onFailed).not.toHaveBeenCalled();
		expect(toast).toHaveBeenCalledWith({ variant: 'default', title: 'Invitation sent' });
	});

	it('undoes the optimistic invite and toasts when the server rejects it', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Already invited' }) }) as unknown as typeof fetch;
		const onFailed = jest.fn();
		const onSuccess = jest.fn();
		render(<InviteConfirmationDialog user={user as never} teamId={1} completeSuccessfulInviteConfirmation={onSuccess} onInviteStart={jest.fn()} onInviteFailed={onFailed} />);

		fireEvent.click(screen.getByRole('button', { name: 'Invite' }));

		await waitFor(() => expect(onFailed).toHaveBeenCalled());
		expect(onSuccess).not.toHaveBeenCalled();
		expect(toast).toHaveBeenCalledWith({ variant: 'destructive', title: "Couldn't send the invitation", description: 'Already invited' });
	});
});
