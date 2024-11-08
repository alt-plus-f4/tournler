import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '../ui/button';
import { FaCheck, FaDiscord } from 'react-icons/fa';
import { DialogTitle } from '@radix-ui/react-dialog';
import { DialogFooter } from '../ui/dialog';

interface DiscordStepProps {
  previousStep: () => void;
  nextStep: () => void;
}

export function DiscordStep({ previousStep, nextStep }: DiscordStepProps) {
  const [isDiscordAccountLinked, setIsDiscordAccountLinked] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function updateDiscordAccountStatus() {
      try {
        const response = await fetch('/api/user/discord');
        const data = await response.json();

        if (response.ok) {
          setIsDiscordAccountLinked(data.hasLinkedDiscord);
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: data.error || 'Failed to fetch Discord account status.',
          });
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'An unexpected error occurred.',
        });
        // ! #REMOVE
        console.error(error);
      }
    }

    updateDiscordAccountStatus();
  }, []);

  return (
    <>
      <div className="flex flex-col items-center text-center w-full">
        {isDiscordAccountLinked ? (
          <FaCheck className="w-52 h-52" />
        ) : (<></>
        )}
        <DialogTitle className="text-2xl font-semibold">Discord account linking</DialogTitle>
        <Button
          onClick={() => signIn('discord')}
          rel="opener"
          className='mt-6 p-8 text-white bg-discordColor'
        >
          <FaDiscord className="mr-2 h-4 w-4" />
          Log in with Discord
        </Button>
      </div>

      <DialogFooter className="flex mt-8 justify-around">
        <Button onClick={previousStep} variant="secondary" className='sm:w-48'>
          Назад
        </Button>
        {isDiscordAccountLinked ? (
          <Button onClick={nextStep} className='sm:w-48'>Продължи</Button>
        ) : (
          <>
            <Button onClick={nextStep} variant="secondary" className='sm:w-48'>
              Skip
            </Button>

          </>
        )}
      </DialogFooter>
    </>
  );
}