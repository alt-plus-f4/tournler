import { FC } from "react"
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import SignUp from "@/components/SignUp";
import { ChevronLeft } from "lucide-react";

const page: FC = () => {
    return (
        <div className="flex items-center justify-center h-[80vh]">
            <div className="h-full max-w-2xl mx-auto flex flex-col items-center justify-center gap-20">
                <Link href="/" className={cn(buttonVariants({ variant: 'ghost' }), 'self-start -mt-20')}>
                    <ChevronLeft className="mr-2 h-4 w-4"/>
                    HOME
                </Link>

                <SignUp/>
            </div>

        </div>
    );
}

export default page;