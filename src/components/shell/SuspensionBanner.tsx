'use client';

import { useClientSession } from '@/lib/hooks/use-client-session';
import { SuspensionNotice } from '@/components/SuspensionNotice';

export function SuspensionBanner() {
	const { ban } = useClientSession();
	return ban ? <SuspensionNotice ban={ban} /> : null;
}
