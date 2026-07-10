# Design System

## Design Intent

DISHA should present as an operator tool, not a marketing site. The interface should feel precise, security-aware, and information-dense without looking noisy.

## Color System

Use a restrained operational palette:

- `--bg-0`: `#0b1020`
- `--bg-1`: `#11182b`
- `--bg-2`: `#182238`
- `--surface`: `#1f2b45`
- `--surface-strong`: `#273654`
- `--text-strong`: `#f4f7fb`
- `--text`: `#d6ddea`
- `--text-muted`: `#8da0bd`
- `--border`: `#30415f`
- `--accent`: `#29c6a6`
- `--accent-strong`: `#1ea88c`
- `--warning`: `#f4b942`
- `--danger`: `#ef6a6a`
- `--info`: `#56a6ff`

Guidance:

- reserve accent color for primary actions and active states
- use danger only for destructive actions and security alerts
- keep backgrounds layered, not flat

## Typography

- Primary UI font: `IBM Plex Sans`, `Manrope`, or `Sora`
- Mono font: `IBM Plex Mono` or `JetBrains Mono`
- Heading style: compact, medium-to-semibold, low tracking
- Body style: 14px to 16px equivalent with high contrast

## Spacing System

Use a 4px base scale:

- `4`
- `8`
- `12`
- `16`
- `24`
- `32`
- `48`

Rules:

- controls use `8` or `12` internal padding
- panel gaps default to `16`
- page section spacing defaults to `24` or `32`

## Layout Rules

- Prefer app-shell layouts with stable side navigation and top utility bars.
- Keep the primary work surface visible above the fold.
- Avoid oversized hero sections or marketing cards.
- Use full-width bands or split panes for operational views.
- Keep cards shallow with `6px` to `8px` radius.

## Component Structure

- Buttons: icon-first for tools, text labels for explicit actions
- Inputs: high-contrast borders, visible error/help states
- Tables and logs: fixed row rhythm, monospace where precision matters
- Panels: title, metadata, actions, content; no nested decorative cards
- Alerts: semantic color plus concise action-oriented copy

## Dashboard Layout

Recommended dashboard composition:

- left navigation for module selection
- top bar for session, environment, and auth state
- main center pane for chat, file, or investigation work
- right context pane for audit trail, metadata, or AI reasoning summaries

## Responsiveness

- Collapse right context pane below `1024px`
- Convert left navigation to drawer below `768px`
- Preserve primary action visibility on all breakpoints
- Do not scale typography with viewport width

## Accessibility Rules

- maintain AA contrast minimums
- keyboard reachable navigation and dialogs
- visible focus states
- status changes announced for long-running operations

## Design Debt To Address

- unify legacy frontend surfaces under one design language
- replace inconsistent typography and color usage across demos
- document shared tokens in the active web app once the UI surface expands beyond API routes
