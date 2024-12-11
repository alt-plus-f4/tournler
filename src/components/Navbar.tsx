import { BurgerMenu } from "./BurgerMenu"
import { MainNav } from "./MainNav"
import { UserNav } from "./UserNav"
import Link from "next/link"
import { getAuthSession } from "@/lib/auth";
import LoginButtons from "./LoginButtons";

export default async function Navbar() {

	const session = await getAuthSession();

	return (
		<>
			<nav className="grid grid-cols-2 md:grid-cols-3 grid-flow-col w-full sticky md:h-14 h-16 items-center px-4 ml-auto mr-auto border-b-2">
				<Link href="/" className="hidden md:block text-sm font-medium transition-colors hover:text-primary">
					LOGO or text
				</Link>

				<BurgerMenu className="sm:block md:hidden h-4" />
				<MainNav className="hidden md:flex" />

				<div className="ml-auto space-x-4">
					{session?.user ? (
						<div className="">
							<UserNav user={session.user} />
						</div>
					) : <LoginButtons className="hidden sm:inline" />
					}
				</div >
			</nav >
		</>
	)
}