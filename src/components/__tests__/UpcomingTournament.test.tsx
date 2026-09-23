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
    expect(container).toHaveClass("min-h-[156px]")
    expect(container).not.toHaveClass("min-h-[200px]")

    // Rerender with isHomePage=true
    rerender(<UpcomingTournament {...mockProps} isHomePage={true} />)

    // Check homepage styling
    container = screen.getByRole("link")
    expect(container).toHaveClass("min-h-[200px]")
  })

  it("labels an upcoming tournament whose start has passed as start pending", () => {
    render(<UpcomingTournament {...mockProps} status="UPCOMING" />)
    expect(screen.getByText("Start pending")).toBeInTheDocument()
    expect(screen.getByText("Set for Dec 31, 2023")).toBeInTheDocument()
  })

  it("shows the start date for a future tournament", () => {
    render(<UpcomingTournament {...mockProps} startDate="2999-06-01T12:00:00Z" status="UPCOMING" />)
    expect(screen.getByText("Jun 1, 2999")).toBeInTheDocument()
    expect(screen.getByText("Starts")).toBeInTheDocument()
  })

  it("says in progress for an ongoing tournament", () => {
    render(<UpcomingTournament {...mockProps} status="ONGOING" />)
    expect(screen.getByText("In progress")).toBeInTheDocument()
    expect(screen.queryByText("Start pending")).not.toBeInTheDocument()
  })
})
