'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useLatched } from '@/lib/hooks/use-latched';

// The create form is only fetched once first opened.
const CreateMatchDialog = dynamic(() => import('@/components/CreateMatchDialog'));

/** Rendered only for viewers with matches:manage (decided on the server). Refreshes the list on create. */
export function CreateMatchButton() {
	const router = useRouter();
	const [isOpen, setIsOpen] = useState(false);
	const mounted = useLatched(isOpen);

	return (
		<>
			<Button onClick={() => setIsOpen(true)}>Create Match</Button>
			{mounted && <CreateMatchDialog isOpen={isOpen} onClose={() => setIsOpen(false)} onCreate={() => router.refresh()} />}
		</>
	);
}
