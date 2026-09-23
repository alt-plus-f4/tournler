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
	if (session?.user?.id) role = (await isAdmin(session.user.id)) ? 'ADMIN' : 'USER';

	return (
		<>
			<header className='grid grid-cols-3 md:grid-cols-[25%_50%_25%] w-full md:h-14 h-16 items-center px-4 border-y navbar-color sticky top-0 z-50 overflow-x-hidden overflow-y-visible'>
				<BurgerMenu className='md:hidden z-50 col-start-1' />

				<Link href='/' className='col-start-2 md:col-start-1 flex justify-center md:justify-start'>
					<Image src={'/logo.png'} alt='Tournler' width={210} height={32} className='h-auto w-[80px] transition-[filter] hover:brightness-150 sm:w-[140px]' />
				</Link>

				<MainNav className='hidden md:flex col-start-2' />

				<div className='ml-auto space-x-4 flex flex-row items-center col-start-3'>
					{role === 'ADMIN' && (
						<Link
							href='/admin'
							aria-label='Admin'
							className='flex min-h-8 min-w-8 items-center justify-center gap-2 rounded-md bg-red-600 px-2 py-1 text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
						>
							<HiWrenchScrewdriver aria-hidden className='h-4 w-4' />
							<span aria-hidden className='hidden text-xs font-bold uppercase tracking-widest md:block'>
								Admin
							</span>
						</Link>
					)}
					{session?.user ? (
						<div className='flex flex-row space-x-4 justify-center items-center'>
							<Notifications userId={session.user.id} />
							<UserNav />
						</div>
					) : (
						<LoginButtons className='flex flex-row sm:inline' />
					)}
				</div>
			</header>
		</>
	);
}
