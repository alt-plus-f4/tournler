import { Button } from "./ui/button";

interface PaginationProps {
    totalPages: number;
    currentPage: number;
    onPageChange: (page: number) => void;
  }
  
  export function Pagination({ totalPages, currentPage, onPageChange }: PaginationProps) {
    return (
      <div className='mt-4 flex justify-center gap-2'>
				<Button
					onClick={() => onPageChange(currentPage - 1)}
					disabled={currentPage === 1}
				>
					&lt;
				</Button>
				<span className='py-2 px-4 border bg-muted text-white'>
					{currentPage}
				</span>
				<Button
					onClick={() => onPageChange(currentPage + 1)}
					disabled={currentPage === totalPages}
				>
					&gt;
				</Button>
			</div>
    );
  }
  