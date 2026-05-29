# 04 · Panel (Right Analysis Side Panel)

> `Panel.tsx` — right-side analysis surface. Highest information
> density in the app. Contains commodity header + 4 collapsible
> sections (econometric stats, ML scores, judgment path, inline
> charts) + 8 inline charts. The redesign reorganizes hierarchy and
> adds elevation without changing the content tree.

---

## 1. Container

**`[LOCKED]`** `<aside>` shell.

| Property | Target |
|---|---|
| Width | `panelWidth` from Zustand (drag-resizable, 280-520) — unchanged |
| Background | `var(--bg-canvas)` (matches root) |
| Border-left | `1px solid var(--border-default)` |
| Layout | `flex flex-col / overflow-hidden` |
| Header padding | `16px 20px` (was `12px 16px`) |
| Body padding | `14px` outer, sections inside have own padding |
| Section gap | `10px` (`space-y-[10px]`) |

The panel reads as a "second column" attached to the main view, not
as a floating overlay. Same canvas color as the page root with a
single left border separator.

---

## 2. DragHandle (Panel.tsx:300)

**`[LOCKED]`**

| Property | Target |
|---|---|
| Position | `absolute / left:0 / top:0 / bottom:0 / width: 3px` |
| Cursor | `col-resize` |
| Background (resting) | `transparent` |
| Background (hover) | `var(--brand)` at 30% alpha |
| Background (active drag) | `var(--brand)` at 60% alpha |
| Transition | `background var(--motion-fast) var(--ease-out)` |

Additional hover hint: a centered 4×40 `var(--brand)` pill that
fades in only on hover (`opacity 0 → 1`).

During drag, set `document.body.style.cursor = 'col-resize'` and
`userSelect = 'none'` so the cursor stays consistent when the mouse
moves outside the handle.

---

## 3. Panel Header (Panel.tsx:452)

**`[LOCKED]`** Hierarchy fix — primary info (commodity name) gets
visual weight; secondary info (segment, period) demoted.

### 3.1 Layout

```
┌─────────────────────────────────────────┐
│ [name 16px bold] [grade badge] [NEW?]  ✕│  ← line 1
│ segment · 2026-04 · pattern label       │  ← line 2
└─────────────────────────────────────────┘
```

Line 1: `flex / items-center / gap 8px / margin-bottom 6px`.

- Commodity name: `<h2>` with `subhead` token style but bumped to
  `16px / weight 700 / letter-spacing -0.01em / var(--text-primary)`
- Confidence badge: `<ConfidenceBadge grade={...} size="sm" />`
  (component spec in §4 below)
- NEW badge (if `is_new`): `<Badge tone="warning" size="sm">NEW</Badge>`
- Close button: pushed right via `margin-left: auto`, separate
  cluster

Line 2: `flex / items-center / gap 8px / font 12px /
var(--text-tertiary)`.

- Segment label (e.g., `국제→수입`) — sans
- Separator dot: `·` in `var(--border-strong)`
- Period: `font-mono` (e.g., `2026-04`)
- Separator dot
- Pattern label (e.g., `비대칭 전달`) — `var(--brand)` weight 500
  so it pops as semantic info

### 3.2 Close button

`<IconButton icon="x" variant="ghost" size="sm" />`. Spec:
- Size 28×28, radius `var(--r-sm)`
- Icon at 14px stroke 1.6
- Hover: `background var(--bg-subtle)`
- Active: `background var(--bg-muted)`
- Click area larger than the visible icon

The current text `✕` character is replaced with an SVG `x` path for
visual consistency with the rest of the icon set.

---

## 4. `ConfidenceBadge`

**`[LOCKED]`** Reusable badge component (refactor inline def at
Panel.tsx:27 into shared component if it isn't already).

```tsx
<ConfidenceBadge grade="high" size="md" />
```

Props:
- `grade: 'high' | 'medium' | 'reference'`
- `size: 'sm' | 'md' | 'lg'`

Visual:
- Padding: `3px 8px` (sm) / `4px 10px` (md)
- Height: `22px` (sm) / `26px` (md)
- Font: `11px (sm) / 12px (md), weight 600, letter-spacing 0.01em`
- Background: `var(--anomaly-{grade}-bg)`
- Color: `var(--anomaly-{grade})`
- Border: `1px solid var(--anomaly-{grade}-border)`
- Radius: `var(--r-sm)`

Replaces the inline-style version that hard-codes `{color}20`
opacity in JS.

---

## 5. Section Cards (4 sections)

**`[LOCKED]`** Wrapper.

| Property | Target |
|---|---|
| Background | `var(--bg-surface)` |
| Border | `1px solid var(--border-default)` |
| Border-radius | `var(--r-lg)` |
| Shadow | `var(--e1)` |
| Overflow | `hidden` (for the rounded corners on inner header) |

### 5.1 `SectionHeader`

Button (button because it toggles open):

| Property | Target |
|---|---|
| Width | 100% |
| Padding | `12px 14px` (was `8px 12px`) |
| Background (resting) | `transparent` |
| Background (hover) | `var(--bg-subtle)` |
| Border-bottom (when open) | `1px solid var(--border-default)` |
| Layout | flex-row, gap 10px, text-align left |
| Transition | `background var(--motion-fast)` |

Children:
- **Accent bar** (leftmost): `width 3px / height 14px / radius 1.5px
  / background <section color>` (see §5.4 for color mapping)
- **Title**: `13px / weight 600 / var(--text-primary)` — pushes
  `flex: 1`
- **Count badge** (optional): pill, `font-mono 10px weight 600 /
  padding 2px 7px / background var(--bg-muted) / color
  var(--text-tertiary) / radius var(--r-pill)`
- **Chevron-down icon** (`14px / var(--text-tertiary)`): rotates
  180° when open, `transition transform var(--motion-default)`

### 5.2 Section body

`padding: 12px 14px 14px` inside the card after the header.

### 5.3 Initial open state

| Section | Default state |
|---|---|
| 분석 수치 | open |
| ML 모델 점수 | open |
| 패턴 판정 경로 | open |
| 확장 차트 | **collapsed** (8 child charts is heavy on first paint) |

### 5.4 Accent bar color per section

| Section | Accent color |
|---|---|
| 분석 수치 (Econometric stats) | `var(--brand)` |
| ML 모델 점수 | `#7c3aed` (violet) |
| 패턴 판정 경로 | `var(--success)` |
| 확장 차트 | `#059669` (emerald) |

The accent bar acts as a section-identity color across the panel.
Brand teal is reserved for the primary/headline section.

---

## 6. `StatRow` (Panel.tsx:67)

**`[LOCKED]`** Each row inside `분석 수치`.

```
┌─────────────────────────────────────┐
│ label (left)              value (R) │
└─────────────────────────────────────┘
```

| Property | Target |
|---|---|
| Padding | `8px 0` (was `2px 0`) |
| Border-bottom | `1px dashed var(--border-subtle)` — between rows |
| Last row | no bottom border |
| Gap | `12px` |

Label:
- `12px / weight 400 / var(--text-tertiary)`

Value:
- `13px / weight 500 (or 600 if highlight) / var(--font-mono) /
  font-variant-numeric: tabular-nums`
- Color: `var(--text-primary)` normally, `var(--anomaly-high)` if
  `highlight=true`

Tabular nums means numeric columns line up across rows. Critical
for at-a-glance value comparison.

---

## 7. `MlBarRow` (Panel.tsx:195)

**`[LOCKED]`** Each row in `ML 모델 점수`.

```
┌─────────────────────────────────────────────────────┐
│ Model name      [════════════════······]    0.86  ▾ │
└─────────────────────────────────────────────────────┘
```

| Property | Target |
|---|---|
| Container | button (clickable for drill-down) |
| Padding | `8px 10px` (was `6px 8px`) |
| Gap | `10px` |
| Background (resting) | `var(--bg-subtle)` |
| Background (hover) | `var(--bg-muted)` |
| Border-radius | `var(--r-sm)` |
| Transition | `background var(--motion-fast)` |

Children:
- **Model name**: `min-width: 110px / 12px / weight 500 /
  var(--text-secondary)`
- **Bar track**:
  - `flex: 1 / height: 6px / background var(--bg-surface) / border
    1px solid var(--border-subtle) / radius var(--r-pill) /
    overflow hidden`
- **Bar fill**:
  - `height 100% / width <pct>% / radius var(--r-pill)`
  - Color: by threshold —
    - `score >= 0.8` → `var(--anomaly-high)`
    - `score >= 0.6` → `var(--anomaly-medium)`
    - else → `var(--anomaly-reference)`
  - Box-shadow glow when high: `0 0 8px <color>40` (25% alpha)
  - Transition: `width var(--motion-slow) var(--ease-out)`
- **Score value**: `12px / weight 600 / font-mono / min-width 38px
  / text-right / color matches bar color`
- **Chevron** (drill-down indicator): chevron-down 14px,
  `var(--text-tertiary)`, rotates if drilled

### 7.1 ML consensus callout (after the 4 rows)

```
┌──────────────────────────────────────────┐
│ ✨ 4/4 모델 합의 — 통계 + ML 동시 탐지   │
└──────────────────────────────────────────┘
```

| Property | Target |
|---|---|
| Margin-top | `6px` |
| Padding | `8px 10px` |
| Font | `11px / var(--text-tertiary)` |
| Background | `var(--bg-subtle)` |
| Border-radius | `var(--r-sm)` |
| Layout | flex-row, gap 6px |

Leading sparkles icon (`12px / var(--brand)`). Number portion
(`4/4 모델 합의`) in `var(--text-primary) / weight 600`.

Conditional render: only when ≥3 of 4 models agree on anomaly.

---

## 8. Judgment Path (Panel.tsx:657)

**`[LOCKED]`** Vertical stepper.

```
┌──┐
│ 1│  Step label 1
└┬─┘  metric value
 │
┌┴─┐
│ 2│  Step label 2 ✓
└┬─┘  metric value
 │
... etc
```

| Property | Target |
|---|---|
| Container | flex-col, no explicit gap (rows have own padding) |
| Row padding | `8px 0` |
| Row gap (internal) | `12px` |
| Row position | `relative` (for the connector line) |

### 8.1 Step indicator (left circle)

| Property | Target |
|---|---|
| Size | `24px × 24px` |
| Radius | 50% (circle) |
| Background | `var(--success-subtle)` if passed, else `var(--error-subtle)` |
| Border | `1.5px solid var(--success or --error)` |
| Color | `var(--success or --error)` |
| Font | `11px / weight 700 / var(--font-mono)` |
| z-index | 1 (above connector line) |

### 8.2 Connector line

For each row except the last:

```css
position: absolute;
left: 11px;       /* center of the 24px circle */
top: 32px;        /* below the circle */
bottom: 0;        /* connects to the next row */
width: 1.5px;
background: var(--success-border) if next-step passed, else var(--error-border);
```

### 8.3 Step body

Flex: 1, min-width: 0.

- **Label**: `13px / weight 500 / var(--text-primary) / line-height 1.3`
- **Value** (below label): `11px / var(--text-tertiary) /
  var(--font-mono) / margin-top 2px`

### 8.4 Trailing check/cross

Right-aligned, `align-self: flex-start / margin-top: 4px`.

- `check` icon (14px, `var(--success)`) if passed
- `x` icon (14px, `var(--error)`) if failed

The current `✓` / `✗` text chars are replaced with SVG.

---

## 9. Inline Chart Wrapper (Panel.tsx:101, 151)

**`[LOCKED]`** Used for the 8 inline charts inside `확장 차트`.

| Property | Target |
|---|---|
| Container border | `1px solid var(--border-default)` |
| Container radius | `var(--r-md)` |
| Container background | `var(--bg-surface)` |
| Overflow | `hidden` |
| Header padding | `8px 12px` |
| Header bg (hover) | `var(--bg-subtle)` |
| Chart area padding | `4px 10px 10px` |
| Chart area top border (when open) | `1px solid var(--border-subtle)` |

Header layout:
- Leading accent bar (`3px × 12px / radius 1.5 / accent color`)
- Label (`12px / weight 500 / var(--text-secondary)`)
- Trailing chevron-down (`12px`)

Per-chart accent colors — see §11 below for the 8-chart palette
mapping. Each chart gets its own accent so users can visually
identify "this is the Z-score one" without reading the label.

---

## 10. 8 Inline Charts — Common Standard

**`[LOCKED]`** All 8 charts follow these defaults:

```ts
const CHART_MARGIN = { top: 16, right: 16, bottom: 28, left: 48 };
const CHART_HEIGHT = 70;  // mini-chart standard
```

### 10.1 Axes

Apply `CHART_THEME` from `02-chart-palette.md §7`:
- Axis line: `var(--border-default)`
- Tick text: `11px / var(--font-mono) / var(--text-tertiary)`
- Tick lines: removed (`.selectAll('line').remove()`)
- Domain path: `var(--border-default)`, or removed entirely for
  Y-axis (left tick text only)

### 10.2 Line

- Stroke width: `1.5` (was inconsistent across charts)
- `stroke-linecap: round`, `stroke-linejoin: round`
- `curve: d3.curveMonotoneX`
- Single path per series

### 10.3 Soft area gradient (Observable style)

```ts
const grad = svg.append('defs').append('linearGradient')
  .attr('id', `grad-${chartId}`)...
```

Two stops, top opacity 0.18, bottom 0. Defined per chart instance
to avoid ID collisions.

### 10.4 Last-point marker

```ts
svg.append('circle')
  .attr('cx', x(lastIdx)).attr('cy', y(lastVal))
  .attr('r', 3)
  .attr('fill', accentColor)
  .attr('stroke', 'var(--bg-surface)')
  .attr('stroke-width', 1.5);
```

A "where are we now" marker on the right end of every time series.

### 10.5 Threshold lines (Z-score chart only)

Horizontal dashed lines at `±2σ`:
- Color: `var(--anomaly-medium)`
- Stroke-dasharray: `2,3`
- Opacity: 0.5

### 10.6 Empty state per inline chart

```jsx
<div className="flex items-center justify-center text-tertiary"
     style={{ height: 70, fontSize: 11 }}>
  해당 기간 데이터 없음
</div>
```

No icon at this size — text only.

---

## 11. Per-Chart Color Mapping

| Chart | Main accent | Source |
|---|---|---|
| `TransmissionRateChart` | `var(--brand)` | brand teal — primary metric |
| `ZScoreChart` | `#7c3aed` (violet) | distinguishes from baseline metric |
| `ECTChart` | `#059669` (emerald) | equilibrium/correction = green |
| `BreakpointsChart` | `var(--anomaly-high)` | structural break = warning hue |
| `IQRBoxplot` | `var(--text-secondary)` | neutral — it's a distribution |
| `AsymmetryHistogram` | up `#ea580c`, down `#0891b2` | dual bins |
| `IRFChart` | `var(--brand)` for CI band, near-black `#1a1814` for full | |
| `MLMapChart` | `var(--anomaly-high)` (highlight) on muted bg | |

These all reference the `PANEL_CHART_COLORS` tokens defined in
`02-chart-palette.md §6`.

---

## 12. IRF Peak Callout

**`[LOCKED]`** A highlighted summary at the bottom of the panel body
(after all 4 sections), when the IRF analysis is available.

```
┌─────────────────────────────────────────────────┐
│ ⚡ IRF peak 3개월 — 상류 가격 충격이 3개월 후    │
│    최대 반영. 평균(1.8M) 대비 67% 지연.          │
└─────────────────────────────────────────────────┘
```

| Property | Target |
|---|---|
| Padding | `12px 14px` |
| Background | `var(--brand-subtle)` |
| Border | `1px solid var(--brand-border)` |
| Border-radius | `var(--r-md)` |
| Layout | flex-row, gap 10px |

Children:
- Lightning bolt icon (`16px / var(--brand) / flex-shrink:0 / margin-top:1px`)
- Text body:
  - First clause `IRF peak 3개월`: `12px / weight 600 / var(--brand-active)`
  - Rest: `12px / var(--brand-active) / line-height 1.5`

---

## 13. Not-Implemented Notice (Panel.tsx:280)

**`[LOCKED]`** Phase-7-pending placeholder.

Replace the current inline span+text combo with a containerized card:

```jsx
<div className="not-impl-card">
  <Badge tone="warning" size="sm" uppercase>구현 대기</Badge>
  <p>{section}은 백엔드 Phase 7 작업 이후 표시됩니다.</p>
</div>
```

| Property | Target |
|---|---|
| Padding | `12px` |
| Background | `var(--warning-subtle)` |
| Border | `1px solid var(--warning-border)` |
| Border-radius | `var(--r-md)` |
| Layout | flex-col, gap 8px |

Body text: `12px / var(--text-secondary) / line-height 1.5`.

---

## 14. Verification

- [ ] Panel header shows name (16px bold) larger than segment line (12px)
- [ ] All 4 section cards visually identical except accent color
- [ ] StatRow numeric columns align (tabular-nums verified)
- [ ] MlBarRow bars animate width on score change
- [ ] Judgment path step circles connected by vertical line
- [ ] Inline chart wrapper chevron rotates smoothly on expand
- [ ] No d3 default colors visible in any inline chart
- [ ] Not-impl notice uses warning amber, not slate gray
