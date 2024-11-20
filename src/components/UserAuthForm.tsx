"use client"

import { FC, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Import the Input component from shadcn
import { signIn } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";

type UserAuthFormProps = React.HTMLAttributes<HTMLDivElement>;

const UserAuthForm: FC<UserAuthFormProps> = ({ className, ...props }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const { toast } = useToast();

  const loginWithEmail = async () => {
    setIsLoading(true);

    try {
      await signIn('email', { email }, { callbackUrl: '/' });
    } catch (error) {
      toast({
        title: 'There was a problem.',
        description: 'There was an error logging in with email',
        variant: 'destructive',
      });
      // ! SHOULD REMOVE CONSOLE LOG HERE
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('flex justify-center flex-col', className)} {...props}>
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        className="mb-4"
      />
      <Button onClick={loginWithEmail} isLoading={isLoading} size="sm" variant={'outline'} className="w-full flex-row mb-3">
        {isLoading ? null : 'Sign in with Email'}
      </Button>
    </div>
  );
};

export default UserAuthForm;