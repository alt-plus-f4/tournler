'use client';

import dynamic from 'next/dynamic';

/**
 * RichTextEditor (Tiptap + ProseMirror, ~150 KB) loaded on demand. Every place it's used is a form
 * inside a dialog or an admin panel, so pages that merely import those forms don't pay for the
 * editor until it actually renders. ssr: false because Tiptap renders nothing on the server anyway
 * (immediatelyRender: false); the placeholder keeps the editor's frame so the form doesn't jump.
 */
export const RichTextEditor = dynamic(() => import('./RichTextEditor').then((m) => m.RichTextEditor), {
	ssr: false,
	loading: () => <div aria-hidden className='min-h-[143px] rounded-md border border-input' />,
});
