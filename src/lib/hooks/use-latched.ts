import { useState } from 'react';

/**
 * true from the first render where `value` is true, and forever after. Used to mount a lazily
 * loaded dialog only once it is first opened, then keep it mounted so it can animate closed.
 */
export function useLatched(value: boolean): boolean {
	const [latched, setLatched] = useState(value);
	if (value && !latched) setLatched(true);
	return latched || value;
}
