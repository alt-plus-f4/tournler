export function formatDate(dateString: string): string {
	const date = new Date(dateString);
	return date.toLocaleDateString('en-US', {
		day: 'numeric', 
		month: 'long',
		year: 'numeric',
	});
}