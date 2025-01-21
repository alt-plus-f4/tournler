import { FC } from "react"
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import SignIn from "@/components/SignIn";
import { ChevronLeft } from "lucide-react";
import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";

const page: FC = async () => {
    const session = await getAuthSession();
    if (session) redirect('/');

    return (
        <div className="flex items-center justify-center h-[80vh]">
            <div className="h-full max-w-2xl flex flex-col items-center justify-center gap-20">
                <Link href="/" className={cn(buttonVariants({ variant: 'ghost' }), 'self-start')}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    HOME
                </Link>

                <SignIn />
            </div>
        </div>
    );
};

export default page;