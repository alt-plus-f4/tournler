'use client';

import { FaSteamSymbol } from 'react-icons/fa6';
import { DialogTitle } from '@radix-ui/react-dialog';
import { useToast } from '@/hooks/use-toast';
import { Button } from '../ui/button';
import { DialogFooter } from '../ui/dialog';

interface SteamStepProps {
  previousStep: () => void;
  nextStep: () => void;
}

export function SteamStep({ previousStep, nextStep }: SteamStepProps) {
  const { toast } = useToast();

  // Initiates the Steam login by calling the backend
  const handleSteamLogin = async () => {
    try {
      // Call the backend to initiate Steam login (this triggers the redirect to Steam)
      const response = await fetch('/api/auth/steam'); // This calls the backend route that handles the redirect

      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: 'Login Error',
          description: 'Failed to initiate Steam login.',
        });
        return;
      }

      const data = await response.json();
      const steamLoginUrl = data.url;

	  window.location.href = steamLoginUrl;

      // Open the Steam login URL in a new tab
    //   window.open(steamLoginUrl, '_blank');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Login Error',
        description: 'An error occurred while initiating Steam login.',
      });
      console.error(error);
    }
  };

  return (
    <>
      <div
        className="flex flex-col px-32 py-20 m-1 items-center text-center w-full cursor-pointer transition-300 hover:bg-steamColor rounded-md"
        onClick={handleSteamLogin}
      >
        <FaSteamSymbol className="w-40 h-40" />
        <DialogTitle className="text-2xl font-semibold">
          Steam account linking
        </DialogTitle>
      </div>

      <DialogFooter className="flex mt-8 justify-around">
        <Button
          onClick={previousStep}
          variant="secondary"
          className="sm:w-48"
        >
          Previous
        </Button>
        <Button onClick={nextStep} className="sm:w-48">
          Continue
        </Button>
      </DialogFooter>
    </>
  );
}
