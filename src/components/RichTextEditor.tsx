'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Strikethrough, List, ListOrdered, LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
	value: string;
	onChange: (html: string) => void;
	placeholder?: string;
	className?: string;
	/** id of the visible label element; the editable region is announced with it. */
	labelId?: string;
}

function ToolbarButton({ onClick, active, children, label }: { onClick: () => void; active: boolean; children: React.ReactNode; label: string }) {
	return (
		<button
			type='button'
			onMouseDown={(e) => e.preventDefault()}
			onClick={onClick}
			aria-label={label}
			aria-pressed={active}
			className={cn('flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-white/10', active && 'bg-white/15 text-white')}
		>
			{children}
		</button>
	);
}

export function RichTextEditor({ value, onChange, placeholder, className, labelId }: RichTextEditorProps) {
	const editor = useEditor({
		extensions: [StarterKit.configure({ heading: { levels: [2, 3] } }), Link.configure({ openOnClick: false, autolink: true }), Placeholder.configure({ placeholder: placeholder ?? 'Write something…' })],
		content: value,
		immediatelyRender: false,
		editorProps: {
			attributes: {
				class: 'prose prose-sm prose-invert max-w-none focus:outline-none min-h-[100px] px-3 py-2',
				role: 'textbox',
				'aria-multiline': 'true',
				...(labelId ? { 'aria-labelledby': labelId } : {}),
			},
		},
		onUpdate: ({ editor }) => onChange(editor.getHTML()),
	});

	useEffect(() => {
		if (!editor) return;
		if (value !== editor.getHTML()) {
			editor.commands.setContent(value || '', { emitUpdate: false });
		}
	}, [value, editor]);

	if (!editor) return null;

	const setLink = () => {
		const previousUrl = editor.getAttributes('link').href;
		const url = window.prompt('URL', previousUrl);
		if (url === null) return;
		if (url === '') {
			editor.chain().focus().extendMarkRange('link').unsetLink().run();
			return;
		}
		editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
	};

	return (
		<div className={cn('rounded-md border border-input bg-transparent focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background', className)}>
			<div role='toolbar' aria-label='Formatting' className='flex items-center gap-1 border-b border-input p-1'>
				<ToolbarButton label='Bold' active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
					<Bold className='h-3.5 w-3.5' />
				</ToolbarButton>
				<ToolbarButton label='Italic' active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
					<Italic className='h-3.5 w-3.5' />
				</ToolbarButton>
				<ToolbarButton label='Strikethrough' active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
					<Strikethrough className='h-3.5 w-3.5' />
				</ToolbarButton>
				<ToolbarButton label='Bullet list' active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
					<List className='h-3.5 w-3.5' />
				</ToolbarButton>
				<ToolbarButton label='Ordered list' active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
					<ListOrdered className='h-3.5 w-3.5' />
				</ToolbarButton>
				<ToolbarButton label='Link' active={editor.isActive('link')} onClick={setLink}>
					<LinkIcon className='h-3.5 w-3.5' />
				</ToolbarButton>
			</div>
			<EditorContent editor={editor} />
		</div>
	);
}
