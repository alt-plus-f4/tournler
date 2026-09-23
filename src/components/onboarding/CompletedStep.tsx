import { LuPartyPopper } from 'react-icons/lu';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface CompletedStepProps {
  previousStep: () => void;
  close: () => void;
}

export function CompletedStep({ previousStep, close }: CompletedStepProps) {
  return (
    <>
      <div className="flex flex-col items-center text-center w-full">
        <LuPartyPopper aria-hidden className="h-24 w-24 sm:h-40 sm:w-40" />
        <h2 className="my-6 text-lg font-semibold uppercase">You&apos;re set up</h2>
        <p className="text-muted-foreground">Your profile is ready. Join a team or find a tournament to play in.</p>
      </div>
      <DialogFooter className="flex mt-8 justify-around">
      <Button
					onClick={previousStep}
					variant='secondary'
					className='sm:w-48'
				>
					Previous
				</Button>
        <Button className='sm:w-48' onClick={close}>
          Done
        </Button>
      </DialogFooter>
    </>
  );
}