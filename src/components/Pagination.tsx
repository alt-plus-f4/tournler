import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

interface PaginationProps {
	totalPages: number;
	currentPage: number;
	onPageChange: (page: number) => void;
}

export function Pagination({ totalPages, currentPage, onPageChange }: PaginationProps) {
	const pages = Math.max(1, totalPages);
	return (
		<nav aria-label='Pagination' className='mt-4 flex items-center justify-center gap-2'>
			<Button variant='outline' size='icon' onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1} aria-label='Previous page'>
				<ChevronLeft aria-hidden />
			</Button>
			<span className='px-3 text-sm text-muted-foreground' aria-live='polite'>
				Page <span className='font-mono tabular-nums text-foreground'>{currentPage}</span> of <span className='font-mono tabular-nums text-foreground'>{pages}</span>
			</span>
			<Button variant='outline' size='icon' onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= pages} aria-label='Next page'>
				<ChevronRight aria-hidden />
			</Button>
		</nav>
	);
}
