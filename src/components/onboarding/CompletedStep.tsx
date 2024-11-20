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
        <LuPartyPopper className="w-52 h-52" />
        <h1 className="text-lg font-semibold uppercase my-8">Congratulations!</h1>
        <p>You have successfully completed the onboarding process.</p>
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
          <LuPartyPopper className="mr-2 h-4 w-4" />
          Done
        </Button>
      </DialogFooter>
    </>
  );
}