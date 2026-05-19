'use client';

import CloseModal from '@/components/CloseModal';
import SignIn from '@/components/SignIn';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const Page = () => {
	const router = useRouter();

	useEffect(() => {
		try {
			if (!sessionStorage.getItem('preAuthPath')) {
				sessionStorage.setItem('preAuthPath', window.location.pathname || '/');
			}
		} catch (e) {}
	}, []);

	return (
		<div className='fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center' onClick={() => router.back()}>
			<div className='relative bg-popupcolor border-2 w-full max-w-md h-fit py-8 px-6 rounded-lg mx-4' onClick={(e) => e.stopPropagation()}>
				<div className='absolute top-4 right-4'>
					<CloseModal />
				</div>
				<SignIn />
			</div>
		</div>
	);
};

export default Page;
