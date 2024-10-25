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
      <div className="mx-auto flex justify-between w-full">
        <Link href="/information" className={cn(buttonVariants({ variant: "ghost" }), "text-xs px-3 lg:text-sm xl:px-7")}>Информация</Link>
        <Link href="/tournaments" className={cn(buttonVariants({ variant: "ghost" }), "text-xs px-3 lg:text-sm xl:px-7")}>Турнири</Link>
        <Link href="/teams" className={cn(buttonVariants({ variant: "ghost" }), "text-xs px-3 lg:text-sm xl:px-7")}>Отбори</Link>
      </div>
    </div>
  )
}
