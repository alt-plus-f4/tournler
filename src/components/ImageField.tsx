'use client';

import { useEffect, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * A file picker with a live preview: the current (already-uploaded) image until a new file is
 * chosen, then that file's own local preview. Doesn't upload anything itself — `onFileChange` just
 * hands the caller the picked File, to send wherever (and however) its own save flow needs to.
 */
export function ImageField({
	id,
	label,
	currentUrl,
	onFileChange,
	aspect = 'aspect-video',
}: {
	id: string;
	label: string;
	currentUrl?: string | null;
	onFileChange: (file: File | null) => void;
	/** Tailwind aspect-ratio class for the preview box (banners are wide, logos square). */
	aspect?: string;
}) {
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	// Local object URL for the newly picked file only; revoked whenever it's replaced or unmounted.
	useEffect(() => () => {
		if (previewUrl) URL.revokeObjectURL(previewUrl);
	}, [previewUrl]);

	const shown = previewUrl ?? currentUrl;

	return (
		<div className='space-y-2'>
			<Label htmlFor={id}>{label}</Label>
			<div className={cn('flex items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-muted/40', aspect)}>
				{shown ? (
					// eslint-disable-next-line @next/next/no-img-element -- previews a freshly picked local file (blob: URL) as often as an uploaded one; next/image can't render blob: URLs.
					<img src={shown} alt='' className='h-full w-full object-cover' />
				) : (
					<ImageIcon className='h-8 w-8 text-muted-foreground' aria-hidden />
				)}
			</div>
			<Input
				id={id}
				type='file'
				accept='image/*'
				onChange={(e) => {
					const file = e.target.files?.[0] ?? null;
					setPreviewUrl(file ? URL.createObjectURL(file) : null);
					onFileChange(file);
				}}
			/>
		</div>
	);
}
