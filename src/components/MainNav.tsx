import Link from "next/link"
import { Button } from "./ui/button"
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
      <div className="mx-auto">
        <Link href="/information" className={cn(buttonVariants({ variant: "ghost" }), "text-xs px-3 lg:text-sm xl:px-7 xl:mx-2")}>Информация</Link>
        <Link href="/" className={cn(buttonVariants({ variant: "ghost" }), "text-xs px-3 lg:text-sm xl:px-7 xl:mx-2")}>Турнири</Link>
        <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }), "text-xs px-3 lg:text-sm xl:px-7 xl:mx-2")}>Отбори</Link>
      </div>
    </div>
  )
}
