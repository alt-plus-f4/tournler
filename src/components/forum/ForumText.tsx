import { cn } from '@/lib/utils';
import { tokenizeLinks } from './forum-shared';

/** Renders user-written plain text: whitespace preserved, http(s) URLs linked. No HTML is ever interpreted. */
export function ForumText({ text, className }: { text: string; className?: string }) {
	return (
		<div className={cn('whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground', className)}>
			{tokenizeLinks(text).map((token, i) =>
				token.type === 'link' ? (
					<a key={i} href={token.value} target='_blank' rel='nofollow ugc noopener noreferrer' className='[overflow-wrap:anywhere] text-foreground underline underline-offset-2 decoration-muted-foreground hover:decoration-foreground'>
						{token.value}
					</a>
				) : (
					<span key={i}>{token.value}</span>
				),
			)}
		</div>
	);
}
