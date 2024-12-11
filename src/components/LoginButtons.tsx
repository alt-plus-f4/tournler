import { cn } from "@/lib/utils";
import Link from "next/link";
import { buttonVariants } from "./ui/button";

interface LoginButtonsProps {
    className?: string;
  }

const LoginButtons = ({ className = '' }: LoginButtonsProps) => {
    return ( 
        <div className={cn('', className)}>
            <Link href='/sign-in' className={cn(buttonVariants({ variant: "outline" }), "py-3 px-5")}>Sign In</Link>
            <Link href='/sign-up' className={cn(buttonVariants({ variant: "secondary" }), "py-3 px-5")}>Sign Up</Link>
        </div>
    );
}
 
export default LoginButtons;