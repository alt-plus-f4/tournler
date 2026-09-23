---
version: 1
slug: "src-app-matches-matchid-page-tsx"
primary_target: "src/app/matches/[matchId]/page.tsx"
related_targets: []
---

# Match room (`/matches/[matchId]`)

Mode: **Operate**. Players and captains check state, run veto/draft, connect, and review results; staff operate the match live.

Audience/job: players need to know their next action from the first viewport (join, veto, connect, download demo). Admins need live control (pause/resume/force start) without leaving the room, and the full toolset (score override, end, restart, RCON, delete) one tab away.

Constraints: server is source of truth; no pulse unless the pipeline reported it; FACEIT resemblance is general (room layout + tabs), not a clone — no FACEIT assets or orange outside LevelBadge.

## Direction contract

THESIS: The match page is a match room, loosely FACEIT: one broadcast header (teams, score, state) sitting on a tab bar, and an Overview tab laid out roster | action column | roster. It refuses the incumbent stack of equal boxed panels scrolled top to bottom.

OWN-WORLD: Broadcast Booth, unchanged: stage black, hairline, white ink, mono readouts, tight 4–6px corners. State owns the only hue. LIVE: red top rule, pulsing red dot, full-colour map art. PAUSED: amber rule and solid dot. FINISHED is archival: map art in grayscale, a FINAL tag, winner in ink with a WIN tag, loser muted. No red or pulse.

STORY: Anyone understands the state in one glance and finds their next action in the center column. Staff steer the match from the header quick bar or the Admin tab.

FIRST VIEWPORT: full-width header band over the map art. Top row: breadcrumb and status readout left, admin quick bar right. Middle row: team A | display score | team B. Tab bar flush along the band's bottom edge. Below it, rosters flank the center action column.

FORM: FACEIT-style match room with tabs (user-specified, list position 1); seed key: user-specified (no roll).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
