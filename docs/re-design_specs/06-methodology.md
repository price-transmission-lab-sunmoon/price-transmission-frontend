# 06 · Methodology Page

> `/methodology` route. Six sections plus `PipelineFlowDiagram`. The
> only static-content-heavy page in the app. Redesign focus:
> information hierarchy, hover affordances on cards/tables, and
> diagram polish.

---

## 1. Page Shell — `MethodologyView`

**`[LOCKED]`** Wrapper.

| Property | Target |
|---|---|
| Max-width | `1024px` (was `896px`) |
| Padding | `32px 24px` outer |
| Section gap | `24px` (`space-y-6`) |
| Mx auto | yes (centered) |
| Background | inherits `var(--bg-canvas)` from AppShell |

### 1.1 Page header (NEW — add above sections)

The current view drops straight into Section 1 with no framing. Add:

```
┌────────────────────────────────────────────┐
│ 분석 방법론                                  │
│ 가격 전달 이상 탐지 모델의 분석 흐름과       │
│ 통계 · 머신러닝 기법                          │
└────────────────────────────────────────────┘
```

| Element | Style |
|---|---|
| `<h1>` "분석 방법론" | `display` token (`28/36 / weight 700 / letter-spacing -0.01em / var(--text-primary)`) |
| Subtitle | `14px / var(--text-tertiary) / line-height 1.625 / margin-top 4px` |
| Container | `margin-bottom 8px` (separates from first section) |

---

## 2. `SectionCard` / `SectionHeader`

**`[LOCKED]`** Wraps each numbered section.

### 2.1 Card

| Property | Target |
|---|---|
| Background | `var(--bg-surface)` |
| Border | `1px solid var(--border-default)` |
| Border-radius | `var(--r-xl)` (`16px`) |
| Padding | `24px` |
| Shadow | `var(--e1)` |
| `<section>` element | yes |

### 2.2 Header (number indicator + title)

```
┌──┐  분석 흐름 (파이프라인)
│ 1│
└──┘
```

Layout: `flex / items-center / gap 14px / margin-bottom 20px`.

**Number indicator**:
| Property | Target |
|---|---|
| Size | `36×36` (was `28×28`) |
| Border-radius | `var(--r-lg)` (12px — rounded square, not full circle) |
| Background | `linear-gradient(135deg, var(--brand) 0%, var(--brand-hover) 100%)` |
| Color | `var(--text-on-brand)` (white) |
| Font | `14px / weight 700 / var(--font-mono)` |
| Shadow | `0 4px 12px rgba(13, 148, 136, 0.24)` (color shadow) |

The gradient + color shadow gives the section index a slight 3D
quality without being skeuomorphic. Rounded square (not circle)
reads as "step" / "module" — appropriate for a methodology page.

**Title**:
- `<h2>` with `heading` token (`18/24 / weight 700 / letter-spacing -0.01em / var(--text-primary)`)

---

## 3. Section 1 — Pipeline Flow

**`[LOCKED]`** Renders `<PipelineFlowDiagram />` — spec in §10.

Above the diagram, add a one-line description:

`Phase 0 (원시 데이터) → Phase 7 (이상 탐지 결과) 흐름. 각 노드
클릭 시 상세 보기.`

Style: `13px / var(--text-tertiary) / margin-bottom 16px /
line-height 1.5`.

---

## 4. Section 2 — Pattern Cards (3 patterns)

**`[LOCKED]`** Three cards in `grid lg:grid-cols-3 gap-4`.

### 4.1 Pattern card

| Property | Target |
|---|---|
| Background | `var(--bg-surface)` |
| Border | `1px solid var(--border-default)` |
| Border-radius | `var(--r-lg)` |
| Padding | `20px` |
| Hover border | `var(--border-strong)` |
| Hover transform | `translateY(-1px)` |
| Hover shadow | `var(--e2)` |
| Transition | `all var(--motion-default) var(--ease-out)` |

### 4.2 Pattern chip (top of card)

```jsx
<Badge size="md" uppercase tracking-wider tone={tone}>
  패턴 1
</Badge>
```

Pattern → tone mapping:

| Pattern | Tone | Background | Border | Color |
|---|---|---|---|---|
| pattern1 (비대칭 전달) | "info" | `var(--brand-subtle)` | `var(--brand-border)` | `var(--brand-active)` |
| pattern2 (구조 단절) | "violet" | `#f5f3ff` | `#ddd6fe` | `#6d28d9` |
| pattern3 (지연 반응) | "teal-light" | `#ecfeff` | `#a5f3fc` | `#155e75` |

These match the dark-mode original semantic intent (3 distinct
hues) translated to light theme.

### 4.3 Card body

```
[chip]
Pattern label (e.g., 비대칭 전달)         ← H3
Description (multi-line)                  ← body
───────────────────────────────────────
적용 구간  [A] [B] [D']                    ← segment chips
```

- Pattern label (`<h3>`): `16px / weight 600 / var(--text-primary) /
  margin-top 12px`
- Description: `14px / var(--text-secondary) / line-height 1.625 /
  margin-top 8px`
- Divider: `border-top 1px solid var(--border-subtle) / margin-top
  16px / padding-top 12px`
- "적용 구간" label: `10px / weight 600 / uppercase / tracking-wider
  / var(--text-tertiary) / margin-right 4px`
- Segment chips: `<Badge size="sm" tone="neutral">A</Badge>`,
  gap 6px

---

## 5. Section 3 — Econometric Accordion

**`[LOCKED]`** List of method explainers (Cointegration, ECT, etc.).

### 5.1 Accordion item

| Property | Target |
|---|---|
| Border | `1px solid var(--border-default)` |
| Border-radius | `var(--r-md)` |
| Background | `var(--bg-surface)` |
| Overflow | `hidden` |
| Margin-bottom | `8px` (or use `<div className="space-y-2">`) |

### 5.2 Item header (button)

| Property | Target |
|---|---|
| Width | 100% |
| Padding | `16px 20px` (was `12px 16px`) |
| Background (resting) | `transparent` |
| Background (hover) | `var(--bg-subtle)` |
| Text-align | left |
| Transition | `background var(--motion-fast)` |

Layout: `flex / items-center / gap 12px`.

Content:
- **Title**: `14px / weight 600 / var(--text-primary)`
- **Summary** (one-line preview): `13px / var(--text-tertiary) /
  margin-left 12px / hidden on small screens`
- **Chevron-down**: 18px, `var(--text-tertiary)`, rotates on open,
  group-hover color → `var(--text-secondary)`

### 5.3 Item body (when open)

| Property | Target |
|---|---|
| Padding | `4px 20px 20px` |
| Border-top | `1px solid var(--border-subtle)` |
| Background | `var(--bg-subtle)` (slightly recessed) |

Body content:
- `<p>`: `14px / var(--text-secondary) / line-height 1.625`
- Code/formula (if present): `<code>` block with
  `font-family var(--font-mono) / background var(--bg-muted) /
  padding 2px 6px / radius var(--r-sm)`

### 5.4 Accordion expand transition

```css
overflow: hidden;
transition: max-height var(--motion-emph) var(--ease-emph);
/* JS sets max-height to scrollHeight on open, 0 on close */
```

Or simpler: instant show/hide is acceptable. Transition is polish.

---

## 6. Section 4 — ML Models Table

**`[LOCKED]`** Three columns: 모델 / 작동 원리 / 이 서비스에서의 역할.

### 6.1 Layout option (LOCKED: keep table form)

Table over cards — the comparison structure is the value here.

```html
<table>
  <thead>
    <tr>
      <th>모델</th>
      <th>작동 원리</th>
      <th>서비스 역할</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Isolation Forest</td>
      <td>...</td>
      <td>...</td>
    </tr>
    ...
  </tbody>
</table>
```

### 6.2 Table styles

```css
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
thead tr {
  border-bottom: 1px solid var(--border-default);
}
th {
  text-align: left;
  padding: 12px 16px 12px 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
tbody tr {
  border-bottom: 1px solid var(--border-subtle);
  transition: background var(--motion-fast);
}
tbody tr:hover {
  background: var(--bg-subtle);
}
tbody tr:last-child {
  border-bottom: none;
}
td {
  padding: 14px 16px 14px 0;
  vertical-align: top;
  font-size: 14px;
  line-height: 1.5;
}
td:first-child {
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
}
td:not(:first-child) {
  color: var(--text-secondary);
}
```

### 6.3 ML feature chips (below table)

| Property | Target |
|---|---|
| Container | `margin-top 24px / padding-top 16px / border-top 1px solid var(--border-default)` |
| Label | `ML 입력 피처 (6종, 전 품목 공통)`, `11px / weight 600 / uppercase / tracking-wider / var(--text-tertiary) / margin-bottom 8px` |
| Chip | `<Badge size="sm" tone="neutral">{feature}</Badge>` |
| Gap | `8px` between chips |

---

## 7. Section 5 — Confidence Grade Cards

**`[LOCKED]`** 3 grades (고신뢰 / 중신뢰 / 참고) as horizontal cards.

### 7.1 Card

```
┌───────────────────────────────────────────┐
│ ●  고신뢰   통계 + ML 동시 탐지     [paper]│
└───────────────────────────────────────────┘
```

| Property | Target |
|---|---|
| Padding | `16px 20px` |
| Background | `var(--bg-surface)` |
| Border | `1px solid var(--border-default)` |
| Border-radius | `var(--r-lg)` |
| Hover border | `var(--border-strong)` |
| Layout | flex-row, gap 16px, items-center |
| Transition | `border var(--motion-fast)` |

### 7.2 Grade dot (leading)

| Property | Target |
|---|---|
| Size | `12×12` (no pulse on this static page) |
| Shape | circle |
| Background | `var(--anomaly-{grade})` |

### 7.3 Content (middle, `flex: 1`)

Layout: `flex / items-baseline / gap 12px`.

- Grade label: `16px / weight 600 / var(--text-primary)` (e.g., `고신뢰`)
- Condition: `14px / var(--text-secondary)` (e.g., `통계 + ML 동시 탐지`)

### 7.4 Paper chip (trailing)

`<Badge size="sm" tone="neutral">{paper}</Badge>` — academic
reference. Hidden on screens below `sm` breakpoint via Tailwind
responsive class.

---

## 8. Section 6 — Data Sources Table

**`[LOCKED]`** Four columns: # / 소스 / 제공 기관 / 활용 단계.

Same table styles as §6.2 with adjustments:

```css
th, td {
  padding: 12px 16px;
}
td:first-child {
  font-family: var(--font-mono);
  color: var(--text-tertiary);
  width: 48px;
}
```

Number column is monospaced and quietened.

Wrap in overflow container for mobile:
```html
<div style="overflow-x: auto; margin: 0 -8px;">
  <table>...</table>
</div>
```

---

## 9. Loading & Error States (Section bodies)

### 9.1 LoadingSkeleton

**`[LOCKED]`** Replace pulse with shimmer.

```css
.skeleton {
  height: 16px;
  background: linear-gradient(
    90deg,
    var(--bg-subtle) 0%,
    var(--bg-muted) 50%,
    var(--bg-subtle) 100%
  );
  background-size: 200% 100%;
  border-radius: var(--r-sm);
  animation: shimmer 1.6s linear infinite;
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

Render 3 skeleton bars per loading section, widths varying
(`60%` / `85%` / `75%`).

### 9.2 ErrorBanner

```jsx
<div className="error-banner">
  <Icon name="alert" size={20} color="var(--error)" />
  <span>{message}</span>
</div>
```

Style:
| Property | Target |
|---|---|
| Padding | `12px 16px` |
| Background | `var(--error-subtle)` |
| Border | `1px solid var(--error-border)` |
| Border-radius | `var(--r-md)` |
| Layout | flex-row, gap 12px, items-start |
| Text | `14px / var(--error) / line-height 1.5` |

---

## 10. `PipelineFlowDiagram`

**`[LOCKED]`** SVG diagram of pipeline nodes + edges, rendered with
D3.

### 10.1 Constants

```ts
const NODE_W = 160;  // was 140
const NODE_H = 48;   // was 44
const PHASE_GAP = 96; // was 88
const NODE_GAP = 28;  // was 24
```

Larger nodes and more breathing room. Labels no longer truncate at
default zoom.

### 10.2 Node box

```ts
.attr('fill', 'var(--bg-surface)')
.attr('stroke', 'var(--border-default)')
.attr('stroke-width', 1)
.attr('rx', 10)              // was 6
```

### 10.3 Node hover

```ts
.on('mouseover', function() {
  const box = d3.select(this.parentNode).select('rect:first-child');
  box.attr('fill', 'var(--brand-subtle)')
     .attr('stroke', 'var(--brand)')
     .attr('stroke-width', 1.5);
})
.on('mouseout', function() {
  const box = d3.select(this.parentNode).select('rect:first-child');
  box.attr('fill', 'var(--bg-surface)')
     .attr('stroke', 'var(--border-default)')
     .attr('stroke-width', 1);
});
```

Brand-tint on hover. Background lifts subtly, border picks up brand
color. No color animation library — direct attribute change.

### 10.4 Node label

```ts
.attr('font-size', '13')              // was 12
.attr('font-family', 'var(--font-sans)')  // was 'sans-serif'
.attr('font-weight', '500')
.attr('fill', 'var(--text-primary)')      // was slate-200
```

### 10.5 Edges (connecting lines)

```ts
.attr('stroke', 'var(--border-strong)')    // was slate-600
.attr('stroke-width', 1.5)
.attr('stroke-linecap', 'round')
.attr('fill', 'none')
```

Arrowhead marker fill matches edge color.

### 10.6 Edge labels (data flow tags)

Pill-style:
```ts
// Label rect
.attr('fill', 'var(--bg-canvas)')
.attr('stroke', 'var(--border-default)')
.attr('stroke-width', 1)
.attr('rx', 10)

// Label text
.attr('font-size', '10')
.attr('font-family', 'var(--font-mono)')
.attr('fill', 'var(--text-tertiary)')
```

### 10.7 Click popover (node detail)

When a node is clicked, show a floating card adjacent to it.

| Property | Target |
|---|---|
| Width | `260px` (was `208px`) |
| Background | `var(--bg-surface)` |
| Border | `1px solid var(--border-default)` |
| Border-radius | `var(--r-lg)` |
| Shadow | `var(--e4)` |
| Padding | `16px` |
| Position | absolute, positioned by JS relative to node |
| z-index | `var(--z-dropdown)` |

Content:
- Header row: title (`14px / weight 600 / var(--text-primary)`) +
  close button (`<IconButton icon="x" size="sm" variant="ghost" />`)
- Body: `<p>` with `13px / var(--text-secondary) / line-height 1.625
  / margin-top 8px`

### 10.8 Version label (top-right of diagram)

| Property | Target |
|---|---|
| Position | absolute, `top: 12px right: 12px` |
| Padding | `4px 10px` |
| Background | `var(--bg-canvas)` |
| Border | `1px solid var(--border-default)` |
| Border-radius | `var(--r-sm)` |
| Font | `10px / weight 600 / uppercase / tracking-wider / var(--font-mono) / var(--text-tertiary)` |
| Pointer-events | none |
| z-index | `10` |
| Content | `v{version}` (with `v` prefix) |

---

## 11. Cross-Section Notes

### 11.1 Long-form prose line height

Body copy on this page uses `line-height: 1.625` (the most relaxed
value in the system). The page is content-dense and reads better
with extra breathing room than the chrome-heavy main views.

### 11.2 Smooth scroll between sections

If anchor links are added (future), enable:
```css
html { scroll-behavior: smooth; }
```

Not in current scope but cheap to drop in.

### 11.3 Print stylesheet

`[OPEN]` Whether to add a print-friendly stylesheet for this page
(stripped of chrome, single-column, no shadows). Out of immediate
scope but a natural fit for a methodology document.

---

## 12. Verification

- [ ] Page header H1 visible above section 1
- [ ] Number indicators are rounded squares with gradient + glow
- [ ] Pattern cards lift on hover
- [ ] Accordion chevron rotates smoothly
- [ ] Table rows highlight on hover (cursor stays default — not clickable rows)
- [ ] Grade cards show dot, label, condition, paper chip
- [ ] Pipeline diagram nodes lift on hover with brand color
- [ ] Edge labels render as pills, not bare text
- [ ] Version badge is monospaced uppercase pill
- [ ] LoadingSkeleton uses shimmer, not pulse
- [ ] ErrorBanner uses error subtle bg + icon, not red-900 dark scale
