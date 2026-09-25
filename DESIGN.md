---
name: Tournler
description: Hosted CS2 tournaments, from bracket to server to final score.
colors:
  stage-black: "#000000"
  canvas: "#09090b"
  panel: "#171717"
  panel-raised: "#262626"
  hairline: "#27272a"
  ink: "#fafafa"
  ink-soft: "#d4d4d4"
  ink-muted: "#a1a1aa"
  label-grey: "#a3a3a3"
  on-air-red: "#ef4444"
  ready-green: "#22c55e"
  hold-amber: "#facc15"
  danger-deep: "#7f1d1d"
typography:
  display:
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: "0.025em"
  headline:
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.1em"
  numeric:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4
    fontFeature: "\"tnum\""
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  gutter: "16px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "#18181b"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  button-outline:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  button-ghost-hover:
    backgroundColor: "{colors.hairline}"
    textColor: "{colors.ink}"
  button-destructive:
    backgroundColor: "{colors.danger-deep}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  input-default:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    height: "40px"
  card-default:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
  panel-console:
    backgroundColor: "{colors.stage-black}"
    textColor: "{colors.ink}"
    typography: "{typography.numeric}"
    rounded: "{rounded.md}"
    padding: "12px"
  badge-default:
    backgroundColor: "{colors.ink}"
    textColor: "#18181b"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  section-label:
    textColor: "{colors.label-grey}"
    typography: "{typography.label}"
  status-live:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
  admin-chip:
    backgroundColor: "{colors.on-air-red}"
    textColor: "#ffffff"
    rounded: "12px"
    padding: "4px 8px"
---

# Design System: Tournler

## Overview

**Creative North Star: "The Broadcast Booth"**

Tournler looks like the control room behind an esports broadcast. The stage is black, the chrome recedes, and whatever is on air takes over the screen. Team names are set heavy and uppercase like overlay graphics, scores and timers run in monospaced numerals, and a pulsing red dot means one thing: this is live, right now. The rest of the interface is equipment for the operator (organizers, admins and players checking in), and it stays out of the way until something needs attention.

The product is dark-only. `.dark` is forced on `<body>` and there is no theme switch. Depth comes from light, not lift. A faint 42px grid texture covers the whole canvas, and a soft white spotlight (500px radial glow) follows the pointer. The navbar is dotted glass: a 4px halftone dot screen over a saturated blur. Nearly everything is monochrome. Color is a signal and never decoration.

Density is moderate to high on operate surfaces (match page, admin) and looser on public surfaces (home, lists). Components are meant to feel like hard-edged hardware: switches and readouts on a control desk, not soft consumer cards.

The Booth has two rooms. **On air** covers public and match surfaces (home, tournaments, brackets, match pages): broadcast energy, heavy names, the live signal front and center. **The control room** is `/admin` and the operator panels inside match pages. Keep them dense, monochrome and keyboard-first: tables over cards, labels over decoration, no hover lifts, and signal color only for state.

**Key Characteristics:**
- Black stage, white ink, neutral-grey support. No hue unless it carries meaning.
- Red means on-air or danger, green means ready or your turn, amber means on hold. Nothing else is colored.
- Heavy uppercase for team names and headers; tracked-out small caps for section labels.
- Monospaced, tabular numerals for every score, timer, stat and console line.
- Flat at rest. Light and glow are the only depth cues, reserved for the pointer spotlight and the live or active element.

## Colors

A monochrome broadcast palette (black stage, zinc-cool neutrals, white ink) with three signal lights and nothing else.

### Primary
- **Broadcast Ink** (`ink`): the primary "color" is white. Primary buttons, headings, team names, active scores, and the winning side of a result all use it. In this system white carries the emphasis.

### Neutral
- **Stage Black** (`stage-black`): the match page stage, console panels (RCON history, command input), and image scrims (`from-black` gradients under banners).
- **Canvas** (`canvas`): the app background token (`--background`), plus cards, popovers and inputs. It reads as black with a faint cool cast.
- **Panel** (`panel`) and **Panel Raised** (`panel-raised`): the tonal layer steps for grouped content, skeletons and banner placeholders. Stack them for depth instead of shadows.
- **Hairline** (`hairline`): every border, divider, input stroke and ghost-hover fill (`--border`, `--input`, `--accent`, `--muted`).
- **Soft Ink** (`ink-soft`): secondary data such as stat values and supporting copy on black.
- **Muted Ink** (`ink-muted`): `--muted-foreground`, used for meta text (dates, locations, prize pool).
- **Label Grey** (`label-grey`, neutral-400): section labels and table headers only. It's the quietest text in the system, and it sits at the contrast floor (about 7.9:1 on black). Nothing that carries information goes dimmer than this or Muted Ink. neutral-500/600 are reserved for decorative, `aria-hidden` marks.

### Signal (the only chromatic colors)
- **On-Air Red** (`on-air-red`): LIVE indicators (pulsing 8px dot), the admin entry chip, and error text. Tinted panels at 10% fill with a 20% border (`bg-red-500/10 border-red-500/20`) mark error and danger zones.
- **Ready Green** (`ready-green`, with a lighter `#4ade80` for text on black): "Server ready, join now", "On the clock", and "Picking" in veto and draft. It always comes with a pulse dot.
- **Hold Amber** (`hold-amber`): PAUSED status (a solid dot that doesn't pulse) and the paused scoreboard border.
- **Danger Deep** (`danger-deep`): the fill for destructive buttons (`--destructive`).

### Third-party marks (not system colors)
FACEIT orange (`#FF5500`) and FACEIT's level bands appear only inside `LevelBadge`. Discord blurple (`#5865F2`) and Steam navy (`#171a21`, with `#66c0f4`) appear only on their own sign-in buttons and footer icons. Never reuse them as Tournler accents.

### Tokens in code
The signal colors are Tailwind tokens backed by CSS variables in `globals.css`: `signal-live` (On-Air Red), `signal-ready` (Ready Green fills), `signal-ready-text` (Ready Green text on black), and `signal-hold` (Hold Amber). Use `bg-signal-live`, `text-signal-ready-text`, and so on. Never use raw `red-*`, `green-*` or `yellow-*` utilities for state.

### Named Rules
**The On-Air Rule.** Color is a signal, never decoration. Red means live or danger, green means ready or your turn, amber means paused. If an element isn't reporting state, it's monochrome.

**The Hub Accent exception.** The CS2 and LoL hubs (Tournaments/Matches/Teams) each carry one deliberate, very faint hue — warm yellow `#fde68a` for CS2, blue `#93c5fd` for LoL (`GAME_ACCENT` in `src/lib/games`) — as a soft fixed radial wash on the page itself (`HubPageGlow`), not on the nav: the CS2/LoL nav entries, the hub subnav bar, and every label/icon/border stay plain white/monochrome. It never reports state and never appears outside the three hub pages: profile, home, news, forum and every signal color stay exactly as the On-Air Rule says.

**Game marks are real icons, everywhere.** `GameGlyph`/`GameTag` (`src/components/games/GameMark.tsx`) draw each game's own icon (`GAME_ICON_SRC` in `src/lib/games`: the CS2 soldier icon, Ahri for LoL — both in `/public`) rather than a hand-drawn Tournler mark, wherever a game is labeled — nav, profile, teams, tournament and match lists, onboarding. They're white-on-transparent and fixed-color (they don't tint via `currentColor` the way an SVG glyph would), so a "selected" or "active" state for a game control must read from its border/background/text, never by inverting the icon onto a light fill — it would just disappear.

**The Pulse Means Now Rule.** A pulsing dot is only allowed when the game server has actually reported that state (live, ready, on the clock). Never pulse something decorative, scheduled or finished.

## Typography

**Body and Display Font:** Roboto (with system-ui, sans-serif fallback), loaded through `next/font/google` at 400/500/700/900.
**Numeric Font:** the platform monospace stack (`font-mono`), used for scores, stats, timers, K/D, and console output.

**Character:** one plain grotesque pushed to both extremes: black-weight uppercase for broadcast headers, regular weight for everything the operator reads. The monospace numerals give the "readout" feel.

### Hierarchy
- **Display** (900, 2.25rem, uppercase, slight tracking): page titles and team names on the scoreboard and veto.
- **Headline** (700, 1.5rem): section and card titles such as tournament names and profile headers.
- **Title** (600, 1.125rem): card titles in lists (featured tournament cards, `line-clamp-1`).
- **Body** (400, 0.875rem, 1.5): the default working size. `text-sm` is the most used size in the codebase, with `text-xs` close behind.
- **Label** (700, 0.75rem, 0.1em tracking, uppercase, Label Grey): section headers like "ADMIN CONTROLS", "MAP VETO · BEST OF 3" and "CAPTAIN DRAFT", and table column heads.
- **Numeric** (mono, tabular): every number that changes during a match.

### Named Rules
**The Readout Rule.** Any number that can change while someone is watching (score, round, timer, K/D, pool count) is set in monospace with tabular figures so it never jitters.

**The Label Voice Rule.** Section labels are always tiny, bold, uppercase and widely tracked in Label Grey. They name the panel; they never compete with its content.

Roboto is loaded at 400, 500, 700 and 900 (`src/app/layout.tsx`). There is no 600 face, so `font-semibold` resolves to 700; prefer `font-medium` or `font-bold` explicitly.

## Layout

- **Container:** `max-w-[1400px]` centered with a 16px side gutter (`px-4`). The match page uses `max-w-7xl`.
- **Home:** a two-column grid, content plus a fixed 340px sidebar at `lg`, with `gap-8` and 32px padding. It collapses to a single column below `lg`.
- **Featured grid:** 1 → 2 (`md`) → 3 (`xl`) columns with `gap-5`, or a horizontal snap carousel (280–320px cards) when the admin picks the carousel layout.
- **Navbar:** sticky, 56px desktop and 64px mobile, split into a three-column grid (25% / 50% / 25%): logo, centered primary nav, then account and notifications. Below `md` the center nav becomes a burger menu.
- **Rhythm:** a 4px base step. The common steps are 8px (inline gaps), 16px (component padding and gutters), 24px (card padding, section gaps) and 32px (page padding, column gaps).
- **Breakpoints:** Tailwind defaults (`sm` 640, `md` 768, `lg` 1024, `xl` 1280).

## Elevation & Depth

The system is flat. Surfaces are separated by tonal steps (Stage Black → Canvas → Panel → Panel Raised) and 1px Hairline borders. There are no shadows at rest. The one depth cue is **light**: the pointer spotlight on the canvas, the halftone glass on the navbar, and a glow or brightness lift on the live or focused element.

### Shadow Vocabulary
- **Card hairline** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`): the shadcn `shadow-sm` baked into Card. It's effectively invisible on black and is kept only for parity with the primitive.
- **Hover lift** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1)`, plus `scale(1.02)` to `scale(1.05)`): featured and upcoming tournament cards. This is the incumbent exception to the flat rule. Prefer a brightness or border-light response for new work.

### Named Rules
**The Spotlight Rule.** Depth is light, not lift. Surfaces stay flat. What's live, focused or hovered brightens or glows. Nothing floats.

## Shapes

The form language is meant to be hard-edged hardware. Today it uses the shadcn default of gently rounded corners (`--radius` 8px, so cards are 8px and buttons and inputs 6px) alongside a lot of full-round pills and dots (status dots, badges, avatars). Borders are always 1px Hairline. Banner imagery is cropped with `object-cover` and faded into black with a bottom scrim.

**The Tight Corner Rule.** New chrome uses the small end of the scale (4–6px). Full rounding is reserved for things that are circles by nature: status dots, avatars and count badges. Don't add new pill-shaped containers.

## Components

### Buttons
Control-desk switches: compact, one clear state change on hover.
- **Shape:** gently squared (6px), 40px tall (36px `sm`, 44px `lg`, 40×40 `icon`).
- **Primary:** Broadcast Ink fill with near-black text, 14px medium, hovering to 90% opacity.
- **Outline:** a Canvas fill with a Hairline stroke that fills with Hairline on hover.
- **Ghost:** transparent until hover, then fills with Hairline. The main nav links are ghost buttons with vertical hairline dividers over the halftone glass.
- **Destructive:** a Danger Deep fill.
- **Focus:** a 2px `--ring` (light zinc) ring with a 2px offset.
- **Loading:** a spinner replaces nothing; it prepends a 16px `Loader2` and disables the button.

### Chips and Badges
- **Badge:** a pill with 12px semibold text, filled with ink by default plus secondary, destructive and outline variants.
- **Admin chip:** On-Air Red fill, white uppercase label and a wrench icon, 12px radius. It's the only persistently red element in the chrome.

### Cards / Containers
- **Corner Style:** 8px.
- **Background:** Canvas, or Panel for grouped admin and match sections.
- **Shadow Strategy:** flat (see Elevation & Depth).
- **Border:** 1px Hairline.
- **Internal Padding:** 24px (`p-6`) by default, 16px for compact match-page panels.

### Inputs / Fields
- **Style:** Canvas fill, Hairline stroke, 6px radius, 40px tall, 14px text, Muted Ink placeholder.
- **Focus:** a 2px light ring with offset, no glow.
- **Console variant:** a Stage Black fill with monospace text, used for the RCON command input.
- **Disabled:** 50% opacity with a not-allowed cursor.

### Navigation
The sticky halftone-glass bar keeps the logo left, four ghost links centered (Information, Tournaments, Matches, Teams) and account, notifications and the admin chip right. On mobile the links collapse into a burger menu and the logo shrinks to 80px wide.

### Status Readout (signature)
This is the heart of the broadcast language. It's a 14px bold inline row: an 8px dot, a state word and a mono timer.
- **LIVE:** a pulsing On-Air Red dot · `LIVE · 12:34`.
- **Ready:** a pulsing Ready Green dot · `Server ready — join now · starts in 3:12`.
- **Paused:** a solid Hold Amber dot with amber text · `PAUSED · 18:02`.
- **Scheduled / Finished:** an hourglass icon in Soft or Muted Ink, with no dot.

### Section Label (signature)
Tiny, bold, uppercase, widely tracked Label Grey text that heads every operate panel ("ADMIN CONTROLS", "MAP VETO · BEST OF 3", "MAPS"). It sometimes starts with a 14px icon.

### Console Panel (signature)
A Stage Black box with a Hairline border, 6px radius and 12px padding, holding monospace 12px lines in a scrolling 224px log for the RCON history. It shows that the server really is on the other end.

### Scoreboard and Veto Headers
Team names in Display (900, uppercase, truncated), scores in mono, with the winning side in Broadcast Ink bold and the losing side in Muted Ink. Map tiles use banner art under a black-to-transparent scrim.

## Do's and Don'ts

### Do:
- **Do** keep every surface monochrome (Stage Black, Canvas, Panel, Hairline, Ink) and use color only to report state (the On-Air Rule).
- **Do** set scores, timers, stats and console output in monospace with tabular numerals (the Readout Rule).
- **Do** head operate panels with a Section Label (12px, 700, uppercase, 0.1em tracking, Label Grey (neutral-400)).
- **Do** convey depth with tonal steps and hairline borders, and put emphasis on the live or active element with light or brightness (the Spotlight Rule).
- **Do** use the Status Readout pattern (dot, state word, mono timer) for any server-reported state.
- **Do** use the shared `ui/` primitives (Button, Card, Input, Badge) and the semantic tokens (`bg-background`, `border-border`, `text-muted-foreground`) rather than raw `neutral-*` or `gray-*` utilities.

### Don't:
- **Don't** introduce decorative hues, gradients or brand-color accents. FACEIT, Discord and Steam colors stay inside their own marks.
- **Don't** pulse anything the game server hasn't reported as live, ready or your turn (the Pulse Means Now Rule).
- **Don't** add drop shadows or floating cards for hierarchy. Keep the hover lift on legacy tournament cards and don't spread it.
- **Don't** add new pill-shaped containers or large radii. Hardware corners are tight (the Tight Corner Rule).
- **Don't** mix grey families (`gray-*`, `slate-*`, `zinc-*`, `neutral-*`) for the same role. Pick the token.
- **Don't** hotlink or imitate FACEIT's icon assets; the level badge is Tournler's own crest in FACEIT's band colors.
