import { AuthModal } from '@/components/AuthModal';
import SignIn from '@/components/SignIn';
import { loadSignInStats } from '@/lib/sign-in-stats';

export default async function Page() {
	const stats = await loadSignInStats();
	return (
		<AuthModal title='Sign in to Tournler' wide>
			<SignIn headingAs='h2' variant='modal' stats={stats} />
		</AuthModal>
	);
}
