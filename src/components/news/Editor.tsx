'use client';

import type EditorJS from '@editorjs/editorjs';
import type { OutputData } from '@editorjs/editorjs';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import TextareaAutosize from 'react-textarea-autosize';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';

import { toast } from '@/lib/hooks/use-toast';
import { Button, buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { escapeHtml, hasEditorContent, htmlToPlainText } from './text';

import './editor.css';

const PostValidator = z.object({
	title: z.string().trim().min(3, 'Title must be at least 3 characters').max(160, 'Title must be 160 characters or fewer'),
	blurb: z.string().max(600, 'Summary must be 600 characters or fewer'),
	isFeatured: z.boolean(),
});

type FormData = z.infer<typeof PostValidator>;

export interface EditablePost {
	id: number;
	title: string;
	blurb: string;
	content: unknown;
	imageUrl: string | null;
	isFeatured: boolean;
}

interface EditorProps {
	/** Omit to write a new post. */
	post?: EditablePost;
}

// Only services whose embed hosts the server accepts (see api/news/_lib/content.ts).
const EMBED_SERVICES = { youtube: true, 'twitch-video': true, 'twitch-channel': true, vimeo: true, twitter: true };

async function uploadImage(file: File): Promise<string> {
	const body = new FormData();
	body.append('image', file);
	const res = await fetch('/api/news/upload', { method: 'POST', body });
	const payload = await res.json().catch(() => null);
	if (!res.ok || payload?.success !== 1) throw new Error(payload?.error || 'Upload failed');
	return payload.file.url as string;
}

function initialData(post?: EditablePost): OutputData {
	if (post && hasEditorContent(post.content)) return post.content as OutputData;
	// Legacy posts only had a blurb: start the body from it so nothing is lost.
	const legacy = post?.blurb ? htmlToPlainText(post.blurb) : '';
	return {
		blocks: legacy
			? legacy
					.split(/\n{2,}/)
					.filter(Boolean)
					.map((text) => ({ type: 'paragraph', data: { text: escapeHtml(text).replace(/\n/g, '<br>') } }))
			: [],
	};
}

export const Editor: React.FC<EditorProps> = ({ post }) => {
	const isEditing = !!post;
	const {
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors, dirtyFields },
	} = useForm<FormData>({
		resolver: zodResolver(PostValidator),
		defaultValues: {
			title: post?.title ?? '',
			blurb: post?.blurb ? htmlToPlainText(post.blurb) : '',
			isFeatured: post?.isFeatured ?? false,
		},
	});
	const ref = useRef<EditorJS>();
	const _titleRef = useRef<HTMLTextAreaElement | null>(null);
	const router = useRouter();
	const [isMounted, setIsMounted] = useState<boolean>(false);
	const [isSaving, setIsSaving] = useState(false);
	const [imageUrl, setImageUrl] = useState<string | null>(post?.imageUrl ?? null);
	const [isUploadingCover, setIsUploadingCover] = useState(false);
	const isFeatured = watch('isFeatured');

	const initializeEditor = useCallback(async () => {
		const EditorJS = (await import('@editorjs/editorjs')).default;
		const Header = (await import('@editorjs/header')).default;
		const Embed = (await import('@editorjs/embed')).default;
		const Table = (await import('@editorjs/table')).default;
		const List = (await import('@editorjs/list')).default;
		const Code = (await import('@editorjs/code')).default;
		const LinkTool = (await import('@editorjs/link')).default;
		const InlineCode = (await import('@editorjs/inline-code')).default;
		const ImageTool = (await import('@editorjs/image')).default;

		return new EditorJS({
			holder: 'editor',
			placeholder: 'Type here to write your post...',
			inlineToolbar: true,
			data: initialData(post),
			tools: {
				header: { class: Header as any, config: { levels: [2, 3, 4], defaultLevel: 2 } },
				linkTool: {
					class: LinkTool,
					config: {
						endpoint: '/api/news/link',
					},
				},
				image: {
					class: ImageTool,
					config: {
						uploader: {
							async uploadByFile(file: File) {
								try {
									const url = await uploadImage(file);
									return { success: 1, file: { url } };
								} catch (error) {
									toast({ variant: 'destructive', title: 'Image not uploaded', description: error instanceof Error ? error.message : 'Try a smaller PNG, JPEG or WebP.' });
									return { success: 0, file: { url: '' } };
								}
							},
						},
					},
				},
				list: List,
				code: Code,
				inlineCode: InlineCode,
				table: Table,
				embed: { class: Embed, config: { services: EMBED_SERVICES } },
			},
		});
		// Only the first render's post seeds the editor; later prop changes don't reset what's been typed.
	}, []);

	useEffect(() => {
		if (Object.keys(errors).length) {
			for (const value of Object.values(errors)) {
				toast({
					title: 'Something went wrong.',
					description: (value as { message: string }).message,
					variant: 'destructive',
				});
			}
		}
	}, [errors]);

	useEffect(() => {
		if (typeof window !== 'undefined') {
			setIsMounted(true);
		}
	}, []);

	useEffect(() => {
		if (!isMounted) return;
		let disposed = false;

		initializeEditor().then((editor) => {
			if (disposed) {
				editor.isReady.then(() => editor.destroy()).catch(() => {});
				return;
			}
			ref.current = editor;
			setTimeout(() => {
				_titleRef?.current?.focus();
			}, 0);
		});

		return () => {
			disposed = true;
			try {
				ref.current?.destroy();
			} catch {
				// destroy() throws if the editor never finished booting
			}
			ref.current = undefined;
		};
	}, [isMounted, initializeEditor]);

	async function onCoverSelected(file: File | undefined) {
		if (!file) return;
		setIsUploadingCover(true);
		try {
			setImageUrl(await uploadImage(file));
		} catch (error) {
			toast({ variant: 'destructive', title: 'Cover not uploaded', description: error instanceof Error ? error.message : 'Try a smaller image.' });
		} finally {
			setIsUploadingCover(false);
		}
	}

	async function onSubmit(data: FormData) {
		if (!ref.current) return;
		setIsSaving(true);
		try {
			const content = await ref.current.save();
			if (content.blocks.length === 0) {
				toast({ variant: 'destructive', title: 'Nothing to publish', description: 'Write the body of the post first.' });
				return;
			}

			const payload = {
				title: data.title,
				content,
				// An untouched summary on an existing post stays as it is; an empty one is derived from the first paragraph.
				...(!isEditing || dirtyFields.blurb || !data.blurb.trim() ? { blurb: data.blurb } : {}),
				imageUrl,
				isFeatured: data.isFeatured,
			};

			const res = await fetch(isEditing ? `/api/news/${post.id}` : '/api/news', {
				method: isEditing ? 'PATCH' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const body = await res.json().catch(() => null);
			if (!res.ok) throw new Error(body?.error || 'Your post was not saved. Please try again.');

			toast({ description: isEditing ? 'Your post has been updated.' : 'Your post has been published.' });
			router.push(`/news/${body.post.id}`);
			router.refresh();
		} catch (error) {
			toast({
				title: 'Something went wrong.',
				description: error instanceof Error ? error.message : 'Your post was not saved. Please try again.',
				variant: 'destructive',
			});
		} finally {
			setIsSaving(false);
		}
	}

	if (!isMounted) {
		return null;
	}

	const { ref: titleRef, ...rest } = register('title');

	return (
		<form id='news-post-form' className='space-y-6' onSubmit={handleSubmit(onSubmit)}>
			<div className='news-editor w-full rounded-md border border-border bg-card px-4 py-6 md:px-8'>
				<div className='prose prose-invert max-w-none'>
					<TextareaAutosize
						ref={(e) => {
							titleRef(e);
							_titleRef.current = e;
						}}
						{...rest}
						aria-label='Title'
						placeholder='Title'
						className='w-full resize-none appearance-none overflow-hidden bg-transparent text-3xl font-bold leading-tight text-foreground placeholder:text-neutral-500 focus:outline-none md:text-4xl'
					/>
					<div id='editor' className='min-h-[400px]' />
					<p className='text-sm text-muted-foreground'>
						Use <kbd className='rounded-sm border border-border bg-muted px-1 font-mono text-xs uppercase text-foreground'>Tab</kbd> to open the command menu.
					</p>
				</div>
			</div>

			<section aria-labelledby='post-settings' className='space-y-5 rounded-md border border-border p-4 md:p-6'>
				<h2 id='post-settings' className='text-xs font-bold uppercase tracking-widest text-neutral-400'>
					Post settings
				</h2>

				<div className='space-y-2'>
					<Label htmlFor='news-cover'>Cover image</Label>
					{imageUrl && (
						<div className='aspect-[16/9] w-full max-w-sm overflow-hidden rounded-md border border-border'>
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img src={imageUrl} alt='' className='h-full w-full object-cover' />
						</div>
					)}
					<div className='flex flex-wrap items-center gap-3'>
						<input
							id='news-cover'
							type='file'
							accept='image/png,image/jpeg,image/webp,image/gif,image/avif'
							disabled={isUploadingCover}
							onChange={(e) => {
								onCoverSelected(e.target.files?.[0]);
								e.target.value = '';
							}}
							className='block text-sm text-muted-foreground file:mr-3 file:h-9 file:cursor-pointer file:rounded-md file:border file:border-border file:bg-background file:px-3 file:text-sm file:text-foreground hover:file:bg-accent'
						/>
						{isUploadingCover && <Loader2 aria-label='Uploading' className='h-4 w-4 animate-spin text-muted-foreground' />}
						{imageUrl && !isUploadingCover && (
							<Button type='button' variant='ghost' size='sm' onClick={() => setImageUrl(null)}>
								Remove cover
							</Button>
						)}
					</div>
					<p className='text-xs text-muted-foreground'>PNG, JPEG, WebP, GIF or AVIF, up to 5MB. Shown on the feed and the homepage card.</p>
				</div>

				<div className='space-y-2'>
					<Label htmlFor='news-blurb'>Summary</Label>
					<TextareaAutosize
						id='news-blurb'
						minRows={2}
						maxRows={6}
						{...register('blurb')}
						placeholder='Leave empty to use the first paragraph'
						className='flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
					/>
				</div>

				<label htmlFor='news-featured' className='flex w-fit cursor-pointer items-center gap-2'>
					<Checkbox id='news-featured' checked={isFeatured} onCheckedChange={(checked) => setValue('isFeatured', checked === true, { shouldDirty: true })} />
					<span className='text-sm'>Feature on the homepage</span>
				</label>
			</section>

			<div className='flex flex-wrap items-center justify-end gap-2'>
				<Link href={isEditing ? `/news/${post.id}` : '/news'} className={cn(buttonVariants({ variant: 'outline' }))}>
					Cancel
				</Link>
				<Button type='submit' isLoading={isSaving} disabled={isSaving || isUploadingCover}>
					{isEditing ? 'Save changes' : 'Publish post'}
				</Button>
			</div>
		</form>
	);
};
