'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RichTextEditor } from '@/components/RichTextEditor';
import { useToast } from '@/lib/hooks/use-toast';
import Link from 'next/link';
import { PenLine } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface NewsPostDefinition {
	id: number;
	title: string;
	blurb: string;
	imageUrl: string | null;
	link: string | null;
	isFeatured: boolean;
	featuredOrder: number | null;
	publishedAt: string;
	/** EditorJS body; present on posts written in the /news editor. */
	content?: unknown;
}

interface EditNewsDialogProps {
	post: NewsPostDefinition | null;
	isOpen: boolean;
	onClose: () => void;
	onSave: (post: NewsPostDefinition) => void;
	onDelete?: (postId: number) => void;
}

export default function EditNewsDialog({ post, isOpen, onClose, onSave, onDelete }: EditNewsDialogProps) {
	const isCreating = post === null;
	const [title, setTitle] = useState('');
	const [blurb, setBlurb] = useState('');
	const [imageUrl, setImageUrl] = useState('');
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(null);
	const [link, setLink] = useState('');
	const [isFeatured, setIsFeatured] = useState(false);
	const [featuredOrder, setFeaturedOrder] = useState('');
	const [isSaving, setIsSaving] = useState(false);
	const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const { toast } = useToast();

	useEffect(() => {
		if (isOpen) {
			setTitle(post?.title ?? '');
			setBlurb(post?.blurb ?? '');
			setImageUrl(post?.imageUrl ?? '');
			setImageFile(null);
			setImagePreview(null);
			setLink(post?.link ?? '');
			setIsFeatured(post?.isFeatured ?? false);
			setFeaturedOrder(post?.featuredOrder != null ? String(post.featuredOrder) : '');
			setIsConfirmingDelete(false);
		}
	}, [post, isOpen]);

	useEffect(() => {
		if (!imageFile) return;
		const url = URL.createObjectURL(imageFile);
		setImagePreview(url);
		return () => URL.revokeObjectURL(url);
	}, [imageFile]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSaving(true);
		try {
			const url = isCreating ? '/api/admin/news' : `/api/admin/news/${post.id}`;
			const method = isCreating ? 'POST' : 'PATCH';

			const fd = new FormData();
			fd.append('title', title);
			fd.append('blurb', blurb);
			fd.append('link', link);
			fd.append('isFeatured', String(isFeatured));
			fd.append('featuredOrder', featuredOrder);
			if (imageFile) {
				fd.append('imageFile', imageFile);
			} else if (!isCreating && !imageUrl && post?.imageUrl) {
				fd.append('clearImage', 'true');
			}

			const response = await fetch(url, { method, body: fd });
			const payload = await response.json().catch(() => null);
			if (!response.ok) throw new Error(payload?.error || 'Failed to save news post');

			toast({ title: isCreating ? 'Post created' : 'Post updated' });
			onSave(payload.post);
			onClose();
		} catch (error) {
			console.error('Failed to save news post', error);
			toast({ variant: 'destructive', title: 'Could not save post', description: error instanceof Error ? error.message : 'An unexpected error occurred' });
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!post) return;
		setIsDeleting(true);
		try {
			const response = await fetch(`/api/admin/news/${post.id}`, { method: 'DELETE' });
			if (!response.ok) throw new Error('Failed to delete news post');

			toast({ title: 'Post deleted' });
			onDelete?.(post.id);
			onClose();
		} catch (error) {
			console.error('Failed to delete news post', error);
			toast({ variant: 'destructive', title: 'Could not delete post' });
		} finally {
			setIsDeleting(false);
			setIsConfirmingDelete(false);
		}
	};

	if (isConfirmingDelete && post) {
		return (
			<Dialog open={isOpen} onOpenChange={onClose}>
				<DialogContent className='sm:max-w-[440px]'>
					<DialogHeader>
						<DialogTitle>Delete &quot;{post.title}&quot;?</DialogTitle>
						<DialogDescription>This removes the post and its homepage placement. This can&apos;t be undone.</DialogDescription>
					</DialogHeader>
					<DialogFooter className='flex justify-end gap-2'>
						<Button variant='outline' onClick={() => setIsConfirmingDelete(false)}>
							Cancel
						</Button>
						<Button variant='destructive' onClick={handleDelete} disabled={isDeleting}>
							{isDeleting ? 'Deleting…' : 'Delete'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className='sm:max-w-[480px]'>
				<DialogHeader>
					<DialogTitle>{isCreating ? 'Create News Post' : 'Edit News Post'}</DialogTitle>
					<DialogDescription>Announcements shown on the homepage when featured.</DialogDescription>
				</DialogHeader>

				<div className='flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5'>
					<p className='text-sm text-muted-foreground'>{isCreating ? 'Writing a full article? Use the post editor.' : post.content ? 'This post has a full article body.' : 'Add a full article body in the post editor.'}</p>
					<Link href={isCreating ? '/news/new' : `/news/${post.id}/edit`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'shrink-0')}>
						<PenLine aria-hidden className='mr-2 h-4 w-4' />
						{isCreating ? 'Open editor' : 'Edit body'}
					</Link>
				</div>

				<form onSubmit={handleSubmit} className='space-y-5'>
					<div className='space-y-2'>
						<Label htmlFor='news-title'>Title</Label>
						<Input id='news-title' value={title} onChange={(e) => setTitle(e.target.value)} placeholder='New season kicks off next week' required />
					</div>

					<div className='space-y-2'>
						<Label id='news-blurb-label'>Blurb</Label>
						<RichTextEditor labelId='news-blurb-label' value={blurb} onChange={setBlurb} placeholder='Short summary shown on the card' />
					</div>

					<div className='space-y-2'>
						<Label htmlFor='news-image-file'>Image</Label>
						{(imagePreview ?? imageUrl) && (
							<div className='h-32 w-full max-w-xs overflow-hidden rounded-md border border-border'>
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img src={imagePreview ?? imageUrl} alt='' className='h-full w-full object-cover' />
							</div>
						)}
						<Input id='news-image-file' type='file' accept='image/*' onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
						{imageFile && <p className='text-xs text-muted-foreground'>Selected: {imageFile.name}</p>}
						{!imageFile && imageUrl && (
							<button
								type='button'
								className='text-xs text-muted-foreground underline'
								onClick={() => {
									setImageUrl('');
									setImageFile(null);
								}}
							>
								Remove image
							</button>
						)}
					</div>

					<div className='space-y-2'>
						<Label htmlFor='news-link'>Link (optional)</Label>
						<Input id='news-link' value={link} onChange={(e) => setLink(e.target.value)} placeholder='https://...' />
						{!isCreating && !!post.content && <p className='text-xs text-muted-foreground'>The homepage card opens the article on /news, so this link isn&apos;t used.</p>}
					</div>

					<div className='flex items-center gap-4'>
						<label htmlFor='news-featured' className='flex items-center gap-2 cursor-pointer'>
							<Checkbox id='news-featured' checked={isFeatured} onCheckedChange={(checked) => setIsFeatured(checked === true)} />
							<span className='text-sm'>Featured on homepage</span>
						</label>
						<div className='flex items-center gap-2'>
							<Label htmlFor='news-order' className='text-sm text-muted-foreground shrink-0'>
								Order
							</Label>
							<Input id='news-order' type='number' value={featuredOrder} onChange={(e) => setFeaturedOrder(e.target.value)} className='h-9 w-20' placeholder='0' />
						</div>
					</div>

					<DialogFooter className='flex flex-wrap justify-end gap-2 pt-2'>
						{!isCreating && onDelete && (
							<Button type='button' variant='destructive' className='mr-auto' onClick={() => setIsConfirmingDelete(true)}>
								Delete
							</Button>
						)}
						<Button type='button' variant='outline' onClick={onClose}>
							Cancel
						</Button>
						<Button type='submit' disabled={isSaving}>
							{isSaving ? 'Saving…' : isCreating ? 'Create Post' : 'Save changes'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
