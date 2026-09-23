import { AuthModal } from '@/components/AuthModal';
import SignUp from '@/components/SignUp';

const Page = () => (
	<AuthModal title='Create a Tournler account'>
		<SignUp headingAs='h2' />
	</AuthModal>
);

export default Page;
