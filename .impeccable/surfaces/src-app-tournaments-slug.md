---
version: 1
slug: 'src-app-tournaments-slug'
primary_target: 'src/app/tournaments/[slug]'
related_targets: []
---

# Tournament detail page (`src/app/tournaments/[slug]`)

Mode: Operate. Visitor: a spectator checking status/bracket and a captain deciding whether to
register a team, weighted equally. Task: understand the event and its current state at a glance,
register or manage a team, then drill into bracket/matches/participants/prizes/stats. Must stay
untouched: all data, permission gating (registration eligibility, canManageTournaments), the
registration control tree (JoinLeaveButton / RegistrationGate / WrongGameNotice / sign-in and
create-team prompts), StartTournamentButton, ShareButton, the countdown Timer, the state logic in
getRegistration, ISR/dynamic behavior, and all six panels' existing data/content (Overview,
Participants, Prizes, Matches, Bracket, Stats).

## Direction contract

THESIS: The tournament's vitals live in a pinned show-info rail; everything else is a scene the
operator switches, never a tab scrolled past. Refuses the category default this page ships today:
a banner hero card sitting above a horizontal tab bar, where the always-relevant facts (status,
registration, countdown) scroll away the moment you read anything else.

OWN-WORLD: Exactly the existing Broadcast Booth system, no new tokens. Stage Black / Canvas /
Panel / Hairline surfaces, On-Air Red / Ready Green / Hold Amber signal dots via the Status Readout
pattern, Label Grey Section Labels, Display-900-uppercase tournament name, monospace tabular
numerals for the countdown and team counts. New composition only: a persistent left rail (banner
crop, name, organizer, Status Readout, countdown, registration control) beside a scene-switcher
styled as console scene-select buttons (bordered rectangles, one active state, not underlined tab
triggers) sitting above the active panel.

STORY: A visitor looks left and immediately knows what this event is, whether it is live, starting
soon, paused, or finished, and whether they can register right now. They pick a scene on the right
(Bracket/Standings, Matches, Participants, Prizes, Stats) to dig deeper without ever losing that
context, because the rail never scrolls away.

FIRST VIEWPORT: Desktop ≥1024px: two columns. Left rail, fixed ~320px, sticky under the navbar,
top to bottom: banner crop with scrim + back link + share + game tag overlay, tournament name
(Display), organizer line, Status Readout (reusing existing `getRegistration` states), the
registration control block exactly as built today (JoinLeaveButton / RegistrationGate /
WrongGameNotice / sign-in / create-team prompts), StartTournamentButton when eligible, countdown
Timer. Right column: a scene-switcher row of 5–6 console-style buttons (Overview, Bracket/
Standings, Matches, Participants, Prizes, Stats) directly above the active scene's panel, reusing
the existing Overview/Participants/Prizes/Matches/Bracket/PlayerStats components' content and data
contracts. Below 1024px: the rail collapses to a horizontal show-info band above a sticky
scene-switcher strip, panel content stacked below; the register/join control stays visible without
scrolling past the fold. Signature interaction: switching scenes never triggers a route
navigation-style reflow — the rail's height and position are stable across every scene, only the
right panel changes, still reflected in `?tab=` for deep links.

FORM: Broadcast Package Split — my top-ranked (1 of 7) structural candidate for this surface, dealt
as the lead card ("THE ROLL"), locked by the user with no steer. Seed key 5794db9a (surface scope,
operate mode).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the
verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Build path

Code-led: no image generation tool available this session (no comp round). Ambition carried in the
FIRST VIEWPORT block and the stable-rail signature interaction above; the finish reviewer audits
those in behavior.
