# 05 · Main Views

> `StreamChart` · `ScatterChart` · `RawPricesChart` · `Minimap`.
> These four charts occupy ~80% of every main route. The most
> visible surface in the app — and the one most constrained by
> immutable contracts. Read §1 before touching `StreamChart`.

---

## 1. `StreamChart` — Immutable Contract (rev.6)

**`[LOCKED]`** From `docs/CLAUDE.md`. The following must NOT change
during redesign. Any visual edit that conflicts loses.

| Rule | Status |
|---|---|
| Zoom: no RAF throttle, scaleExtent `[1, 30]`, immediate wheel | preserved |
| Y-axis viewport-dynamic sync, 10% padding, min span 0.2 | preserved |
| Node X spread: forbidden | preserved |
| `+N` cluster badges: forbidden | preserved |
| Z-order: `reference → medium → high` (high renders last) | preserved |
| Curve: `curveMonotoneX` only | preserved |
| Single path per segment, nulls pre-filtered | preserved |
| Warmup band: vertical band (color may change, semantic preserved) | preserved |
| Pulse: CSS `@keyframes` only, no SVG `<animate>` | preserved |
| **Area fill on main StreamChart line: forbidden** | preserved |

The Observable-style area gradient from `02-chart-palette.md §10`
is therefore **NOT applied** to the main StreamChart line. Apply
to ScatterChart trajectory / RawPricesChart series / Minimap /
inline charts only.

---

## 2. `StreamChart` — Visual Changes (Allowed)

**`[LOCKED]`** Everything below is fair game.

### 2.1 Container

| Property | Target |
|---|---|
| Min height | `360px` (was `320px`) |
| Background | `var(--bg-surface)` |
| Border | `1px solid var(--border-default)` |
| Border-radius | `var(--r-xl)` (`16px` — main hero card) |
| Shadow | `var(--e2)` |
| Overflow | `hidden` |

### 2.2 Page-level title above the chart

Currently the chart drops in with no framing. Add a title row above
the card:

```
계란 · 가격 전달율 흐름
2018-01 ~ 2026-04 · 국제 → 수입 → PPI → CPI 흐름에서 탐지된 이상치 ·
고신뢰 4건 · 중신뢰 3건 · 참고 2건
```

| Element | Style |
|---|---|
| Title (`<h1>`) | `display` token (`28px / weight 700 /
                  letter-spacing -0.01em / var(--text-primary)`) |
| Subtitle | `13px / var(--text-tertiary)` |
| Period (in subtitle) | `var(--font-mono)` |
| Separator dots | `var(--border-strong)` |
| Count chips inline | colored by grade — see legend §2.3 |

The title carries: `{commodity} · 가격 전달율 흐름`. The subtitle
carries: period, segment chain, counts.

### 2.3 Legend (right of title)

Compact horizontal chip showing the 3 grades:

```
┌─────────────────────────────────┐
│ ● 고신뢰  ● 중신뢰  ● 참고      │
└─────────────────────────────────┘
```

| Property | Target |
|---|---|
| Background | `var(--bg-surface)` |
| Border | `1px solid var(--border-default)` |
| Border-radius | `var(--r-md)` |
| Shadow | `var(--e1)` |
| Padding | `6px 12px` |
| Gap between items | `14px` |
| Dot size | `8px` |
| Label | `12px / var(--text-secondary)` |

### 2.4 Margins (D3)

```ts
const M = { top: 28, right: 32, bottom: 36, left: 56 };
```

Bumped from current (`top: 12, right: 12, bottom: 24, left: 44`)
for visual breathing room and to fit the warmup label, event
labels, and y-axis title.

### 2.5 Grid

| Property | Target |
|---|---|
| Y-grid lines | horizontal, every Y-tick |
| Stroke | `var(--border-default)` |
| Stroke-dasharray | none (solid — Observable style) |
| Stroke-width | `1` |
| Opacity | 1 (color is light enough at native opacity) |
| X-grid | none (X-axis tick labels alone are sufficient) |

Reference: `[LOCKED]` user decision — grid visible.

### 2.6 Reference line at y=1 (full pass-through)

```
horizontal line: y(1) across full innerW
stroke: var(--brand) at 50% opacity
stroke-width: 1.25
stroke-dasharray: 4,4
trailing label "완전 전달 (1.0)" right-aligned, font 10 mono,
  color var(--brand), weight 600
```

The reference line is conceptually a benchmark — "where 1:1
pass-through would be". Brand-colored at low opacity so it reads as
"semantically aligned with the system" but not as noisy as the
actual line.

### 2.7 Warmup band

| Property | Target |
|---|---|
| Position | from `x(0)` to `x(WARMUP_END)` (first 12 months by default) |
| Fill | `rgba(120, 115, 106, 0.08)` — `--text-tertiary` at 8% |
| Label | `WARMUP` at top-center of band |
| Label font | `10px / weight 600 / letter-spacing 0.08em /
              var(--text-muted)` |

The band color is intentionally warm-gray to harmonize with the
canvas. The label is uppercase, tiny, and quiet — informational only.

### 2.8 Event markers

For each entry in the events list (e.g., `COVID-19 팬데믹`,
`러시아-우크라이나 전쟁`):

- **Vertical line**: full chart height, stroke `var(--text-tertiary)`
  at 50% opacity, dasharray `2,4`, stroke-width 1
- **Label pill**: below the X-axis, centered on the line
  - Pill background: `var(--bg-surface)`
  - Pill border: `1px solid var(--border-default)`
  - Pill radius: `var(--r-pill)` (fully rounded)
  - Pill padding: `2px 8px`, height ~20px
  - Text: `10px / weight 500 / var(--text-secondary)`

The pill style replaces the bare-text label in the current
implementation. Pill-style labels read as "annotation chips"
rather than "axis text".

### 2.9 Main line

| Property | Target |
|---|---|
| Stroke color | `SEGMENT_COLORS_PRIMARY[segment]` (segment-specific) |
| Stroke width | `2.25` (was `2`) |
| Stroke-linecap | `round` |
| Stroke-linejoin | `round` |
| Curve | `d3.curveMonotoneX` (contract) |
| Fill | `none` (contract — no area fill on StreamChart) |

Secondary commodity line (when comparing):
- Same color from `SEGMENT_COLORS_SECONDARY[segment]`
- Stroke width `1.5`
- Stroke-dasharray `4,3` (dashed to distinguish from primary)

### 2.10 Anomaly nodes

| Grade | Radius | Fill | Stroke | Pulse |
|---|---|---|---|---|
| `high` | 7 | `var(--anomaly-high)` | — | yes (CSS keyframes) |
| `medium` | 5.5 | `var(--anomaly-medium)` | — | no |
| `reference` | 4 | `var(--bg-surface)` (white) | `var(--anomaly-reference)` 2px | no |

Reference is outline-only — distinguishes from filled grades even
at small size. (This satisfies the color-blindness recommendation
from the original guide §07.)

Each node has a 3-layer structure (back to front):
1. **Pulse halo** (high only): `r+3` circle, color = node color,
   opacity 0.6, CSS `anomaly-pulse-high` animation
2. **White ring** (separator from line): `r+2.5` circle, fill =
   `var(--bg-surface)`
3. **Main dot**: spec above

NEW indicator (`is_new === true`): tiny dot top-right of the node.
- Position: `cx + r+1, cy - r-1`
- Radius: 2.5px
- Fill: `var(--warning)`
- Stroke: `var(--bg-surface)` 1px (so it's visible against any
  node color)

### 2.11 CSS keyframes

```css
@keyframes anomaly-pulse-high {
  0%, 100% { transform: scale(1);    opacity: 0.6; }
  50%      { transform: scale(1.7);  opacity: 0;   }
}
```

Apply with:
```css
.anomaly-pulse-high {
  animation: anomaly-pulse-high 1.8s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: center;
}
```

`transform-box: fill-box` is required for SVG `<circle>` to scale
around its own center. Without it, the SVG element scales around
the SVG root.

### 2.12 Selected node

When a node is clicked (drives Panel content):

```ts
stroke: var(--brand)  // teal
stroke-width: 3
filter: drop-shadow(0 0 8px rgba(13, 148, 136, 0.5))
```

The brand-color outline distinguishes selection from grade color.
Drop-shadow adds glow.

### 2.13 Hover

Node hover: `r × 1.35` with 120ms transition. Color and pulse
unchanged. Tooltip appears (see §2.14).

### 2.14 Hover tooltip

Use `createChartTooltip` helper from `02-chart-palette.md §8`. Body
template:

```
[dot] [GRADE LABEL]                    [NEW badge?]
Anomaly label (13px weight 600 var(--text-primary))
period · 전달율 0.97 · score 0.92
(11px var(--font-mono) var(--text-tertiary))
```

### 2.15 Axes

X-axis:
- `d3.axisBottom(x)` with `timeYear.every(1)` ticks
- Format: `%Y`
- Tick-size 0, tick-padding 10
- Text: `11px / var(--font-mono) / var(--text-tertiary)`
- Domain line: `var(--border-default)`
- Tick marks: removed

Y-axis:
- `d3.axisLeft(y)` with 5 ticks
- Format: `d.toFixed(2)`
- Tick-size 0, tick-padding 10
- Text: `11px / var(--font-mono) / var(--text-tertiary)`
- Domain line: removed (tick text only)

Y-axis title:
- `전달율` (rotated -90°, x: `-innerH/2`, y: `-42`)
- `11px / weight 600 / var(--text-tertiary) / uppercase /
  letter-spacing 0.08em`

### 2.16 Empty state (`noAnomalies`)

Replace text-only with iconic empty state:

```
┌─────────────────────────────────────────┐
│              ┌──────┐                    │
│              │ icon │                    │
│              └──────┘                    │
│                                          │
│   이 기간에는 탐지된 이상이 없습니다     │
│   필터 기간을 넓히거나 다른 품목을        │
│   살펴보세요                              │
└─────────────────────────────────────────┘
```

Per `08-states.md §2 (Empty)`.

- Container: absolute, full chart area, pointer-events: none
- Icon: `chart-bar-square` style, 32px in a 64×64 `var(--bg-subtle)`
  rounded-full
- Title: `14px / weight 600 / var(--text-secondary)`
- Subtitle: `12px / var(--text-tertiary) / line-height 1.5`

---

## 3. `ScatterChart`

**`[LOCKED]`** Tab-switcher + scatter + slider + tooltip.

### 3.1 Container

Same standard as StreamChart §2.1.

### 3.2 Segment tabs

Above the scatter. Tabs for `A` / `B` / `D'` (or 4 segments
depending on data).

| State | Background | Text | Border |
|---|---|---|---|
| Resting | `var(--bg-subtle)` | `var(--text-tertiary)` | `var(--border-default)` |
| Hover | `var(--bg-muted)` | `var(--text-secondary)` | `var(--border-strong)` |
| Active | `var(--brand)` | `var(--text-on-brand)` | `var(--brand)` |

Each tab: height `30px / padding 0 14px / radius var(--r-md) /
font 13px weight 500`. Gap between tabs: `4px`.

### 3.3 Foldable explainer panel

The "전달 구조 뷰란?" panel.

Replace bracket-text + ▲▼ with proper accordion:

| Property | Target |
|---|---|
| Container | `border 1px solid var(--border-default) / radius var(--r-md) / background var(--bg-surface)` |
| Header padding | `12px 16px` |
| Header font | `13px / weight 500 / var(--text-secondary)` |
| Trailing chevron | SVG, 14px, rotates on open |
| Body padding | `0 16px 16px` |
| Body font | `13px / var(--text-secondary) / line-height 1.625` |
| Body border-top | `1px solid var(--border-subtle)` |

Body uses `white-space: pre-line` to preserve newlines from the
content source.

### 3.4 SVG chart

**Grid**: same standard as StreamChart §2.5 — solid lines,
`var(--border-default)`, no dasharray.

**Baseline (45° reference line)**:
- Stroke: `var(--brand)`
- Stroke-width: `1.5`
- Stroke-dasharray: `4,4`
- Opacity: 0.5

**Trajectory line (animated path through time)**:
- Stroke: `var(--text-tertiary)`
- Stroke-width: `1`
- Opacity: 0.4

**Zone labels** (sector descriptors in each quadrant):
- Font: `12px / weight 500 / var(--text-tertiary)`
- Position: anchored to corners

**Zone description** (sub-text under each label):
- Font: `11px / var(--text-muted)`

### 3.5 Anomaly nodes (in scatter)

Same standard as StreamChart §2.10. Glow filter (D3 `feGaussianBlur`)
unchanged.

### 3.6 Time slider (timeline scrubber)

Plays through scatter animation.

| Component | Spec |
|---|---|
| Play/pause button | `<IconButton icon="play"|"pause" variant="ghost" size="md" />`, color `var(--brand)` |
| Restart button | `<IconButton icon="chevron-left" />` (or rewind icon) |
| Slider track | `h-1.5` (6px), background `var(--bg-muted)`, radius `var(--r-pill)` |
| Slider fill | up to thumb, `var(--brand)`, radius `var(--r-pill)` |
| Slider thumb | `14×14 / circle / background var(--brand) / border 2px var(--bg-surface) / box-shadow var(--e2) / cursor: pointer` |
| Time label | `12px / var(--font-mono) / var(--text-secondary) / width 64px / text-right / tabular-nums` |

CSS for `<input type="range">` thumb:
```css
input[type="range"] {
  -webkit-appearance: none;
  background: linear-gradient(
    to right,
    var(--brand) 0%, var(--brand) <pct>%,
    var(--bg-muted) <pct>%, var(--bg-muted) 100%
  );
  height: 6px;
  border-radius: 9999px;
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px; height: 14px;
  background: var(--brand);
  border: 2px solid var(--bg-surface);
  border-radius: 50%;
  box-shadow: var(--e2);
  cursor: pointer;
}
```

### 3.7 Hover tooltip

React component (not D3-generated). Background `var(--bg-surface)`,
border `var(--border-default)`, padding `10px 12px`, shadow
`var(--e3)`, radius `var(--r-md)`. Same as the StreamChart tooltip,
just rendered through React.

---

## 4. `RawPricesChart`

**`[LOCKED]`** Source toggles + multi-series line chart.

### 4.1 Container

Same standard as StreamChart §2.1.

### 4.2 Source toggle row

5 toggles (intl_price_krw, import_price_usd, ppi, wholesale_price,
cpi). Layout: above chart, horizontal flex with wrap.

Each toggle:
| Property | Target |
|---|---|
| Layout | flex-row, gap 8px |
| Height | `28px` |
| Padding | `0 12px` |
| Border-radius | `var(--r-md)` |
| Font | `12px / weight 500` |
| Resting border | `1px solid var(--border-default)` |
| Resting bg | `transparent` |
| Resting text | `var(--text-tertiary)` |
| Active border | `1px solid {RAW_PRICE_COLORS[src]}` |
| Active bg | `{RAW_PRICE_COLORS[src]}` at 12% alpha |
| Active text | `{RAW_PRICE_COLORS[src]}` darkened version |
| Disabled | `opacity: 0.4 / cursor: not-allowed` |

Children:
- Leading dot (`8px / circle / fill {RAW_PRICE_COLORS[src]}` —
  always rendered, even when inactive, for color identity)
- Label (Korean source name from `SOURCE_LABEL` mapping)

### 4.3 SVG chart

5 series, each its own stroke + soft area gradient (Observable
style, allowed here — not the contract-restricted StreamChart).

| Element | Spec |
|---|---|
| Line | `stroke {RAW_PRICE_COLORS[src]}`, width `1.75`, `curveMonotoneX` |
| Area | gradient from `{color}` opacity 0.12 → 0 |
| Y baseline (100) | dashed horizontal, `var(--text-tertiary)` opacity 0.4 |
| Y baseline label | `기준 (100)`, `10px / var(--font-mono) / var(--text-tertiary)` right-aligned |

### 4.4 Anomaly nodes overlaid

Same as StreamChart §2.10 — rendered on top of all series.

### 4.5 Empty-data placeholder card (백엔드 미적재)

When `data.total_points === 0`:

| Property | Target |
|---|---|
| Position | absolute centered, pointer-events: none |
| Container | flex-col, gap 14px, padding `28px 32px` |
| Max-width | `420px` |
| Background | `var(--bg-surface)` |
| Border | `1px solid var(--warning-border)` |
| Border-radius | `var(--r-lg)` |
| Shadow | `var(--e3)` |
| Text-align | center |

Content:
1. Icon (`database` or `clock`, 32px in 64×64 `var(--warning-subtle)`
   rounded-full, color `var(--warning)`)
2. Badge: `<Badge tone="warning">구현 대기</Badge>`
3. Title: `원시 시계열 데이터가 아직 DB에 적재되지 않았습니다`
   (`14px / weight 600 / var(--text-primary)`)
4. Body: `파이프라인 Phase 0 결과물(국제가·수입단가·PPI·CPI)이
   적재된 후 자동으로 표시됩니다.`
   (`13px / var(--text-secondary) / line-height 1.625`)
5. Separator border-top
6. Meta: `흐름 보기 / 전달 구조 탭은 정상 작동합니다.`
   (`12px / var(--text-tertiary)`)

---

## 5. `Minimap`

**`[LOCKED]`** Brushable overview below main chart.

### 5.1 Container

| Property | Target |
|---|---|
| Height | `70px` (was `64px`) |
| Background | `var(--bg-surface)` |
| Border | `1px solid var(--border-default)` |
| Border-radius | `var(--r-md)` |
| Overflow | `hidden` |
| Padding | `0` (chart fills) |

Wrapped in an outer label card if shown next to the main chart:

```
┌────────────────────────────────────────────┐
│ ⊞ 전체 기간 · 미니맵    드래그하여 기간 선택│
│ ┌────────────────────────────────────────┐ │
│ │  minimap svg                            │ │
│ └────────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

Label row: `padding 12px 16px 8px / 11px weight 600 uppercase
tracking 0.08em / var(--text-tertiary)`. Right-side meta `드래그
하여 기간 선택`: `11px / var(--font-mono) / var(--text-muted)`.

### 5.2 Area + line

| Element | Spec |
|---|---|
| Area | fill `var(--brand-subtle-2)` (teal-100ish) |
| Line | stroke `var(--brand)`, width `1.25`, `curveMonotoneX` |

This minimap is allowed to use area fill (not a `StreamChart`).

### 5.3 Anomaly density dots

Tiny circles at bottom of minimap, position by X (time), radius by
grade.

| Grade | Radius |
|---|---|
| high | 3 |
| medium | 2.5 |
| reference | 2 |

Fill: anomaly grade color. Y position: `innerH - 4` (close to
bottom).

### 5.4 Brush window

| Property | Target |
|---|---|
| Brush fill | `var(--brand)` at 8% alpha |
| Brush stroke | `var(--brand)`, width 1.25 |
| Brush radius | 3px |
| Out-of-brush dim | `rgba(168, 162, 152, 0.12)` overlay |
| Handle | 4×16 pill, `var(--brand)`, `cursor: col-resize`, centered Y |

### 5.5 X-axis

Same standard as StreamChart §2.15 but compact:
- Font 10px, no Y-axis
- Year ticks only

### 5.6 Loading state

Same container, body replaced with shimmer (see `08-states.md §1`).

### 5.7 Empty / error state

`flex / items-center / justify-content: center / icon + text` per
`08-states.md §2`.

---

## 6. Verification

- [ ] StreamChart: zero area fill on the main line, gradient
      gradients elsewhere
- [ ] Reference line at y=1 visible and labeled "완전 전달 (1.0)"
- [ ] Warmup band: warm-gray, not slate; "WARMUP" label visible
- [ ] Event labels render as pills, not bare text
- [ ] Anomaly nodes: high pulses, reference is outline-only
- [ ] ScatterChart tabs: active = brand teal fill
- [ ] ScatterChart slider thumb: brand teal, custom CSS applied
- [ ] RawPricesChart: 5 source toggles all visible, dots are color
      identity even when inactive
- [ ] RawPricesChart empty-data card has icon, badge, title, body,
      meta — all 4 layers
- [ ] Minimap: brush teal, handles draggable, density dots visible
- [ ] All 4 main containers same `var(--r-xl)` radius and `var(--e2)`
      shadow
