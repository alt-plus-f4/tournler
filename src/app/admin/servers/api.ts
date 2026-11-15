/** JSON request to an admin API route; throws an Error carrying the route's own message (or a friendly fallback). */
export async function adminFetch<T = unknown>(url: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', body?: unknown): Promise<T> {
	const res = await fetch(url, {
		method,
		cache: 'no-store',
		headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const json = await res.json().catch(() => null);
	if (!res.ok) throw new Error(res.status === 429 ? 'Too many requests, wait a minute and try again.' : typeof json?.error === 'string' ? json.error : 'Request failed');
	return json as T;
}
