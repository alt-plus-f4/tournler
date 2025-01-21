import Link from 'next/link';
import { FaGithub, FaInstagram, FaSteam } from 'react-icons/fa';
import { CiMail } from 'react-icons/ci';

const Footer = () => {
	return (
		<div className='flex flex-col justify-center items-center text-foreground p-5 text-center text-sm w-full mt-auto bottom-0 border-t'>
			<div className='mb-5 flex flex-row gap-8'>
				<Link href={'https://github.com/alt-plus-f4/tournler/'}>
					<FaGithub className='w-7 h-7 hover:text-blue-400 transition-colors' />
				</Link>
				<Link href={'https://www.instagram.com/valhalkata/'}>
					<FaInstagram className='w-7 h-7 hover:text-yellow-300 transition-colors' />
				</Link>
                <Link href={'mailto:valentin@asenov.dev'}>
                    <CiMail className='w-7 h-7 hover:text-red-400 transition-colors' />
                </Link>
				<Link href={'https://steamcommunity.com/id/passenov'}>
					<FaSteam className='w-7 h-7 hover:text-steamLogoColor transition-colors' />
				</Link>
			</div>
			<p>&copy; 2025 Tournler. No rights reserved.</p>
		</div>
	);
};

export default Footer;
