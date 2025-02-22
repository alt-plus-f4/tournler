import { BurgerMenu } from './BurgerMenu';
import { MainNav } from './MainNav';
import { UserNav } from './UserNav';
import Link from 'next/link';
import LoginButtons from './LoginButtons';
import { isAdmin } from '@/lib/helpers/is-admin';
import { HiWrenchScrewdriver } from 'react-icons/hi2';
import Notifications from './Notifications';
import { Session } from 'next-auth';
import Image from 'next/image';

interface NavbarProps {
	session: Session | null;
}

export default async function Navbar({ session }: NavbarProps) {
	let role = 'USER';
	if (session?.user?.id)
		role = (await isAdmin(session.user.id)) ? 'ADMIN' : 'USER';

	return (
		<>
			<nav className='grid grid-cols-3 md:grid-cols-[25%_50%_25%] w-full md:h-14 h-16 items-center px-4 border-y navbar-color sticky top-0 z-50 overflow-x-hidden overflow-y-visible'>
				<BurgerMenu className='block md:hidden h-4 z-50 col-start-1' />

				<Link
					href='/'
					className='col-start-2 md:col-start-1 flex justify-center md:justify-start'
				>
					<Image
						src={'/logo.png'}
						alt='Tournler'
						width={140}
						height={20}
						className='hover:brightness-150 w-[80px] sm:w-[140px]'
					/>
				</Link>

				<MainNav className='hidden md:flex col-start-2' />

				<div className='ml-auto space-x-4 flex flex-row items-center col-start-3'>
					{role === 'ADMIN' && (
						<Link href='/admin'>
							<div className='bg-red-500 hover:bg-red-400 transition-colors text-white rounded-xl flex justify-center items-center px-2 py-1'>
								<HiWrenchScrewdriver width={8} height={8} />
								<span className='hidden uppercase md:block text-md mx-2'>
									Admin
								</span>
							</div>
						</Link>
					)}
					{session?.user ? (
						<div className='flex flex-row space-x-4 justify-center items-center'>
							<Notifications userId={session.user.id} />
							<UserNav/>
						</div>
					) : (
						<LoginButtons className='flex flex-row sm:inline' />
					)}
				</div>
			</nav>
		</>
	);
}
