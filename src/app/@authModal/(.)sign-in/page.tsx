import { AuthModal } from '@/components/AuthModal';
import SignIn from '@/components/SignIn';

const Page = () => (
	<AuthModal title='Sign in to Tournler'>
		<SignIn headingAs='h2' />
	</AuthModal>
);

export default Page;
