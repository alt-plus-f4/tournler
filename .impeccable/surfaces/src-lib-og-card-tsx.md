---
version: 1
slug: "src-lib-og-card-tsx"
primary_target: "src/lib/og/card.tsx"
related_targets: ["src/app/matches/[matchId]/opengraph-image.tsx","src/app/tournaments/[slug]/opengraph-image.tsx","src/app/teams/[slug]/opengraph-image.tsx","src/app/profile/[userId]/opengraph-image.tsx"]
---

Mode: **Persuade** (in the narrow sense that applies to a share card: it has one job, make a stranger on Discord/Twitter/Slack click through). Not interactive, not a page — a generated 1200×630 raster consumed by link-unfurl bots.

Audience/job: the clicker sees this before anything else Tournler-branded. It must read instantly at thumbnail size (a Discord embed shrinks it hard) and tell them exactly what they're about to open: which match/tournament/team/player, and — for matches — whether it's live right now.

Constraints: pure `next/og` (Satori) rendering — no arbitrary web fonts beyond embedded woff buffers, no blur/backdrop-filter/box-shadow blur, no photographic comps possible for a data-driven template. Real data only (server is source of truth for match state; FACEIT level is real-or-absent, never fabricated). No FACEIT asset hotlinking.

## Direction contract

THESIS: A share card is a freeze-frame of the broadcast, not a poster. It refuses the generic "logo + big title + gradient" template every SaaS OG image uses.

OWN-WORLD: Broadcast Booth, unchanged: stage black canvas, hairline rule, white ink, Roboto (400/700/900, self-hosted woff) for display/label text, Roboto Mono (400/700) for every score/count/stat. The state-owns-the-only-hue rule carries over as a top rule: on-air red for LIVE, hold amber for PAUSED, hairline grey for SCHEDULED/FINISHED. A tiny "TOURNLER" wordmark + logo mark sits fixed top-left on every card, unifying all four templates as one system.

STORY: In under a second at thumbnail size, the viewer reads: what kind of thing this is (match/tournament/team/player), its name(s), and its current state or headline stat.

FIRST VIEWPORT (= the whole card, there is no scroll):
- **Match:** top rule colored by state. Center row: Team A plate+name — big mono score (or "VS" + kickoff time if scheduled) — Team B plate+name, winner in ink/loser muted when FINISHED. Small label row above the score: tournament name · format/BO. State readout (dot + word, mono timer omitted — a static image can't tick) top-right under the brand row.
- **Tournament:** banner image full-bleed (object-cover) with bottom-to-black scrim when `bannerUrl` exists, else flat stage black. Tournament logo (if any) + Display-weight name lower-left over the scrim. Game tag chip, format label, and a status readout (registration open · N/cap teams, or in progress, or finished) stacked underneath.
- **Team:** team `background` art full-bleed with scrim when present, else flat black. Logo on its light sponsor plate (same treatment as everywhere else in the app) + Display name. Game tag chip, roster size, captain name.
- **Player (profile):** flat stage black (no banner concept for a person). Circular avatar left, Display-weight name, FACEIT LevelBadge (re-drawn as ring+numeral, same color bands, no hotlinked FACEIT asset) when linked, current CS2 team name+mini-logo when on one, else a plain "PLAYER" label.

FORM: four data-driven `opengraph-image.tsx` route files sharing one rendering kit (`src/lib/og/`) — not a concept-seed surface; a bounded, precisely-specified technical feature built directly inside the established world per new-work.md's narrow-request exception.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
