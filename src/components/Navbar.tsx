import { BurgerMenu } from "./BurgerMenu"
import { MainNav } from "./main-nav"
import { UserNav } from "./user-nav"
import Link from "next/link"

export default function Navbar() {
    return (
        <>
            <nav className="grid grid-cols-2 md:grid-cols-3 grid-flow-col sticky md:h-14 h-16 items-center px-4 ml-auto mr-auto border-b-2">
                <Link href="/" className="hidden md:block text-sm font-medium transition-colors hover:text-primary">
                    LOGO or text
                </Link>

                <BurgerMenu className="sm:block md:hidden h-4"/>
                <MainNav className="hidden"/>

                <div className="ml-auto space-x-4">
                    <UserNav />
                </div>
            </nav>
        </>
    )
}