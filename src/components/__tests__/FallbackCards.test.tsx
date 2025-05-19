import { render } from "@testing-library/react"
import { FallbackCards } from "../FallbackCards"

describe("FallbackCards", () => {
  it("renders the correct number of skeleton cards", () => {
    const { container } = render(<FallbackCards />)

    // Check if 4 cards are rendered
    const cards = container.querySelectorAll(".w-full.transition.hover\\:-translate-y-1.hover\\:shadow-lg")
    expect(cards.length).toBe(4)

    // Check if each card has a skeleton
    const skeletons = container.querySelectorAll(".w-full.h-full")
    expect(skeletons.length).toBeGreaterThanOrEqual(4)
  })
})
