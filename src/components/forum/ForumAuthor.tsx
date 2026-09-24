import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export interface PublicAuthor {
	id: string;
	name: string | null;
	image: string | null;
}

export const authorName = (author: PublicAuthor) => author.name?.trim() || 'Unnamed player';

export function ForumAvatar({ author, className }: { author: PublicAuthor; className?: string }) {
	return (
		<Avatar className={cn('h-8 w-8 border border-border', className)}>
			{author.image && <AvatarImage src={author.image} alt='' />}
			<AvatarFallback className='bg-muted text-xs font-bold uppercase text-muted-foreground'>{authorName(author).charAt(0)}</AvatarFallback>
		</Avatar>
	);
}

/** Author name linking to their profile. */
export function AuthorLink({ author, className }: { author: PublicAuthor; className?: string }) {
	return (
		<Link href={`/profile/${author.id}`} className={cn('font-medium text-foreground hover:underline underline-offset-2', className)}>
			{authorName(author)}
		</Link>
	);
}
