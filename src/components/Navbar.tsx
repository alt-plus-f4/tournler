import { BurgerMenu } from './BurgerMenu';
import { MainNav } from './MainNav';
import { UserNav } from './UserNav';
import Link from 'next/link';
import { getAuthSession } from '@/lib/auth';
import LoginButtons from './LoginButtons';
import { getUserRole } from '@/lib/helpers/is-admin';
import { HiWrenchScrewdriver } from 'react-icons/hi2';
import Notifications from './Notifications';

export default async function Navbar() {
    const session = await getAuthSession();
    const role = session?.user?.id ? await getUserRole(session.user.id) : null;
    // console.log(role);

    return (
        <>
            <nav className='grid grid-cols-2 md:grid-cols-[25%_50%_25%] w-full md:h-14 h-16 items-center px-4 border-y navbar-color sticky top-0 z-50 overflow-x-hidden overflow-y-visible'>
                <Link
                    href='/'
                    className='hidden md:block text-sm font-medium transition-colors hover:text-primary'
                >
                    LOGO or text
                </Link>

                <BurgerMenu className='block md:hidden h-4 z-50' />
                <MainNav className='hidden md:flex' />

                <div className='ml-auto space-x-4 flex flex-row items-center'>
                    {role === 1 && (
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
                            <UserNav user={session.user} />
                        </div>
                    ) : (
                        <LoginButtons className='hidden sm:inline' />
                    )}
                </div>
            </nav>
        </>
    );
}