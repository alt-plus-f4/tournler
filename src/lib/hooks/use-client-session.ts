'use client';

import useSWR from 'swr';
import type { Session } from 'next-auth';

async function fetchSession(): Promise<Session | null> {
	const res = await fetch('/api/auth/session', { cache: 'no-store' });
	if (!res.ok) return null;
	const json = await res.json();
	// next-auth answers `{}` when signed out.
	return json && json.user ? (json as Session) : null;
}

/**
 * The session, fetched in the browser. The root layout no longer reads cookies, so every page can
 * be statically rendered or streamed; the account-specific chrome (navbar account area,
 * suspension notice, onboarding) hydrates from this instead. One shared SWR key = one request.
 *
 * `session.user.ban` is set for suspended accounts (see src/lib/bans.ts). This is for display
 * only; authorization always happens on the server via getAuthSession().
 */
export function useClientSession() {
	const { data, isLoading, mutate } = useSWR('/api/auth/session', fetchSession, { revalidateOnFocus: true, dedupingInterval: 30_000 });
	const session = data ?? null;
	const ban = session?.user?.ban ?? null;
	return { session, ban, isLoading, refresh: mutate, status: isLoading ? ('loading' as const) : session ? ('authenticated' as const) : ('unauthenticated' as const) };
}
