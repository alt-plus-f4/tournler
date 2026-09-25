import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * False during SSR and the hydration render, true afterwards. Lets a server-rendered client
 * component print a deterministic (UTC / en-US) date or number first and switch to the viewer's
 * own timezone and locale right after hydration, without a hydration mismatch.
 */
export function useHydrated(): boolean {
	return useSyncExternalStore(
		subscribe,
		() => true,
		() => false,
	);
}
