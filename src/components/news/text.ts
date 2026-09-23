const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(text: string): string {
	return text.replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

/** Turns a stored (sanitized) blurb back into plain text for the editor's summary field. */
export function htmlToPlainText(html: string): string {
	return html
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/(p|li|h[1-6]|blockquote)>/gi, '\n')
		.replace(/<[^>]*>/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&amp;/g, '&')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

/** True when the value looks like EditorJS output with at least one block. */
export function hasEditorContent(content: unknown): boolean {
	return !!content && typeof content === 'object' && Array.isArray((content as { blocks?: unknown }).blocks) && (content as { blocks: unknown[] }).blocks.length > 0;
}
