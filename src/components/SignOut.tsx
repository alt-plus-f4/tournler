'use client';

import { DropdownMenuItem } from "@radix-ui/react-dropdown-menu";
import { signOut } from "next-auth/react";
import { DropdownMenuShortcut } from "./ui/dropdown-menu";
import { LogOut } from "lucide-react";

const SignOut: React.FC = () => {
    return (
        <DropdownMenuItem
            onSelect={() => {
                signOut({
                    callbackUrl: `/`,
                });
            }}
            className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
        >
            <LogOut />
            <span>Sign Out</span>
            <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
    );
};

export default SignOut;