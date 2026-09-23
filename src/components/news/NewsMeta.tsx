import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export interface NewsAuthorData {
	id: string;
	name: string | null;
	image: string | null;
}

export function NewsAuthor({ author, size = 'sm', className }: { author: NewsAuthorData; size?: 'sm' | 'md'; className?: string }) {
	const name = author.name || 'Tournler staff';
	return (
		<span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
			<Avatar className={size === 'md' ? 'h-8 w-8' : 'h-6 w-6'}>
				{author.image && <AvatarImage src={author.image} alt='' />}
				<AvatarFallback className='bg-neutral-800 text-[10px] font-bold text-foreground'>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
			</Avatar>
			<span className='truncate font-medium text-foreground'>{name}</span>
		</span>
	);
}

/** YYYY-MM-DD in mono, the same on server and client (UTC). */
export function NewsDate({ date, className }: { date: Date | string; className?: string }) {
	const d = typeof date === 'string' ? new Date(date) : date;
	const iso = d.toISOString();
	return (
		<time dateTime={iso} className={cn('font-mono tabular-nums text-muted-foreground', className)}>
			{iso.slice(0, 10)}
		</time>
	);
}
