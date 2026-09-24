'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { BODY_MAX, CATEGORY_LABELS, FORUM_CATEGORIES, TITLE_MAX, TITLE_MIN, threadSchema, type ForumCategoryValue } from './forum-shared';
import { CharCount, ForumSelect, ForumTextarea } from './ForumFields';

type FieldErrors = Partial<Record<'title' | 'category' | 'body', string>>;

export function NewThreadForm({ defaultCategory }: { defaultCategory: ForumCategoryValue }) {
	const [title, setTitle] = useState('');
	const [category, setCategory] = useState<ForumCategoryValue>(defaultCategory);
	const [body, setBody] = useState('');
	const [errors, setErrors] = useState<FieldErrors>({});
	const [formError, setFormError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	const router = useRouter();

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		setFormError(null);
		const parsed = threadSchema.safeParse({ title, category, body });
		if (!parsed.success) {
			const fieldErrors = parsed.error.flatten().fieldErrors;
			setErrors({ title: fieldErrors.title?.[0], category: fieldErrors.category?.[0], body: fieldErrors.body?.[0] });
			return;
		}
		setErrors({});
		setPending(true);
		try {
			const response = await fetch('/api/forum/threads', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(parsed.data),
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(data.error || 'Could not post the thread. Try again.');
			router.push(`/forum/${data.thread.id}`);
			router.refresh();
		} catch (e) {
			setFormError(e instanceof Error ? e.message : 'Could not post the thread. Try again.');
			setPending(false);
		}
	};

	return (
		<form onSubmit={submit} noValidate className='space-y-5'>
			<div className='space-y-1.5'>
				<div className='flex items-baseline justify-between gap-2'>
					<Label htmlFor='thread-title'>Title</Label>
					<CharCount id='thread-title-count' length={title.trim().length} max={TITLE_MAX} />
				</div>
				<Input
					id='thread-title'
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					maxLength={TITLE_MAX + 20}
					placeholder='What do you want to talk about?'
					aria-invalid={!!errors.title}
					aria-describedby={cn('thread-title-count', errors.title && 'thread-title-error')}
					disabled={pending}
					autoFocus
				/>
				{errors.title ? (
					<p id='thread-title-error' className='text-xs text-signal-live'>
						{errors.title}
					</p>
				) : (
					<p className='text-xs text-muted-foreground'>
						<span className='font-mono tabular-nums'>{TITLE_MIN}</span>–<span className='font-mono tabular-nums'>{TITLE_MAX}</span> characters.
					</p>
				)}
			</div>

			<div className='space-y-1.5 sm:max-w-xs'>
				<Label htmlFor='thread-category'>Category</Label>
				<ForumSelect id='thread-category' value={category} onChange={(e) => setCategory(e.target.value as ForumCategoryValue)} disabled={pending} aria-invalid={!!errors.category}>
					{FORUM_CATEGORIES.map((c) => (
						<option key={c} value={c}>
							{CATEGORY_LABELS[c]}
						</option>
					))}
				</ForumSelect>
				{errors.category && <p className='text-xs text-signal-live'>{errors.category}</p>}
			</div>

			<div className='space-y-1.5'>
				<div className='flex items-baseline justify-between gap-2'>
					<Label htmlFor='thread-body'>Post</Label>
					<CharCount id='thread-body-count' length={body.trim().length} max={BODY_MAX} />
				</div>
				<ForumTextarea
					id='thread-body'
					value={body}
					onChange={(e) => setBody(e.target.value)}
					rows={10}
					aria-invalid={!!errors.body}
					aria-describedby={cn('thread-body-hint thread-body-count', errors.body && 'thread-body-error')}
					disabled={pending}
				/>
				{errors.body && (
					<p id='thread-body-error' className='text-xs text-signal-live'>
						{errors.body}
					</p>
				)}
				<p id='thread-body-hint' className='text-xs text-muted-foreground'>
					Plain text only. Links starting with http:// or https:// become clickable; images and formatting aren&apos;t supported.
				</p>
			</div>

			{formError && (
				<p role='alert' className='rounded-md border border-signal-live/20 bg-signal-live/10 px-3 py-2 text-sm'>
					{formError}
				</p>
			)}

			<div className='flex flex-wrap gap-2'>
				<Button type='submit' isLoading={pending}>
					Post thread
				</Button>
				<Link href='/forum' className={buttonVariants({ variant: 'outline' })}>
					Cancel
				</Link>
			</div>
		</form>
	);
}
