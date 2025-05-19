import { render, screen } from "@testing-library/react"
import { UpcomingTournament } from "../UpcomingTournament"

const mockProps = {
  id: 1,
  name: "Test Tournament",
  bannerUrl: "/test-banner.jpg",
  startDate: "2023-12-31T12:00:00Z",
  prizePool: 10000,
  teams: [
    { id: 1, name: "Team 1" },
    { id: 2, name: "Team 2" },
  ],
  location: "Test Location",
  teamCapacity: 8,
}

describe("UpcomingTournament", () => {
  it("renders tournament information correctly", () => {
    render(<UpcomingTournament {...mockProps} />)

    // Check if tournament name is rendered
    expect(screen.getByText("Test Tournament")).toBeInTheDocument()

    // Check if location is rendered
    expect(screen.getByText("Test Location")).toBeInTheDocument()

    // Check if prize pool is rendered (formatted)
    expect(screen.getByText("$10,000")).toBeInTheDocument()

    // Check if teams count is rendered
    expect(screen.getByText("2/8")).toBeInTheDocument()
  })

  it("links to the correct tournament page", () => {
    render(<UpcomingTournament {...mockProps} />)

    // Check if the link points to the correct tournament
    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "/tournaments/1")
  })

  it("applies different styling when isHomePage is true", () => {
    const { rerender } = render(<UpcomingTournament {...mockProps} />)

    // Check default styling
    let container = screen.getByRole("link")
    expect(container).not.toHaveClass("w-full h-[200px]")

    // Rerender with isHomePage=true
    rerender(<UpcomingTournament {...mockProps} isHomePage={true} />)

    // Check homepage styling
    container = screen.getByRole("link")
    expect(container).toHaveClass("w-full h-[200px]")
  })
})
