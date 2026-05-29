# 00 · Overview

> Redesign brief for the light-theme refresh of the Consumer Price Index
> (소비자 물가) anomaly-detection frontend. This document is the handoff
> spec; the implementing session has full access to the current codebase
> and is expected to sync any unspecified detail to the existing
> implementation.

---

## 1. Mission

Redesign the existing dark-mode frontend (commit `1935027`, 2026-05-21
baseline) into a light-theme Modern-SaaS look while preserving every
non-visual contract: HTML structure, routes, Zustand slices, API
mappings, and the `StreamChart` rev.6 behavioral contract.

The redesign covers visual surface only. No new features, no new state,
no new endpoints.

---

## 2. Locked Decisions

The following are decided and must be implemented exactly. Anything not
listed here is treated as `[OPEN]` — implementer's discretion, sync
with the existing codebase.

| Axis | Value |
|---|---|
| Theme | Light only (no dark, no toggle) |
| Aesthetic | Modern SaaS (Linear · Vercel · Stripe register) |
| Density | Relaxed (loosened from current cramped baseline) |
| Brand hue | **Teal** — primary `#0d9488`, hover `#0f766e`, active `#115e59` |
| Background tone | **Warm white** — canvas `#faf8f4` (stone-50 family) |
| Font (sans) | **Pretendard** with system fallbacks |
| Font (mono) | **JetBrains Mono** for numerics |
| Chart style | **Observable** — line + soft gradient area underneath |
| Chart grid | **Visible** (horizontal lines, subtle) |
| Event markers | **Visible** on main charts |
| Warmup band | **Visible** on `StreamChart` |
| Right analysis panel | **Visible** by default |
| Starting scope | 흐름 보기 tab (StreamChart main) is the reference; other tabs follow the same system |

---

## 3. Immutable Contracts (Do Not Touch)

The following are out of scope for this redesign — modifying them
breaks the spec.

### 3.1 HTML / behavior
- Component tree shape and JSX nesting (className edits OK)
- Route map: `/` (main, 3 tabs) and `/methodology`
- Zustand slice shapes and selectors
- API response shape and mapping logic
- Click/zoom/drag/keyboard handlers
- `data-testid` attributes used by tests

### 3.2 StreamChart rev.6 (from `docs/CLAUDE.md`)
- Zoom: no RAF throttle, `scaleExtent [1,30]`, immediate wheel response
- Y-axis: viewport-dynamic sync, unified min/max with 10% padding,
  minimum span 0.2
- Nodes: no X-spread, no `+N` cluster badges, z-order
  `reference → medium → high`
- Curve: `curveMonotoneX` only (no `step` / `linear` / `catmull-rom`)
- No area fill on `StreamChart` itself
  - Note: this contract applies to the main `StreamChart` line. The
    Observable-style gradient area decision in §2 applies only where
    not in conflict — see `05-main-views.md` for resolution.
- One path per segment, nulls filtered before render (line stays
  continuous)
- Warmup: vertical gray band (semantic preserved; color may change —
  see `02-chart-palette.md`)
- Pulse: CSS `@keyframes anomaly-pulse` only, never SVG `<animate>`

### 3.3 Libraries
- No new runtime dependencies (no `@radix-ui`, `framer-motion`,
  `popmotion`, `lucide-react`, `heroicons` as packages)
- Tailwind + hand-written CSS keyframes only
- Direct SVG paths for icons (no icon library install)
- d3 v7 stays (already in tree)

---

## 4. Source-of-Truth Hierarchy

When two sources disagree, resolve in this order:

1. **This brief** (`redesign_brief/*.md`) — authoritative for redesign
2. **Locked decisions** (§2 above) — override everything else
3. **`docs/CLAUDE.md` immutable contracts** — override visual specs
   when in conflict (the contract wins)
4. **Existing codebase** — for anything `[OPEN]` here, mirror what
   the code already does

---

## 5. Labeling Convention

Every section uses one of two tags:

- **`[LOCKED]`** — Confirmed by the user this session. Implement
  exactly as stated. Do not vary.
- **`[OPEN]`** — Not decided. Two valid responses:
  1. Pick a value consistent with the existing codebase, or
  2. Pick a value consistent with the locked decisions in §2,
     biased toward the simpler option.

  Either is acceptable. Do not block on `[OPEN]` items; do not
  surface them as questions unless they cascade into a structural
  decision.

A consolidated index of all `[OPEN]` items lives in
`10-ambiguities.md`.

---

## 6. File Index

| File | Scope | Status |
|---|---|---|
| `00-overview.md` | This file: mission, locks, principles | LOCKED |
| `01-design-tokens.md` | Color · type · spacing · radius · shadow · motion · z-index | Mostly LOCKED |
| `02-chart-palette.md` | All chart color tokens, d3 default removal | Mostly LOCKED |
| `03-layout.md` | AppShell · Banner · Header · FilterBar · FreshnessChip | LOCKED visuals, OPEN copy details |
| `04-panel.md` | Right analysis panel + 8 inline charts | LOCKED |
| `05-main-views.md` | StreamChart · ScatterChart · RawPricesChart · Minimap | LOCKED |
| `06-methodology.md` | Methodology page 6 sections + PipelineFlowDiagram | LOCKED |
| `07-overlays.md` | HelpModal · OnboardingGuide · HelpFloatingButton · Toast · ErrorBoundary | LOCKED |
| `08-states.md` | Loading · Empty · Error · Disabled standards | LOCKED patterns, OPEN copy |
| `09-motion.md` | Hover · focus · transition · pulse · drag · scrollbar | LOCKED |
| `10-ambiguities.md` | Aggregated index of every `[OPEN]` item | Reference only |

---

## 7. Recommended Implementation Order

Each step verifies cleanly before moving on. Skipping ahead causes
cross-component churn.

```
Step 1 — Foundation
  ├─ 01 design tokens (declare new vars; do not wire yet)
  └─ 02 chart palette (update colorUtils.ts)

Step 2 — Theme swap
  ├─ Replace dark backgrounds globally with warm-white tokens
  ├─ Update text color scale (slate → warm near-black)
  └─ Verify no contrast regressions

Step 3 — Component refresh (top-down)
  ├─ 03 layout (Header → Banner → FilterBar → FreshnessChip)
  ├─ 04 panel (container → header → sections → inline charts)
  ├─ 05 main views (StreamChart contract preserved)
  ├─ 06 methodology
  └─ 07 overlays

Step 4 — Standards
  ├─ 08 states (introduce shared EmptyState if approved; otherwise
  │   apply pattern inline)
  └─ 09 motion (hover/focus/transition tokens)

Step 5 — Verification
  ├─ npx tsc --noEmit
  ├─ npx vitest run
  └─ Manual walk: 4 tabs + methodology, every state
```

---

## 8. Korean UI Strings

The product is Korean-language. All UI copy in this brief is preserved
verbatim in Korean (e.g., `이달의 이상`, `흐름 보기`, `고신뢰`). Do not
translate when writing the code. The English in this document is for
the implementer — not for the UI.

---

## 9. What This Brief Does Not Contain

To set expectations: the brief is design-only. It does **not** spec:

- TypeScript types or interface shapes
- Test cases
- API contracts or data fetching
- Zustand slice definitions
- Build config beyond font loading

Anything implementation-level beyond visual + interaction surface is
`[OPEN]` and stays with the codebase.
