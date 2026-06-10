# 07 · Overlays

> Floating chrome that sits above the main canvas: `HelpModal` ·
> `OnboardingGuide` · `HelpFloatingButton` · `Toast` ·
> `ErrorBoundary`. Five components, shared concerns: z-index,
> backdrop, enter/exit motion, dismiss interactions.

---

## 1. Shared Standards

### 1.1 Z-Index (from `01-design-tokens.md §16`)

```ts
HEADER:              50
PANEL:              100
DROPDOWN:           200
CHART_TOOLTIP:     1000
OVERLAY:           7000   // FAB
MODAL_OVERLAY:     8000
MODAL_CONTENT:     8001
ONBOARDING_OVERLAY:  8500
ONBOARDING_SPOTLIGHT:8501
ONBOARDING_TOOLTIP:  8502
TOAST:             9000
```

Every overlay reads from this table. No inline `zIndex: NNNN`
literals.

### 1.2 Enter / Exit Motion

```css
@keyframes overlay-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes overlay-content-in {
  from { opacity: 0; transform: scale(0.96) translateY(8px); }
  to   { opacity: 1; transform: scale(1)    translateY(0); }
}
@keyframes toast-slide-in {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

.overlay-fade-in    { animation: overlay-fade-in 200ms var(--ease-out); }
.overlay-content-in { animation: overlay-content-in 240ms var(--ease-emph); }
.toast-slide-in     { animation: toast-slide-in 240ms var(--ease-emph); }
```

### 1.3 Backdrop dim levels

| Overlay | Dim |
|---|---|
| HelpModal | `rgba(28, 24, 18, 0.55)` + `backdrop-filter: blur(4px)` |
| OnboardingGuide | `box-shadow: 0 0 0 9999px rgba(28, 24, 18, 0.6)` |
| Dropdowns | none (click outside only) |
| Chart hover tooltips | none |

Warm-tinted dim (#1c1812 family) so it doesn't read as cold gray
on the warm canvas.

### 1.4 Dismiss Interactions

| Overlay | Triggers |
|---|---|
| HelpModal | `✕` button / `Esc` key / backdrop click |
| OnboardingGuide | `✕` button / "건너뛰기" link / `Esc` key / backdrop click (outside spotlight) |
| Toast | `✕` button / 8s auto-dismiss / clicking the toast |
| Dropdown | click outside / `Esc` / item selection |

`Esc` handler must be registered on the document with cleanup. Use
`useEffect` with `[visible]` dependency.

---

## 2. `HelpModal`

**`[LOCKED]`**

### 2.1 Backdrop

```jsx
<div
  className="overlay-fade-in"
  style={{
    position: 'fixed', inset: 0,
    background: 'rgba(28, 24, 18, 0.55)',
    backdropFilter: 'blur(4px)',
    zIndex: Z_INDEX.MODAL_OVERLAY,
  }}
  onClick={onClose}
/>
```

### 2.2 Content container

```jsx
<div
  className="overlay-content-in"
  style={{
    position: 'fixed', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px',
    pointerEvents: 'none',
    zIndex: Z_INDEX.MODAL_CONTENT,
  }}
>
  <div onClick={(e) => e.stopPropagation()} style={{ pointerEvents: 'auto', ... }}>
    ...
  </div>
</div>
```

Inner card:
| Property | Target |
|---|---|
| Width | full, `max-width: 640px` (was `512px`) |
| Max-height | `85vh` (was `80vh`) |
| Background | `var(--bg-surface)` |
| Border | `1px solid var(--border-default)` |
| Border-radius | `var(--r-xl)` (`16px`) |
| Shadow | `var(--e5)` |
| Layout | flex-col |

### 2.3 Header

| Property | Target |
|---|---|
| Padding | `20px 24px` (was `16px 20px`) |
| Border-bottom | `1px solid var(--border-default)` |
| Layout | flex / justify-between / items-center |

Left:
- Title `<h2>`: `도움말` — `18px / weight 700 / letter-spacing -0.01em / var(--text-primary)`
- Subtitle: `서비스 사용 안내` — `12px / var(--text-tertiary) / margin-top 2px`

Right:
- Close: `<IconButton icon="x" size="md" variant="ghost" />`,
  36×36

### 2.4 Body (scroll container)

| Property | Target |
|---|---|
| Padding | `8px 16px 16px` |
| Overflow-y | auto |
| Flex | `1` |

### 2.5 Accordion item

| Property | Target |
|---|---|
| Border-bottom | `1px solid var(--border-subtle)` |
| Last child | no border |

**Header (button)**:
| Property | Target |
|---|---|
| Padding | `16px 8px` |
| Background hover | `var(--bg-subtle)` |
| Border-radius | `var(--r-md)` |

Content:
- Title: `14px / weight 500 / var(--text-primary)`
- Chevron-down: 18px, rotates 180° on open, transition var(--motion-default)

**Body** (when expanded):
| Property | Target |
|---|---|
| Padding | `4px 8px 20px` |
| Font | `14px / var(--text-secondary) / line-height 1.625` |
| White-space | `pre-line` (preserve newlines from content) |

### 2.6 Suggested keyboard shortcuts item (NEW)

Add a final accordion item:

```
키보드 단축키
  Esc       — 모달 · 온보딩 닫기
  Tab       — 다음 요소로 포커스
  Enter / Space — 버튼 활성
  ←  →      — (방법론 페이지) 섹션 이동
```

Use a `<table>` with two columns: shortcut (mono font, bg subtle)
and description. Keep brief.

---

## 3. `OnboardingGuide`

**`[LOCKED]`** Step-through walkthrough with spotlight and tooltip.

### 3.1 Backdrop (spotlight cut-out)

Implementation pattern unchanged — `box-shadow: 0 0 0 9999px <dim>`
on a transparent rect positioned over the highlighted element.
Dim color updated:

```css
boxShadow: 0 0 0 9999px rgba(28, 24, 18, 0.6);
borderRadius: 4px;
```

### 3.2 Spotlight outline

| Property | Target |
|---|---|
| Outline | `2.5px solid var(--brand)` |
| Outline-offset | `2px` |
| Animation | `onboarding-pulse 1.8s ease-in-out infinite` |
| z-index | `Z_INDEX.ONBOARDING_SPOTLIGHT` |
| pointer-events | none |

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
```

### 3.3 Tooltip

| Property | Target |
|---|---|
| Position | absolute, calculated relative to spotlight |
| Width | `360px` |
| Background | `var(--bg-surface)` |
| Border | `1px solid var(--border-default)` |
| Border-radius | `var(--r-lg)` (12px) |
| Shadow | `var(--e5)` |
| Padding | `20px` |
| z-index | `Z_INDEX.ONBOARDING_TOOLTIP` |
| Animation | `overlay-content-in` |

### 3.4 Tooltip header (step indicator + progress)

```
단계 1/4              ▬ ▬ ━━ ━━
```

Layout: `flex / justify-between / items-center / margin-bottom 12px`.

Left:
- `단계 N/4`: `11px / weight 700 / uppercase / tracking-wider / var(--brand)`

Right (progress bars):
- 4 bars, gap 4px
- Each: `width 24px / height 3px / radius var(--r-pill)`
- Completed/current: `var(--brand)`
- Future: `var(--bg-muted)`

### 3.5 Body

Main text:
- `14px / var(--text-primary) / line-height 1.625 / margin-bottom 20px`

### 3.6 Footer

Layout: `flex / justify-between / items-center / gap 8px`.

Left:
- "건너뛰기" link button
- `12px / var(--text-tertiary) / underline-offset 2px`
- Hover: `color var(--text-secondary)`

Right (button group, `flex / gap 8px`):
- "이전" (only when step > 1): `<Button variant="secondary" size="sm">이전</Button>`
- "다음" or "완료": `<Button variant="primary" size="sm">{step < 4 ? '다음' : '완료'}</Button>`

### 3.7 `Esc` key handler (NEW)

The current implementation has no Esc dismiss. Add:

```tsx
useEffect(() => {
  if (!isOnboardingVisible) return;
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') completeOnboarding();
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [isOnboardingVisible, completeOnboarding]);
```

---

## 4. `HelpFloatingButton`

**`[LOCKED]`** Bottom-right floating action button.

| Property | Target |
|---|---|
| Position | `fixed / right: 24px / bottom: 24px` |
| Width | `48×48` |
| Border-radius | 50% |
| Background | `var(--brand)` |
| Color | `var(--text-on-brand)` |
| Shadow | `0 8px 24px rgba(13, 148, 136, 0.32), 0 2px 6px rgba(13, 148, 136, 0.18)` (brand color shadow) |
| z-index | `Z_INDEX.OVERLAY` |
| Cursor | pointer |
| Transition | `all var(--motion-default) var(--ease-out)` |
| Layout | flex / center / center |

Content: `<Icon name="help" size={22} />`. Replaces the bare `?`
character.

### 4.1 Hover

```css
transform: scale(1.06);
background: var(--brand-hover);
box-shadow:
  0 12px 32px rgba(13, 148, 136, 0.4),
  0 4px 8px rgba(13, 148, 136, 0.22);
```

### 4.2 Active (click)

```css
transform: scale(0.96);
```

### 4.3 Accessibility

`aria-label="도움말"` always present. Visible focus ring on
keyboard nav (use `:focus-visible` from `09-motion.md`).

---

## 5. `Toast`

**`[LOCKED]`** Notification stack, bottom-right.

### 5.1 Container

```jsx
<div
  style={{
    position: 'fixed', bottom: 24, right: 24,
    display: 'flex', flexDirection: 'column', gap: 12,
    pointerEvents: 'none',
    zIndex: Z_INDEX.TOAST,
  }}
>
  {toasts.map(t => <ToastCard key={t.id} {...t} />)}
</div>
```

### 5.2 Toast card

| Property | Target |
|---|---|
| Padding | `14px 16px` |
| Max-width | `400px` (full at min `320px`) |
| Background | `var(--bg-surface)` |
| Border | `1px solid <variant border>` |
| Border-radius | `var(--r-lg)` (12px) |
| Shadow | `var(--e4)` |
| Pointer-events | `auto` |
| Animation | `toast-slide-in 240ms var(--ease-emph)` |
| Layout | flex-row / items-start / gap 12px |

### 5.3 Variant colors

| Variant | Icon | Border | Title color |
|---|---|---|---|
| `info` | `info` | `var(--border-default)` | `var(--text-primary)` |
| `success` | `check` | `var(--success-border)` | `var(--success)` |
| `warning` | `alert` | `var(--warning-border)` | `var(--warning)` |
| `error` | `alert` | `var(--error-border)` | `var(--error)` |

The Toast background stays `var(--bg-surface)` (white) regardless of
variant — variant identity comes from border + icon, not background
fill. Light-theme toasts read better as "white card with colored
accent" than "fully tinted card".

### 5.4 Layout inside card

- **Icon** (`20px`, variant color, `margin-top: 1px / flex-shrink: 0`)
- **Body** (`flex: 1`):
  - Title (optional): `13px / weight 600 / <title color>`
  - Message: `13px / var(--text-secondary) / line-height 1.5 /
    margin-top 2px`
- **Retry button** (optional): `<Button variant="ghost" size="sm">재시도</Button>`,
  no border, slightly bolder
- **Close**: `<IconButton icon="x" size="sm" variant="ghost" />`,
  28×28

### 5.5 Behavior

- Auto-dismiss after `8000ms` (variant default)
- Stack new toasts at top (most recent visible first)
- Max 5 concurrent — oldest auto-dismissed when 6th appears
- Hover any toast: pause auto-dismiss timer
- Mouse leaves: resume timer

---

## 6. `ErrorBoundary` Fallback

**`[LOCKED]`** Empty-state-style fallback for caught render errors.

```
                  ┌───────────────┐
                  │      ⚠️       │     ← icon
                  └───────────────┘

           예기치 못한 오류가 발생했습니다
        페이지를 새로고침하거나 잠시 후
        다시 시도해주세요. 문제가 계속되면
              관리자에게 문의하세요.

              [페이지 새로고침]
```

| Property | Target |
|---|---|
| Container | flex-col / center / center / gap 16px / padding 32px / text-align center |

Children:

1. **Icon container**:
   - `64×64 / rounded-full / background var(--error-subtle) /
     border 1px solid var(--error-border) / flex center`
   - Icon: `alert` at 32px, `color var(--error)`

2. **Title** (`<h2>`):
   - `16px / weight 600 / var(--text-primary)`

3. **Body** (`<p>`):
   - `14px / var(--text-secondary) / line-height 1.625 / max-width 480px`

4. **Action**:
   - `<Button variant="primary" size="md" onClick={() => window.location.reload()}>
       페이지 새로고침
     </Button>`
   - `margin-top 8px`

### 6.1 Optional dev info

In `process.env.NODE_ENV === 'development'`:
- Below the action, render a `<details>` block with
  `<summary>Error details</summary>` and a `<pre>` of the error
  stack
- Container: `padding 12px / background var(--bg-subtle) / border
  1px solid var(--border-default) / radius var(--r-md) / font-mono
  11px / color var(--text-tertiary)`
- Production: never render this

---

## 7. Toast Helper API (existing pattern, kept)

The existing `showToast()` API stays the same. Wrap the underlying
component changes in the same call signature:

```ts
showToast({
  message: '데이터를 불러오지 못했습니다',
  variant: 'error',
  onRetry: () => refetch(),
  duration: 8000,  // optional override
});
```

The RawPricesChart's inline-toast for layout-switch announcements
should migrate to use this helper rather than its own JSX
implementation. **`[OPEN]`** Whether to perform that migration as
part of redesign or defer — implementer's call.

---

## 8. Cross-Overlay Notes

### 8.1 Body-scroll lock when modal open

When `HelpModal` or `OnboardingGuide` opens:

```ts
useEffect(() => {
  if (!open) return;
  const prev = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  return () => { document.body.style.overflow = prev; };
}, [open]);
```

### 8.2 Focus trap

`[OPEN]` Whether to implement focus trap (keep keyboard focus
inside open modal). Not strictly required for the redesign — the
current behavior is unchanged. If implemented, use a simple loop
over `tabindex` elements within the modal root.

### 8.3 ARIA roles

- `<div role="dialog" aria-modal="true" aria-labelledby="modal-title">`
- Toast container: `<div role="region" aria-label="알림" aria-live="polite">`
- Each toast: `role="alert"` for error/warning, `role="status"` for info/success

---

## 9. Verification

- [ ] HelpModal opens with backdrop blur, dim is warm-tinted
- [ ] HelpModal `Esc` and backdrop-click both dismiss
- [ ] HelpModal accordion chevrons rotate, body text uses 14px
- [ ] OnboardingGuide spotlight outline is brand teal + pulses
- [ ] OnboardingGuide tooltip shows step counter + progress bars
- [ ] OnboardingGuide `Esc` key dismisses (NEW)
- [ ] HelpFloatingButton has brand color shadow, scales on hover
- [ ] Toast variants: white card, colored border + icon (not
      tinted background)
- [ ] Toast `close` button has hover affordance
- [ ] Toast hover pauses auto-dismiss timer
- [ ] ErrorBoundary fallback has icon + title + body + reload
      button
- [ ] All z-indexes use `Z_INDEX.*` tokens, no inline literals
