import Link from "next/link"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <div
      className={cn("items-center", className)}
      {...props}
    >
      <div className="mx-auto flex justify-between w-full h-full">
        <Link href="/information" className={cn(buttonVariants({ variant: "ghost" }), "text-xs px-3 lg:text-sm xl:px-12 border-x ")}>Информация</Link>
        <Link href="/tournaments" className={cn(buttonVariants({ variant: "ghost" }), "text-xs px-3 lg:text-sm xl:px-12 border-x")}>Турнири</Link>
        <Link href="/teams" className={cn(buttonVariants({ variant: "ghost" }), "text-xs px-3 lg:text-sm xl:px-12 border-x")}>Отбори</Link>
      </div>
    </div>
  )
}
