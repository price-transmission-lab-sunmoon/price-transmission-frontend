# 03 · Layout

> Top-level chrome: `AppShell` · `Banner` · `Header` · `FilterBar` ·
> `FreshnessChip`. These five components frame every main view.
> Structure is immutable; what changes is surface (color, type,
> spacing, shadow, hover behavior).

---

## 1. `AppShell` (`src/components/layout/AppShell.tsx`)

**`[LOCKED]`** Outermost vertical stack.

| Property | Target |
|---|---|
| Root background | `var(--bg-canvas)` (`#faf8f4`) |
| Text color | `var(--text-primary)` (`#1a1814`) |
| Font family | `var(--font-sans)` |
| Layout | unchanged: `flex flex-col h-screen` |
| Main padding | `px-8 py-6` (was `p-6`) — extra horizontal breathing |
| Main overflow | unchanged: `overflow-auto` |

Conditional render of `FilterBar` / `Panel` based on
`isMethodology` route stays as-is. `OnboardingGuide` /
`HelpFloatingButton` mount points unchanged.

Do not introduce any new wrapper element. The DOM tree shape is
contract.

---

## 2. `Banner` — 이달의 이상 (`src/components/layout/Banner.tsx`)

**`[LOCKED]`** Container.

| Property | Target |
|---|---|
| Height | `48px` (was `40px`) |
| Padding | `0 24px` (was `0 20px`) |
| Background | `var(--bg-surface)` (white card on warm canvas) |
| Border-bottom | `1px solid var(--border-default)` |
| Layout | flex-row, `gap: 14px`, single-line, `overflow-x: auto` |

### 2.1 Section label `이달의 이상`

```
icon (sparkles, 14px, color: brand)
+ text "이달의 이상" (nano, 11px, weight 600,
  color: text-tertiary, uppercase, tracking 0.08em)
```

The sparkles icon adds a visual hook without color noise; it sits
on `--brand` so the eye lands on the section identifier first.

### 2.2 Anomaly chip

| Property | Target |
|---|---|
| Height | `26px` (was `20px`) |
| Padding | `0 10px` (was `0 8px`) |
| Background | `var(--bg-surface)` |
| Border | `1px solid var(--border-default)` |
| Border-radius | `var(--r-md)` (`8px`) |
| Shadow | `var(--e1)` |
| Font | `12px / weight 500 / var(--text-primary)` |
| Gap (icon + label) | `6px` |

Each chip is a button with:
- **Leading dot** (`6px`, color = grade color) — replaces the
  current colored bg+border-by-grade pattern. The chip is neutral
  white; the dot carries the semantic.
- **Commodity name** in Korean
- **NEW badge** (if `is_new`): `9px / weight 700 /
  color: --warning / bg: --warning-subtle / border:
  --warning-border / padding: 1px 4px / radius: 3px / letter-spacing
  0.05em`. Inline at the right end of the chip.
- **No grade label text** ("고신뢰" etc) — the dot is sufficient.
  Tooltip on hover may show the full label.

### 2.3 Hover

```css
border-color: var(--border-strong);
transform: translateY(-1px);
box-shadow: var(--e2);
transition: all var(--motion-fast) var(--ease-out);
```

Subtle lift, no color change. The chip is identical at rest and
hover except elevation.

### 2.4 Diff text (`지난달 대비 N건 증가`)

- Right-aligned (push with `flex: 1` spacer)
- Font: `12px / var(--font-mono) / var(--text-tertiary)`
- No icon, no badge — quiet metadata

### 2.5 Empty state (`total_count === 0`)

Current: bare text. Replace with:

```
[check icon, 14px, color: success]
"이번 달 탐지된 이상이 없습니다"
(13px / var(--text-secondary))
```

The check icon and `--success` color signal "this is a good thing,
not missing data".

---

## 3. `Header` (`src/components/layout/Header.tsx`)

**`[LOCKED]`** Container.

| Property | Target |
|---|---|
| Height | `60px` (was `56px`) |
| Padding | `0 24px` (was `0 20px`) |
| Background | `var(--bg-canvas)` (matches root, not `--bg-surface`) |
| Border-bottom | `1px solid var(--border-default)` |
| Layout | left group + right group via `justify-between` |
| Left gap | `20px` |
| Right gap | `10px` |

### 3.1 Logo

- Custom SVG (data-flow line + accent dot)
- Color: `var(--brand)` — **not** the anomaly red the current logo
  uses. Brand and anomaly must be visually distinct.
- Size: `22px`
- Service name "가격렌즈": `15px / weight 700 / color:
  --text-primary / letter-spacing -0.01em`
- Logo and text gap: `9px`

### 3.2 Vertical divider

`width: 1px / height: 22px / background: var(--border-default)`.
Used twice in the header (after logo, after compare-add).

### 3.3 Primary commodity dropdown trigger

| State | Border | Background | Shadow |
|---|---|---|---|
| Resting | `var(--border-default)` | `var(--bg-surface)` | `var(--e1)` |
| Hover | `var(--border-strong)` | `var(--bg-surface)` | `var(--e1)` |
| Open | `var(--brand)` | `var(--bg-surface)` | `0 0 0 3px var(--brand-subtle)` |

Inner layout:
- Leading dot (`8px`, grade color)
- Commodity name (`13px / weight 500 / var(--text-primary)`)
- Trailing chevron-down (`14px / var(--text-tertiary)`, rotates
  180° on open, transition `var(--motion-default)`)
- Padding: `0 10px 0 12px`, height `34px`
- Min-width: `160px`

### 3.4 Commodity dropdown body

| Property | Target |
|---|---|
| Position | absolute, `top: calc(100% + 6px)`, left-aligned with trigger |
| Width | `280px` (was `192px`) |
| Max-height | `380px` with `overflow-y: auto` |
| Background | `var(--bg-surface)` |
| Border | `1px solid var(--border-default)` |
| Radius | `var(--r-lg)` |
| Shadow | `var(--e4)` |
| Padding | `6px` (outer) |
| Animation | `scale-in 240ms var(--ease-emph)` |

Cluster header:
- `padding: 8px 12px 4px`
- `10px / weight 600 / var(--text-tertiary) / uppercase /
  letter-spacing 0.1em`

Item:
- `padding: 8px 10px / gap: 10px / radius: var(--r-sm)`
- Layout: `leading dot (6px, grade) + name + grade label
  (10px / var(--text-tertiary), right-aligned)`
- Hover: `background: var(--bg-subtle)`
- Active: `background: var(--brand-subtle), color: var(--brand-active)`

### 3.5 Compare-add button (보조 품목)

When no secondary commodity selected, show "비교 추가" affordance:

```
height: 34px, padding: 0 12px
background: transparent
border: 1px dashed var(--border-strong)
border-radius: var(--r-md)
font: 12px / var(--text-tertiary)
icon: plus (14px), text "비교 추가"
gap: 6px
```

Hover:
```css
border-color: var(--brand);
color: var(--brand);
background: var(--brand-subtle);
```

When secondary is selected, replace this button with a chip
identical in structure to the primary dropdown trigger but with an
inline ✕ to remove.

### 3.6 View tab nav

Four tabs: `흐름 보기` / `전달 구조` / `원시 시계열` / `방법론`.

| State | Background | Text | Border | Weight |
|---|---|---|---|---|
| Resting | transparent | `var(--text-tertiary)` | transparent | 500 |
| Hover | `var(--bg-subtle)` | `var(--text-secondary)` | transparent | 500 |
| Active | `var(--brand-subtle)` | `var(--brand-active)` | `1px solid var(--brand-border)` | 600 |

Each tab:
- Height `34px / padding 0 12px / gap 6px / radius var(--r-md)`
- Leading icon (`14px`) + label (`13px`)
- Icon name mapping: `흐름 보기 → trend-up`,
  `전달 구조 → compare`, `원시 시계열 → list`,
  `방법론 → info`
- Tabs gap: `2px`

### 3.7 Right cluster: FreshnessChip + Help button

- FreshnessChip (see §5 below)
- Help button: `IconButton` with `help` icon, variant `outline`,
  size `md` (32×32)

---

## 4. `FilterBar` (`src/components/layout/FilterBar.tsx`)

**`[LOCKED]`** Container.

| Property | Target |
|---|---|
| Height | `52px` (was `48px`) |
| Padding | `0 24px` (was `0 20px`) |
| Background | `var(--bg-canvas)` |
| Border-bottom | `1px solid var(--border-default)` |
| Layout | flex-row, `gap: 16px`, `white-space: nowrap`, `overflow-x: auto` |

### 4.1 Filter label (`기간`, `신뢰도`, `패턴`, `구간`)

```
font: 10px / weight 600 / var(--text-tertiary)
text-transform: uppercase
letter-spacing: 0.1em
margin-right: 4px
```

### 4.2 Segmented control (used by 기간 / 신뢰도 / 패턴)

| Property | Target |
|---|---|
| Container | `inline-flex / padding 2px / background var(--bg-subtle) / border 1px solid var(--border-default) / radius var(--r-md) / gap 2px` |
| Item (resting) | `height 24px / padding 0 10px / font 12px weight 500 / color var(--text-tertiary)` |
| Item (active) | `background var(--bg-surface) / color var(--text-primary) / shadow var(--e1) / radius var(--r-sm)` |
| Transition | `all var(--motion-fast) var(--ease-out)` |

Brand-color the active item is **not** used here — keep filter
chrome neutral so the brand color stays reserved for primary
navigation (tabs) and CTAs. Segmented controls in the FilterBar
are utility selectors, not navigation.

### 4.3 Event filter dropdown button

`Button` component, `variant: outline / size: sm`, icon `calendar`.
Label: `사건 필터` + trailing `(N)` count in `var(--text-muted)`.

### 4.4 Vertical dividers between filter groups

`width: 1px / height: 20px / background: var(--border-default)`.
Three dividers total (after 기간, after 신뢰도, after 패턴).

### 4.5 구간 toggle group (right side)

Position via `margin-left: auto` so the construct hugs the right
edge.

Each segment toggle is a `Switch` component:
- Label: monospaced segment id (`A`, `B`, `C`, `D`, `D'`)
- Font: `12px / var(--font-mono) / var(--text-tertiary)`
- Switch on color: `var(--brand)` (brand teal, not emerald)
- Switch off color: `var(--border-strong)`
- Size: `sm` (28×16, dot 12)
- Gap between switches: `10px`

**`[OPEN]`** Whether to also show the segment color dot next to
each toggle. Spec leaves it open; if the user discovers
"which segment is which color" through the chart legend instead,
this is unnecessary. Implementer's call.

### 4.6 Disabled segments (`segmentsDisabled`)

Per existing logic (e.g., commodity with no wholesale data):
- Render switch normally but `disabled`
- `opacity: 0.4`
- `cursor: not-allowed`
- Add `title` attr explaining why disabled (e.g.,
  `"이 품목은 도매가 데이터가 없습니다"`)
- Do **not** replace with a `—` placeholder (the current behavior).
  Keep the affordance visible but inactive.

---

## 5. `FreshnessChip` (`src/components/layout/FreshnessChip.tsx`)

**`[LOCKED]`** Container.

| Property | Target |
|---|---|
| Height | `30px` (was `28px`) |
| Padding | `0 10px 0 12px` |
| Background | `var(--bg-surface)` |
| Border | `1px solid var(--border-default)` |
| Border-radius | `var(--r-md)` |
| Font | `12px / var(--text-secondary)` |
| Gap (dot + text) | `8px` |

### 5.1 Live dot

```
width: 7px, height: 7px
border-radius: 50%
background: var(--success) (#16a34a)
animation: live-pulse 2s ease-in-out infinite
```

CSS keyframes for `live-pulse`:
```css
@keyframes live-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.5); }
  50%      { box-shadow: 0 0 0 6px rgba(22, 163, 74, 0); }
}
```

The expanding-ring pulse signals "live data" without being noisy.
Period 2s — slow enough to feel ambient, fast enough to register.

### 5.2 Text content

Format: `{baseLabel} 기준 · 다음 갱신 {nextLabel} 예정`

Where:
- `baseLabel` (e.g., `2026-04`) is monospaced: `var(--font-mono)`,
  color `var(--text-secondary)`
- Separator `·` color `var(--text-muted)`, margin `0 6px`
- "다음 갱신 ... 예정" tone-shifted to `var(--text-tertiary)`

### 5.3 Stale state (`data_up_to > 90 days old`)

**`[OPEN]`** Whether to introduce this branch now or defer. If
implemented:

```
Live dot → amber (`var(--warning)`), no pulse
Text color → `var(--warning)` for the date portion
Tooltip explaining staleness
```

The existing component has no stale branch. Adding it is a small
scope creep. Implementer's call.

### 5.4 Loading state

```
Border becomes dashed (var(--border-default) dashed)
Dot color → var(--text-muted)
Text → "..." with animate-pulse opacity
```

---

## 6. Cross-Component Notes

### 6.1 Vertical alignment across the chrome stack

Banner (48), Header (60), FilterBar (52) — total `160px` from top
to main content. Visual weight increases downward (Banner is
quietest, Header carries brand + nav, FilterBar is functional).

### 6.2 Background layer rhythm

```
canvas    (#faf8f4)  ← AppShell, Header, FilterBar, FilterBar bg
surface   (#ffffff)  ← Banner bg, dropdown bg, chip bg
```

Banner is white-on-canvas because it carries chips that need their
own elevation; Header and FilterBar are canvas-on-canvas so the
"control surface" reads as a single zone with the page.

### 6.3 What never appears in these components

- Pure black (`#000000`)
- Slate dark scale (`#0f172a`, `#1e293b`, `#334155`)
- `text-xs` (12px) for primary labels — use `caption` (13px) min
- `py-0.5`, `gap-1` in body content

---

## 7. Verification Checklist

- [ ] Banner chips all same neutral bg, only dot color changes
- [ ] Header logo color = brand teal (not anomaly red)
- [ ] Header tab active state = brand fill (visible at a glance)
- [ ] FilterBar segmented controls = neutral active (no brand)
- [ ] 구간 switches use brand teal when on
- [ ] FreshnessChip dot pulses, color = success green
- [ ] No console errors on any route
- [ ] Tab keyboard navigation still works (focus ring per `09-motion.md`)
