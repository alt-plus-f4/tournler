import Link from "next/link"
import { Button } from "./ui/button"
import { cn } from "@/lib/utils"

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <div
      className={cn("md:flex items-center", className)}
      {...props}
    >
      <div className="mx-auto">
        <Button variant={'ghost'} className="text-xs px-3 lg:text-sm xl:px-7 xl:mx-2" asChild>
          <Link href="/information">Информация</Link>
        </Button>
        <Button variant={'ghost'} className="text-xs px-3 lg:text-sm xl:px-7 xl:mx-2" asChild>
          <Link href="/">Турнири</Link>
        </Button>
        <Button variant={'ghost'} className="text-xs px-3 lg:text-sm xl:px-7 xl:mx-2" asChild>
          <Link href="/login">Отбори</Link>
        </Button>
      </div>
    </div>
  )
}
