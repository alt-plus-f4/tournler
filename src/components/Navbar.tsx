import { BurgerMenu } from "./BurgerMenu"
import { MainNav } from "./MainNav"
import { UserNav } from "./UserNav"
import Link from "next/link"
import { getAuthSession } from "@/lib/auth";

export default async function Navbar() {

    const session = await getAuthSession();

    return (
        <>
            <nav className="grid grid-cols-2 md:grid-cols-3 grid-flow-col sticky md:h-14 h-16 items-center px-4 ml-auto mr-auto border-b-2">
                <Link href="/" className="hidden md:block text-sm font-medium transition-colors hover:text-primary">
                    LOGO or text
                </Link>

                <BurgerMenu className="sm:block md:hidden h-4"/>
                <MainNav className="hidden"/>

                <div className="ml-auto space-x-4">
                    {session?.user ? (
                        <div className="profile-corner">
                            <UserNav user={session.user} />
                        </div>
                    ) :
                        (<Link href='/sign-in' className='sign-in-btn'> Sign In</Link>)}
                </div>
            </nav>
        </>
    )
}