# 02 · Chart Palette

> All chart colors live in `src/utils/colorUtils.ts`. This file
> documents the target values after redesign — replacing the current
> mix of d3 defaults, hardcoded hex, and ad-hoc Tailwind references.

---

## 1. Source-of-Truth Objects

Four exported palette objects, all from `colorUtils.ts`. Every chart
component imports from here. **No hex literal is allowed in chart
component files** (`StreamChart.tsx`, `ScatterChart.tsx`, etc.).

```ts
ANOMALY_COLORS          // 3 grades + bg/border variants
SEGMENT_COLORS_PRIMARY  // 5 segments (main commodity)
SEGMENT_COLORS_SECONDARY// 5 segments (comparison commodity)
RAW_PRICE_COLORS        // 5 price sources
PANEL_CHART_COLORS      // ~20 inline-chart specific
```

Plus new neutral palette for axes / grids / tooltips, shared across
all charts:

```ts
CHART_THEME             // axis, grid, tooltip, background tokens
```

---

## 2. `ANOMALY_COLORS` (3 grades)

**`[LOCKED]`** Light-theme calibrated.

| Grade | Color | Subtle bg | Border |
|---|---|---|---|
| `high` | `#dc2626` (red-600) | `#fef2f2` | `#fecaca` |
| `medium` | `#d97706` (amber-600) | `#fffbeb` | `#fde68a` |
| `reference` | `#0891b2` (cyan-600) | `#ecfeff` | `#a5f3fc` |

```ts
export const ANOMALY_COLORS = {
  high:      '#dc2626',
  medium:    '#d97706',
  reference: '#0891b2',
} as const;

export const ANOMALY_BG_COLORS = {
  high:      '#fef2f2',
  medium:    '#fffbeb',
  reference: '#ecfeff',
} as const;

export const ANOMALY_BORDER_COLORS = {
  high:      '#fecaca',
  medium:    '#fde68a',
  reference: '#a5f3fc',
} as const;
```

Why these:
- `high` red darkened from `#e24b4a` (original) to `#dc2626` for
  WCAG AA contrast on warm-white canvas
- `medium` amber `#d97706` (amber-600) replaces `#ef9f27` —
  better separation from `D'` segment orange
- `reference` **changed from lime `#c8d850` to cyan `#0891b2`**.
  Reasons:
  1. Lime fails contrast on warm-white (insufficient luminance gap)
  2. Lime clashes with `--success` (#16a34a)
  3. Cyan distinguishes cleanly from amber (medium) and red (high)
  4. Improves accessibility for deuteranopia/protanopia (no
     red-green pair)

Visual rule: `reference` markers on charts use outline-only fill
(transparent center) so they distinguish from `medium` even at
small node sizes. Filled = high/medium, ring = reference.

---

## 3. `SEGMENT_COLORS_PRIMARY` (5 segments)

**`[LOCKED]`** Five distinct hues, all WCAG-safe on warm-white.

| Segment | Color | Tailwind reference |
|---|---|---|
| `A` (국제→수입) | `#0d9488` (teal-600) | brand-aligned |
| `B` (수입→PPI) | `#059669` (emerald-600) | |
| `C` (도매→소매) | `#7c3aed` (violet-600) | |
| `D` (PPI→CPI) | `#db2777` (pink-600) | |
| `D_prime` (PPI→소매) | `#ea580c` (orange-600) | |

```ts
export const SEGMENT_COLORS_PRIMARY = {
  A:       '#0d9488',
  B:       '#059669',
  C:       '#7c3aed',
  D:       '#db2777',
  D_prime: '#ea580c',
} as const;
```

Note on `C` and `D`: the original spec marks these as "PM 미정"
placeholders (slate-400 / slate-500 grays). They now have real hues
above. **`[OPEN]`** if PM rejects, fall back to neutral grays
(`#94a3b8` / `#64748b`) — but no functional change to the rest of
the palette.

Segment `A` aligns with brand teal so the main-commodity main line
visually anchors the chart. Other segments diverge in hue.

---

## 4. `SEGMENT_COLORS_SECONDARY` (5 segments)

**`[LOCKED]`** Same hues as PRIMARY, reduced saturation/opacity, so
"segment A is always teal" cognitive anchor is preserved regardless
of which commodity is comparison.

Two valid implementations — pick one:

(a) Pre-computed darker hex:
```ts
export const SEGMENT_COLORS_SECONDARY = {
  A:       '#5eead4',  // teal-300
  B:       '#6ee7b7',  // emerald-300
  C:       '#c4b5fd',  // violet-300
  D:       '#f9a8d4',  // pink-300
  D_prime: '#fdba74',  // orange-300
} as const;
```

(b) Runtime opacity on PRIMARY:
```ts
// In chart component
.attr('stroke', SEGMENT_COLORS_PRIMARY[seg])
.attr('stroke-opacity', isSecondary ? 0.45 : 1)
.attr('stroke-dasharray', isSecondary ? '4,3' : 'none')
```

Combine (a) hue + (b) dashed pattern for maximum distinction.
Secondary lines are always dashed; primary lines always solid.

---

## 5. `RAW_PRICE_COLORS` (5 sources)

**`[LOCKED]`** Hues fully separated from `SEGMENT_COLORS_*` to
prevent cross-tab color confusion. The current implementation has
4 collisions (cpi=high, import=A, ppi=B, wholesale=D'). All
resolved below.

| Source | Color | Previous (collided with) |
|---|---|---|
| `intl_price_krw` (국제가) | `#7c3aed` (violet) | `#a855f7` (purple) |
| `import_price_usd` (수입단가) | `#0891b2` (cyan) | `#3b82f6` (was segment A) |
| `ppi` (생산자물가) | `#059669` (emerald) | `#22c55e` (was segment B) |
| `wholesale_price` (도매가) | `#ea580c` (orange) | `#f97316` (was segment D') |
| `cpi` (소비자물가) | `#be123c` (rose-700) | `#e24b4a` (was anomaly.high) |

```ts
export const RAW_PRICE_COLORS = {
  intl_price_krw:   '#7c3aed',
  import_price_usd: '#0891b2',
  ppi:              '#059669',
  wholesale_price:  '#ea580c',
  cpi:              '#be123c',
} as const;
```

Critical: `cpi` is now `#be123c` (rose-700), distinguished from
`ANOMALY_COLORS.high` (`#dc2626`, red-600). On the RawPricesChart,
the CPI line and anomaly nodes can now both be drawn without
visual collision.

---

## 6. `PANEL_CHART_COLORS` (20+ tokens, all d3 defaults removed)

**`[LOCKED]`** Replaces every d3 default (`#1f77b4`, `#9467bd`,
`#2ca02c`, `#666666`, `#aaaaaa`, `#cccccc`, `#000000`) used by the
8 inline charts.

```ts
import { ANOMALY_COLORS, SEMANTIC, BRAND } from './theme';

export const PANEL_CHART_COLORS = {
  // TransmissionRateChart
  transmissionRateLine: BRAND.primary,      // was #1f77b4
  rollingMeanLine:      '#78736a',          // was #666666 — warm gray
  q1q3Band:             '#a8a298',          // was #aaaaaa — warm gray
  detectionMarker:      ANOMALY_COLORS.high,

  // ZScoreChart
  zscoreLine:           '#a78bfa',          // was #9467bd — violet-400
  zscoreWarningLine:    ANOMALY_COLORS.medium,
  zscoreAlertLine:      ANOMALY_COLORS.high,

  // ECTChart
  ectLine:              '#059669',          // was #2ca02c — emerald-600
  ectZeroLine:          '#78736a',          // was #000000 — warm gray

  // IRFChart
  irfFullLine:          '#1a1814',          // was #000000 — warm near-black
  irfSubperiodLine:     '#a8a298',          // was #cccccc — warm gray
  irfConfidenceBand:    BRAND.primary,      // was #1f77b4
  irfPeakMarker:        ANOMALY_COLORS.high,

  // MLMapChart
  mlMapHighlight:       ANOMALY_COLORS.high,
  mlMapNormalFill:      '#d4cec1',          // was #94a3b8 — warm border-strong

  // IQRBoxplot
  iqrBoxFill:           '#ede8de',          // was #cbd5e1 — bg-muted
  iqrMedianLine:        '#4a463e',          // was #475569 — text-secondary
  iqrCurrentMarker:     ANOMALY_COLORS.high,

  // AsymmetryHistogram
  asymmetryUpBin:       '#ea580c',          // unchanged hue, darker shade
  asymmetryDownBin:     '#0891b2',          // was #06b6d4 — cyan-600

  // BreakpointsChart
  breakpointsLine:      ANOMALY_COLORS.high,
} as const;
```

Zero d3 defaults remain. Zero pure black (`#000000`) — replaced with
warm near-black `#1a1814` for IRF main line and warm-gray
`#78736a` for ECT zero line (a baseline reference, intentionally
lower visual weight).

`ANOMALY_COLORS.high` is reused 6× (detectionMarker, zscoreAlertLine,
irfPeakMarker, mlMapHighlight, iqrCurrentMarker, breakpointsLine).
This is intentional — all six mean "the abnormal point you should
look at" — and is semantically consistent.

---

## 7. Chart Theme (axes, grids, background)

**`[LOCKED]`** New shared object. Create `src/utils/chartTheme.ts`:

```ts
export const CHART_THEME = {
  background:        'transparent',
  axisLine:          '#e7e2d8',  // border-default
  axisText:          '#78736a',  // text-tertiary
  axisLabel:         '#4a463e',  // text-secondary
  gridLine:          '#f0ebe1',  // border-subtle
  gridDasharray:     '0',        // solid (Observable style)
  baselineRef:       '#0d9488',  // brand teal at 50% opacity
  baselineRefDash:   '4,4',
  warmupBand:        'rgba(120, 115, 106, 0.08)',
  warmupLabel:       '#a8a298',
  eventLine:         '#a8a298',
  eventLineDash:     '2,4',
  fontFamily:        'inherit',
  fontFamilyMono:    'JetBrains Mono, ui-monospace, monospace',
  fontSize:          11,
} as const;
```

Apply in every D3 chart:
```ts
g.append('g').call(d3.axisLeft(y))
  .attr('color', CHART_THEME.axisLine)
  .selectAll('text')
    .attr('fill', CHART_THEME.axisText)
    .attr('font-size', CHART_THEME.fontSize)
    .attr('font-family', CHART_THEME.fontFamilyMono);
```

Replaces the 8 individual inline definitions of axis color
(`#64748b`) currently scattered across chart files.

---

## 8. Tooltip Theme

**`[LOCKED]`** Single helper, shared by all 8 inline charts plus the
main chart hovers.

Create `src/utils/chartTooltip.ts`:

```ts
import { Z_INDEX } from './zIndex';

export function createChartTooltip(id: string): HTMLDivElement {
  let tip = document.getElementById(id) as HTMLDivElement | null;
  if (tip) return tip;
  tip = document.createElement('div');
  tip.id = id;
  tip.style.cssText = `
    position: fixed;
    pointer-events: none;
    background: #ffffff;
    border: 1px solid #e7e2d8;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 12px;
    font-family: inherit;
    color: #1a1814;
    z-index: ${Z_INDEX.CHART_TOOLTIP};
    white-space: nowrap;
    display: none;
    box-shadow:
      0 4px 12px rgba(28, 24, 18, 0.06),
      0 1px 3px rgba(28, 24, 18, 0.04);
    transition: opacity 100ms ease-out;
  `;
  document.body.appendChild(tip);
  return tip;
}
```

Notes:
- Solid white background, warm border — no glass/blur (light theme
  doesn't benefit from blur the way dark does)
- Z-index uses new `CHART_TOOLTIP` token (1000), not the inline
  `9999` currently in StreamChart/IRFChart
- Replaces `cssText` literal in `StreamChart.tsx:577` and
  `IRFChart.tsx:124` (and the 6 other charts that copy this block)

---

## 9. Stroke Widths & Marker Sizes

**`[LOCKED]`** Standardized across all charts.

| Element | Width / Size |
|---|---|
| Main line (primary commodity) | `stroke-width: 2.25` |
| Secondary line (comparison) | `stroke-width: 1.5`, dashed |
| Rolling mean | `stroke-width: 1.5`, dashed `4,3` |
| Threshold lines | `stroke-width: 1`, dashed `2,4` |
| Baseline (y=1, y=0) | `stroke-width: 1.25`, dashed `4,4`, opacity 0.5 |
| Anomaly node `high` | `r=7`, filled |
| Anomaly node `medium` | `r=5.5`, filled |
| Anomaly node `reference` | `r=4`, **outline-only** (white fill, color stroke 2px) |
| Anomaly glow (high) | extra `r+3` circle, opacity 0.6, CSS pulse |
| Hover-enlarged node | × 1.35 with 120ms transition |
| Event vertical line | `stroke-width: 1`, dashed, opacity 0.5 |
| Confidence band fill | opacity 0.18 |
| Area fill (Observable style) | linear gradient, top opacity 0.18 → bottom 0 |

The hard-coded current values (`stroke-width: 1.5` for main lines)
are bumped up because warm-white canvas tolerates and benefits from
heavier strokes.

---

## 10. Observable Style Gradient

**`[LOCKED]`** Defined once, reused. Add to each chart's `<defs>`
with chart-specific ID:

```ts
const grad = svg.append('defs').append('linearGradient')
  .attr('id', `grad-${chartId}`)
  .attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', 1);
grad.append('stop')
  .attr('offset', '0%')
  .attr('stop-color', lineColor)
  .attr('stop-opacity', 0.18);
grad.append('stop')
  .attr('offset', '100%')
  .attr('stop-color', lineColor)
  .attr('stop-opacity', 0);

g.append('path')
  .datum(data)
  .attr('fill', `url(#grad-${chartId})`)
  .attr('d', d3.area().x(...).y0(innerH).y1(...).curve(d3.curveMonotoneX));
```

**StreamChart conflict resolution**: rev.6 contract explicitly says
"area fill 금지". The Observable-style gradient is therefore
**NOT applied to the main StreamChart**. It IS applied to:
- ScatterChart's auxiliary trace overlays (if any)
- RawPricesChart series (5 sources, each gets its own faint area)
- Minimap (single area underneath the main line)
- All 8 panel inline charts where appropriate

For StreamChart, the contract wins — line only, no fill.

---

## 11. Cleanup Targets (grep)

After tokens are wired, search for stragglers:

```bash
# Should return zero matches in src/components/charts/:
grep -rn "#1f77b4\|#9467bd\|#2ca02c\|#666666\|#aaaaaa\|#cccccc\|#000000" src/components/charts/

# Should return zero matches in src/:
grep -rn "#e24b4a\|#ef9f27\|#c8d850" src/

# Old segment / raw price hex (now superseded):
grep -rn "#3b82f6\|#22c55e\|#06b6d4" src/components/charts/

# Should resolve to colorUtils import only:
grep -rn "stroke=\"#" src/components/charts/
grep -rn "fill=\"#" src/components/charts/
```

---

## 12. Verification

After palette is wired:

- All 8 inline charts in the Panel render without any d3-default
  blue (`#1f77b4`) appearing
- RawPricesChart with CPI line + anomaly nodes simultaneously
  shows two distinct red shades
- Reference anomaly nodes render as outlined rings, not filled
  circles
- StreamChart still has no area fill (rev.6 contract)
- Tooltip styling identical across all charts (single source)
