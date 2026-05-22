# 10 · Ambiguities Index

> Consolidated list of every `[OPEN]` item across the brief. None
> blocks implementation — the spec says: pick the value consistent
> with the existing codebase, or with the locked decisions in
> `00-overview.md §2`, whichever is simpler.
>
> This file is reference only. Do not block on resolving items
> here. The user explicitly said: "다른 세션은 구현 내용을 전부
> 파악하고 있는 상태라, 모호하게 넘겨도 다 구현된 코드에 싱크 맞춰서
> 작업할거야" — sync with the codebase and move forward.

---

## Foundation (file 01–02)

### A1. Token definition file location
- **Source**: `01-design-tokens.md §1`
- **Options**:
  - (a) Extend `src/utils/colorUtils.ts`
  - (b) New `src/utils/theme.ts`
  - (c) Tailwind `theme.extend` in `tailwind.config.ts`
  - (d) CSS custom properties on `:root` in `src/index.css`
- **Recommendation**: (c) + (d) hybrid. Tailwind for utility classes,
  CSS variables for runtime/D3-accessible values.

### A2. Font loading method
- **Source**: `01-design-tokens.md §8`
- **Options**:
  - (a) CDN `<link>` in `index.html`
  - (b) `@import` in `src/index.css`
  - (c) npm self-host (`pretendard` + `@fontsource/jetbrains-mono`)
- **Recommendation**: match whatever existing pattern the project
  uses. If none, (a) is fastest.

### A3. Dark → Light migration strategy
- **Source**: `01-design-tokens.md §17`
- **Options**:
  - (a) Grep-replace dark utility classes with new ones
  - (b) Tailwind theme remap (override `slate` palette)
  - (c) Hybrid: remap existing, new tokens for net-new components
- **End state**: zero `bg-slate-9xx` / `text-slate-1xx` / hardcoded
  dark hex anywhere.

### A4. SEGMENT_COLORS.C / .D real colors
- **Source**: `02-chart-palette.md §3`
- **Locked default**: C = `#7c3aed` (violet), D = `#db2777` (pink)
- **Fallback if PM rejects**: gray placeholders (`#94a3b8` /
  `#64748b`) — no other ripple effects.

---

## Layout (file 03)

### A5. Segment color dot next to each 구간 toggle
- **Source**: `03-layout.md §4.5`
- **Question**: redundant if the chart legend already maps
  segment → color
- **Recommendation**: skip the dot. Toggles stay text-only.

### A6. FreshnessChip stale-data branch
- **Source**: `03-layout.md §5.3`
- **Question**: introduce `data_up_to > 90 days` warning UI now
  or defer
- **Behavior if added**: amber dot (no pulse), amber text on date
  portion, tooltip explaining staleness
- **Current state**: no stale branch exists
- **Recommendation**: defer. Scope creep beyond visual refresh.

---

## Main Views (file 05) — no explicit `[OPEN]`

All decisions are locked. StreamChart contract resolves any
visual-vs-behavior conflict in favor of the contract.

---

## Methodology (file 06)

### A7. Print stylesheet for methodology page
- **Source**: `06-methodology.md §11.3`
- **Question**: add print-friendly CSS (strip chrome, single column,
  no shadows)
- **Recommendation**: defer. Out of immediate scope; natural future
  enhancement.

---

## Overlays (file 07)

### A8. Migrate RawPricesChart inline toast to `showToast` helper
- **Source**: `07-overlays.md §7`
- **Current state**: RawPricesChart has its own JSX toast for
  "layout auto-switch" notifications, separate from the global
  Toast system
- **Recommendation**: migrate during redesign if cheap; otherwise
  defer. Cosmetic consistency win, not functional.

### A9. Focus trap in modals
- **Source**: `07-overlays.md §8.2`
- **Question**: keep keyboard focus inside open modal (loop on
  Tab)
- **Current state**: no focus trap exists
- **Recommendation**: implement for `HelpModal` (it has multiple
  interactive items); skip for `OnboardingGuide` (linear flow).

---

## States (file 08)

### A10. Shared `StateView` component vs. inline JSX
- **Source**: `08-states.md §5`
- **Question**: whether to introduce `<StateView variant="..."
  size="..." />` as a reusable component, or keep inline JSX with
  shared CSS classes
- **Tradeoff**: component = ergonomics + one source of truth;
  inline = no abstraction tax, easier to customize per-site
- **Recommendation**: component if 3+ call sites would use it
  (likely yes — StreamChart / ScatterChart / RawPricesChart /
  Panel / Minimap all have empty + error states).

---

## Motion (file 09)

### A11. SVG chart-node keyboard accessibility
- **Source**: `09-motion.md §3.3`
- **Question**: wire D3-rendered anomaly nodes as keyboard-focusable
  (`tabindex` + `aria-label` + Enter/Space handler)
- **Recommendation**: defer unless accessibility audit demands it.
  Substantial cross-cutting work touching all chart types. Not in
  current visual-refresh scope.

### A12. Skip-to-content link
- **Source**: `09-motion.md §3.4`
- **Question**: add visually-hidden skip link as first child of
  `<body>`
- **Recommendation**: implement if cheap (~10 lines CSS + 1 line
  HTML). Standard accessibility pattern.

---

## Resolution Process

For each `[OPEN]` item:

1. Check if the existing codebase already implies a decision —
   adopt it.
2. If no precedent, check if `00-overview.md §2` (locked decisions)
   resolves it implicitly — adopt that.
3. If still unresolved, pick the option marked "Recommendation"
   above.
4. Document the choice in code comments where it lives, not in this
   brief. This brief is finalized after handoff.

Do not pause work for any `[OPEN]` item.

---

## Items Explicitly Out of Scope (will NOT resurface)

These were considered and intentionally rejected for the visual
redesign:

- Dark mode toggle (locked: light only)
- Light/dark theme variable system (locked: light only)
- New runtime dependencies (no `@radix-ui`, `framer-motion`,
  `lucide-react`, etc.)
- New routes or pages
- New API endpoints
- New Zustand slices or state machines
- New automated tests for new visual behavior (manual verification
  per `00-overview.md §7`)
- Renaming of existing components or files
- Refactoring of StreamChart rev.6 contract (immutable)

If the implementer encounters work in these categories during
redesign, it indicates scope creep — defer to a separate task.

---

## Counting Summary

| Category | Count |
|---|---|
| `[OPEN]` items total | 12 (A1–A12) |
| Foundation | 4 |
| Layout | 2 |
| Main Views | 0 |
| Methodology | 1 |
| Overlays | 2 |
| States | 1 |
| Motion | 2 |
| `[LOCKED]` items | majority of brief |

Locked-to-open ratio favors the implementer. The brief is
prescriptive on the visual surface and permissive on the
implementation glue.
