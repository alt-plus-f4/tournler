import { Input } from "@/components/ui/input"

export function Search() {
  return (
    <div>
      <Input
        type="search"
        aria-label="Search"
        placeholder="Search…"
        className="md:w-[100px] lg:w-[300px]"
      />
    </div>
  )
}
