'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';

interface BurgerMenuProps {
	className?: string;
}

export const BurgerMenu: React.FC<BurgerMenuProps> = ({ className }) => {
	const [isOpen, setIsOpen] = useState(false);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const toggleMenu = () => {
		setIsOpen(!isOpen);
	};

	return (
		<>
			<button
				onClick={toggleMenu}
				className={`focus:outline-none ${className} w-7`}
				aria-label='Open Menu'
			>
				<svg
					className='w-6 h-6 text-white'
					fill='none'
					stroke='currentColor'
					viewBox='0 0 24 24'
					xmlns='http://www.w3.org/2000/svg'
				>
					<path
						strokeLinecap='round'
						strokeLinejoin='round'
						strokeWidth='2'
						d='M4 6h16M4 12h16m-7 6h7'
					></path>
				</svg>
			</button>

			{mounted &&
				createPortal(
					<>
						<div
							className={`fixed inset-0 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
						>
							<div
								className={`fixed md:hidden inset-y-0 left-0 w-1/2 bg-white shadow-lg transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
							>
								<div className='flex justify-end p-4'>
									<button
										onClick={toggleMenu}
										className='focus:outline-none'
										aria-label='Close Menu'
									>
										<svg
											className='w-6 h-6 text-black'
											fill='none'
											stroke='currentColor'
											viewBox='0 0 24 24'
											xmlns='http://www.w3.org/2000/svg'
										>
											<path
												strokeLinecap='round'
												strokeLinejoin='round'
												strokeWidth='2'
												d='M6 18L18 6M6 6l12 12'
											></path>
										</svg>
									</button>
								</div>

								<ul className='flex flex-col items-center justify-between mt-[30%] h-[60%] p-4 space-y-4'>
									<li>
										<Link href='/information' onClick={toggleMenu}>
											<span className='block text-black text-lg transition-transform hover:scale-105'>
												Информация
											</span>
										</Link>
									</li>
									<li>
										<Link href='/tournaments' onClick={toggleMenu}>
											<span className='block text-black text-lg transition-transform hover:scale-105'>
												Турнири
											</span>
										</Link>
									</li>
									<li>
										<Link href='/teams' onClick={toggleMenu}>
											<span className='block text-black text-lg transition-transform hover:scale-105'>
												Отбори
											</span>
										</Link>
									</li>
								</ul>
							</div>
						</div>
						<div
							className={`fixed sm:hidden inset-0 bg-black z-30 transition-opacity duration-300 ${isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'}`}
							onClick={toggleMenu}
						></div>
					</>,
					document.body
				)}
		</>
	);
};
