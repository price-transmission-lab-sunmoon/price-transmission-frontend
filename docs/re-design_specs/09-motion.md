# 09 · Motion & Interaction

> Standards for hover, focus, transition, pulse/glow, drag, scroll,
> and reduced-motion behavior. The current implementation uses
> `transition-colors` almost exclusively, leaving the UI feeling
> static. The redesign introduces motion as a first-class signal —
> measured, never gratuitous.

---

## 1. Motion Tokens (from `01-design-tokens.md §15`)

```css
--motion-instant: 0ms;
--motion-fast:    100ms;  /* color hover */
--motion-default: 180ms;  /* dropdown, button state */
--motion-emph:    240ms;  /* modal enter, panel expand */
--motion-slow:    400ms;  /* hero entrance, bar fill */

--ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-emph:   cubic-bezier(0.2, 0.8, 0.2, 1);
```

Tailwind class mapping:
- `duration-100` → motion-fast
- `duration-200` → motion-default (rounded for Tailwind support)
- `duration-300` → motion-emph
- `duration-500` → motion-slow

---

## 2. Hover Standards (per element class)

### 2.1 Secondary button (default UI button)

```css
.btn-secondary {
  background: var(--bg-surface);
  color: var(--text-secondary);
  border: 1px solid var(--border-default);
  transition:
    background var(--motion-fast) var(--ease-out),
    border-color var(--motion-fast) var(--ease-out),
    transform var(--motion-fast) var(--ease-out);
}
.btn-secondary:hover {
  background: var(--bg-subtle);
  border-color: var(--border-strong);
  color: var(--text-primary);
}
.btn-secondary:active {
  background: var(--bg-muted);
  transform: scale(0.98);
}
```

### 2.2 Primary CTA (brand button)

```css
.btn-primary {
  background: var(--brand);
  color: var(--text-on-brand);
  box-shadow: var(--e2);
  transition: all var(--motion-default) var(--ease-out);
}
.btn-primary:hover {
  background: var(--brand-hover);
  box-shadow:
    0 4px 12px rgba(13, 148, 136, 0.32),
    0 1px 3px rgba(13, 148, 136, 0.18);
}
.btn-primary:active {
  background: var(--brand-active);
  transform: scale(0.98);
}
```

### 2.3 Ghost button (text-only)

```css
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  transition: background var(--motion-fast) var(--ease-out),
              color var(--motion-fast) var(--ease-out);
}
.btn-ghost:hover {
  background: var(--bg-subtle);
  color: var(--text-primary);
}
.btn-ghost:active {
  background: var(--bg-muted);
}
```

### 2.4 Clickable card

```css
.card-clickable {
  transition:
    border-color var(--motion-default) var(--ease-out),
    background var(--motion-default) var(--ease-out),
    box-shadow var(--motion-default) var(--ease-out),
    transform var(--motion-default) var(--ease-out);
  cursor: pointer;
}
.card-clickable:hover {
  border-color: var(--border-strong);
  background: var(--bg-surface);
  box-shadow: var(--e3);
  transform: translateY(-1px);
}
```

The lift (`translateY(-1px)`) is subtle but registers as "alive".
Reserved for cards that are genuinely clickable — info-only cards
do not lift.

### 2.5 Info card (no interaction)

```css
.card-static {
  /* no hover transition, no cursor change */
}
```

### 2.6 D3 chart node

```ts
// On mouseenter
d3.select(this)
  .transition()
  .duration(150)
  .ease(d3.easeCubicOut)
  .attr('r', baseRadius * 1.35)
  .attr('stroke-width', 2)
  .attr('stroke', 'rgba(255, 255, 255, 0.8)');

// On mouseleave
d3.select(this)
  .transition()
  .duration(120)
  .ease(d3.easeCubicOut)
  .attr('r', baseRadius)
  .attr('stroke-width', 0);
```

The white stroke creates visual separation from the line beneath.

### 2.7 Dropdown / list item

```css
.list-item {
  transition: background var(--motion-fast) var(--ease-out);
}
.list-item:hover {
  background: var(--bg-subtle);
}
.list-item--active {
  background: var(--brand-subtle);
  color: var(--brand-active);
}
.list-item--active:hover {
  background: var(--brand-subtle-2);
}
```

### 2.8 Anchor (link)

```css
a {
  color: var(--brand);
  text-underline-offset: 2px;
  text-decoration-thickness: 1px;
  transition: color var(--motion-fast) var(--ease-out);
}
a:hover {
  color: var(--brand-hover);
  text-decoration-color: currentColor;
}
```

---

## 3. Focus Standards (keyboard accessibility)

### 3.1 Universal focus ring

```css
*:focus { outline: none; }
*:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--bg-canvas),
    0 0 0 4px var(--brand);
  border-radius: inherit;
}
```

`:focus-visible` (not `:focus`) — appears only on keyboard nav, not
mouse click. The 2px offset ring on canvas color creates a visible
gap between the element border and the brand ring.

### 3.2 Slider / range input thumb focus

```css
input[type="range"]:focus-visible::-webkit-slider-thumb {
  box-shadow:
    0 0 0 2px var(--bg-canvas),
    0 0 0 4px var(--brand);
}
```

### 3.3 D3 chart node keyboard access

`[OPEN]` Whether to wire SVG circles as keyboard-focusable.
Suggested implementation:

```ts
nodes
  .attr('tabindex', 0)
  .attr('role', 'button')
  .attr('aria-label', d => `이상 탐지: ${d.period} ${gradeLabel(d.grade)}`)
  .on('focus', function() {
    d3.select(this)
      .attr('stroke', 'var(--brand)')
      .attr('stroke-width', 2);
  })
  .on('blur', function() {
    d3.select(this)
      .attr('stroke', null)
      .attr('stroke-width', 0);
  })
  .on('keydown', function(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      // trigger same handler as click
    }
  });
```

Substantial work — flag as `[OPEN]` because it touches keyboard
navigation across all chart nodes simultaneously. Defer if not in
sprint scope.

### 3.4 Skip-to-content link

`[OPEN]` Add a visually-hidden skip link as first child of `<body>`:

```html
<a href="#main-content" class="skip-link">메인으로 건너뛰기</a>
```

```css
.skip-link {
  position: absolute;
  top: -40px; left: 0;
  background: var(--brand);
  color: var(--text-on-brand);
  padding: 8px 16px;
  z-index: 9999;
  transition: top var(--motion-fast);
}
.skip-link:focus {
  top: 0;
}
```

Accessibility standard; cheap to add. Defer if scope-constrained.

---

## 4. Transition Duration & Easing (per scenario)

| Scenario | Duration | Easing |
|---|---|---|
| Color hover | 100ms | ease-out |
| Background hover | 150–200ms | ease-out |
| Transform (scale, translate) | 200–250ms | ease-out |
| Modal enter | 240ms | ease-emph |
| Modal exit | 150ms | ease-in |
| Dropdown open | 200ms | ease-out |
| Dropdown close | 150ms | ease-in |
| Panel width drag | none (immediate) | — |
| Chart data transition | 800ms | ease-out (D3 default) |
| Sidebar expand/collapse | 240ms | ease-emph |
| Accordion expand | 240ms | ease-emph |
| Toast slide-in | 240ms | ease-emph |
| Toast dismiss | 150ms | ease-in |
| Bar fill (MlBarRow) | 400ms | ease-out |
| Loading spinner | 1000ms (one rotation) | linear |
| Shimmer | 1600ms | linear |
| Anomaly pulse | 1800ms | ease-in-out |
| Live indicator pulse | 2000ms | ease-in-out |

### 4.1 StreamChart contract reminder

From `docs/CLAUDE.md`: no `transition` after zoom completion. The
zoom updates Y-axis and node positions immediately, never animates
back. Preserved verbatim.

---

## 5. Pulse / Glow Patterns

### 5.1 Live data indicator (FreshnessChip)

```css
@keyframes live-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.5); }
  50%      { box-shadow: 0 0 0 6px rgba(22, 163, 74, 0); }
}
.live-indicator {
  animation: live-pulse 2s ease-in-out infinite;
}
```

Expanding-ring effect. Period 2s — ambient, not distracting.

### 5.2 Anomaly node pulse (high grade)

```css
@keyframes anomaly-pulse-high {
  0%, 100% { transform: scale(1);    opacity: 0.6; }
  50%      { transform: scale(1.7);  opacity: 0; }
}
.anomaly-pulse-high {
  animation: anomaly-pulse-high 1.8s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: center;
}
```

Applied to a separate "pulse halo" `<circle>` element behind the
main dot. Scales and fades simultaneously. `transform-box:
fill-box` makes scale center on the circle itself, not the SVG
root.

### 5.3 Onboarding spotlight pulse

```css
@keyframes onboarding-pulse {
  0%, 100% {
    outline-color: var(--brand);
    outline-width: 2.5px;
  }
  50% {
    outline-color: rgba(13, 148, 136, 0.5);
    outline-width: 4.5px;
  }
}
.onboarding-spotlight {
  animation: onboarding-pulse 1.8s ease-in-out infinite;
}
```

### 5.4 ML bar glow (high score only)

Applied at render time when `score >= 0.8`:

```css
box-shadow: 0 0 8px <bar-color>40;
```

Where `40` is hex alpha (~25%). Not animated — static glow signals
"this is the high-score model".

### 5.5 Anti-patterns (DO NOT USE)

- **NEW badge blinking** — opacity flicker on the NEW marker. Adds
  cognitive load without information gain.
- **Continuous color cycling** — never animate hue. Reserved for
  loading-progress only.
- **Whole-card bobbing** — restless. Reserve transform animations
  for explicit user interaction.

---

## 6. Drag Interactions

### 6.1 Panel resize handle

```tsx
const onMouseDown = useCallback((e: React.MouseEvent) => {
  isDragging.current = true;

  // Apply cursor to entire document so it persists when mouse
  // leaves the narrow handle
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';

  const onMouseMove = (ev: MouseEvent) => {
    const newWidth = clamp(window.innerWidth - ev.clientX, 280, 520);
    setPanelWidth(newWidth);
  };

  const onMouseUp = () => {
    isDragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}, [setPanelWidth]);
```

Document-level cursor lock prevents the cursor from flipping back
to default when the user accidentally drags outside the handle
strip.

### 6.2 Handle visual states

| State | Style |
|---|---|
| Resting | transparent background |
| Hover | `background: var(--brand)` at 30% alpha |
| Active (dragging) | `background: var(--brand)` at 60% alpha |
| Hover hint (centered pill) | `4×40 / var(--brand) / radius var(--r-pill) / opacity 0 → 1` on parent hover |

```css
.drag-handle {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  cursor: col-resize;
  transition: background var(--motion-fast) var(--ease-out);
}
.drag-handle:hover {
  background: rgba(13, 148, 136, 0.3);
}
.drag-handle:active {
  background: rgba(13, 148, 136, 0.6);
}
.drag-handle__hint {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 4px; height: 40px;
  background: var(--brand);
  border-radius: var(--r-pill);
  opacity: 0;
  transition: opacity var(--motion-fast) var(--ease-out);
  pointer-events: none;
}
.drag-handle:hover .drag-handle__hint {
  opacity: 1;
}
```

### 6.3 Minimap brush drag

D3 brush behavior. Handle visual: 4×16 pill in brand color, cursor
`col-resize` on horizontal handles. Brand styling already covered in
`05-main-views.md §5.4`.

---

## 7. Scroll Behavior

### 7.1 Smooth scroll

```css
html {
  scroll-behavior: smooth;
}
```

Applies to anchor navigation and `element.scrollIntoView()` calls.

**Caveat**: do NOT use `scrollIntoView()` in production code per
project conventions. If smooth-scroll-to-element is needed, use
`element.scrollTo({ top, behavior: 'smooth' })` on the
container.

### 7.2 Custom scrollbar (Webkit + Firefox)

Light-theme scrollbar:

```css
/* Webkit */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(168, 162, 152, 0.4);  /* --text-muted at 40% */
  border-radius: 5px;
  border: 2px solid transparent;
  background-clip: content-box;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(120, 115, 106, 0.55); /* --text-tertiary at 55% */
  background-clip: content-box;
}

/* Firefox */
* {
  scrollbar-width: thin;
  scrollbar-color: rgba(168, 162, 152, 0.4) transparent;
}
```

The transparent border + `background-clip: content-box` creates
visual padding around the thumb without changing the track size.
The track is fully transparent — only the thumb is visible.

---

## 8. Interaction State Visualization (summary table)

| State | Visual signal | Motion |
|---|---|---|
| Default | base color, base shadow | none |
| Hover | bg or border shift, optional lift | 100–200ms ease-out |
| Focus (keyboard) | brand ring (4px) | none (instant) |
| Active (press) | darker bg, optional scale(0.98) | 100ms |
| Disabled | muted bg + disabled text + cursor | none |
| Loading | spinner / dots / shimmer | 1–2s loop |
| Selected | brand bg + brand text + border | 180ms ease-out |
| Drag (active) | brand-color handle | 100ms color |
| Live | success dot + pulse | 2s loop |

---

## 9. Keyboard Shortcuts (current state + recommended)

### 9.1 Already implemented

- `Esc` → close `HelpModal`
- `Esc` → close dropdowns (browser default for popovers)
- `Tab` → focus traversal (default)

### 9.2 Recommended additions

- `Esc` → close `OnboardingGuide` (NEW — see `07-overlays.md §3.7`)
- `←` / `→` → step through `OnboardingGuide` (NEW, optional)
- `?` → open HelpModal (NEW, optional)
- `[` / `]` → toggle Panel collapse/expand (NEW, optional)

The optional additions should be documented in the HelpModal's
keyboard-shortcuts accordion item (see `07-overlays.md §2.6`).

---

## 10. Reduced-Motion Compliance

**`[LOCKED]`** Mandatory. Add to `src/index.css` (or wherever
globals live):

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### 10.1 Exceptions

Some pulses convey information, not decoration. For those, override
back to visible (but slower):

```css
@media (prefers-reduced-motion: reduce) {
  .live-indicator,
  .anomaly-pulse-high {
    animation-duration: 0.01ms !important;
    /* Static visible state */
    box-shadow: 0 0 0 2px currentColor !important;
  }
}
```

The static-state-instead-of-animation tradeoff: live data dot has
a permanent ring (no pulse); anomaly high node has a permanent
larger glow (no expanding pulse). Information preserved, motion
removed.

---

## 11. Verification

- [ ] All buttons have hover bg/color change with `var(--motion-fast)`
- [ ] Primary CTA has hover lift + brand color shadow
- [ ] All interactive elements have `:focus-visible` brand ring
- [ ] Cards that aren't clickable have NO hover effects
- [ ] D3 chart nodes scale on hover with transition
- [ ] FreshnessChip dot pulses every 2s
- [ ] StreamChart `high` anomaly nodes pulse every 1.8s
- [ ] Panel drag handle changes color on hover and active drag
- [ ] Document cursor stays `col-resize` while dragging panel
- [ ] Scrollbars are warm-tinted, thin, transparent track
- [ ] `prefers-reduced-motion: reduce` disables all animations
- [ ] StreamChart zoom does NOT transition (rev.6 contract)
- [ ] No `transition-all` anywhere — explicit property lists only
