export default async function fetchSessionUser() {
	try {
		const res = await fetch(`/api/user`);
		if (res.ok) {
			const data = await res.json();
			return data;
		} else {
			console.error('Failed to fetch user:', res.statusText);
			return null;
		}
	} catch (error) {
		console.error('Error fetching session user:', error);
		return null;
	}
}