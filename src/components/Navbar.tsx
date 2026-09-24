import { BurgerMenu } from './BurgerMenu';
import { MainNav } from './MainNav';
import Link from 'next/link';
import Image from 'next/image';
import { NavAccount } from './shell/NavAccount';

// Static shell: nothing here reads the request, so pages that don't need it can be prerendered.
// Account-specific controls hydrate client-side in <NavAccount />.
export default function Navbar() {

	return (
		<>
			<header className='grid grid-cols-3 xl:grid-cols-[20%_60%_20%] w-full xl:h-14 h-16 items-center px-4 border-y navbar-color sticky top-0 z-50 overflow-x-hidden overflow-y-visible'>
				<BurgerMenu className='xl:hidden z-50 col-start-1' />

				<Link href='/' className='col-start-2 xl:col-start-1 flex justify-center xl:justify-start'>
					<Image src={'/logo.png'} alt='Tournler' width={210} height={32} className='h-auto w-[80px] transition-[filter] hover:brightness-150 sm:w-[140px]' />
				</Link>

				<MainNav className='hidden xl:flex col-start-2' />

				<div className='ml-auto flex flex-row items-center col-start-3'>
					<NavAccount />
				</div>
			</header>
		</>
	);
}
