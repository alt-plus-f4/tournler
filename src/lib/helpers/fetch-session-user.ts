import { ExtendedUser } from '../models/user-model';

export default async function fetchSessionUser() {
	try {
		const res = await fetch(`${process.env.NEXTAUTH_URL}/api/user`);
		if (res.ok) {
			const data: ExtendedUser = await res.json();
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