# 01 · Design Tokens

> Color · typography · spacing · radius · shadow · motion · z-index.
> All values are calibrated for light theme on warm-white canvas.
> Define these once, reference them everywhere.

---

## 1. Where to Define

**`[OPEN]`** Choose one of:

- (a) Extend `src/utils/colorUtils.ts` with new token groups
      (`BRAND`, `SEMANTIC`, `NEUTRAL`, etc.)
- (b) Create `src/utils/theme.ts` and import from there
- (c) Tailwind `theme.extend` in `tailwind.config.ts`
- (d) CSS custom properties on `:root` in `src/index.css`

The recommended split: (c) Tailwind extend for utility-class access,
(d) CSS variables for runtime-readable values that components need
to inline (D3 attrs, JS computed). Either way, one definition file,
no duplicates.

---

## 2. Color · Background (Warm White Scale)

**`[LOCKED]`** Stone-family warm whites. No pure white as canvas.

| Token | Hex | Use |
|---|---|---|
| `--bg-canvas` | `#faf8f4` | Page outermost background (root, body) |
| `--bg-surface` | `#ffffff` | Cards, panels, modals — elevated above canvas |
| `--bg-subtle` | `#f5f1ea` | Hover state, section dividers, code blocks |
| `--bg-muted` | `#ede8de` | Input field bg, badge bg, disabled fill |
| `--bg-inverse` | `#1a1814` | Tooltips, dark inverse surfaces |

Canvas is warm cream; surface is pure white for crispness against
canvas. Cards float visibly without heavy shadow.

---

## 3. Color · Text (Warm Near-Black Scale)

**`[LOCKED]`** Warm near-black, never pure black. Contrast measured
against `--bg-canvas` (#faf8f4).

| Token | Hex | Contrast | Use |
|---|---|---|---|
| `--text-primary` | `#1a1814` | 14.8 ✓ | H1, body, primary content |
| `--text-secondary` | `#4a463e` | 8.6 ✓ | Labels, body 2 |
| `--text-tertiary` | `#78736a` | 4.7 ✓ | Captions, meta, secondary labels |
| `--text-muted` | `#a8a298` | 2.8 | Decorative only — separators (`·`), placeholders |
| `--text-disabled` | `#c8c4ba` | 1.9 | Disabled state only |
| `--text-on-brand` | `#ffffff` | — | On `--brand` background |

Rule: do not use `--text-muted` or below for any content that must be
read. Body copy starts at `--text-secondary`.

---

## 4. Color · Border

**`[LOCKED]`** Warm-tinted neutrals.

| Token | Hex | Use |
|---|---|---|
| `--border-subtle` | `#f0ebe1` | Hairlines inside cards (e.g., StatRow dividers) |
| `--border-default` | `#e7e2d8` | Card borders, dividers, input borders |
| `--border-strong` | `#d4cec1` | Hover borders, emphasized dividers |

---

## 5. Color · Brand (Teal Scale)

**`[LOCKED]`** Teal anchored on `#0d9488` (teal-600 in Tailwind).

| Token | Hex | Use |
|---|---|---|
| `--brand` | `#0d9488` | Primary brand, CTA, active tab, focus ring |
| `--brand-hover` | `#0f766e` | Hover state on primary |
| `--brand-active` | `#115e59` | Pressed / selected text on brand-subtle bg |
| `--brand-subtle` | `#f0fdfa` | Filled active tabs, soft highlight bg |
| `--brand-subtle-2` | `#ccfbf1` | Slightly stronger fill (minimap brush) |
| `--brand-border` | `#99f6e4` | Border on `--brand-subtle` surfaces |

All "active" / "selected" / "current" UI states use the brand teal —
not slate, not blue, not the anomaly red.

---

## 6. Color · Semantic

**`[LOCKED]`** Aligned with anomaly grades for cross-reference.

| Token | Hex | Subtle bg | Border | Use |
|---|---|---|---|---|
| `--success` | `#16a34a` | `#f0fdf4` | `#bbf7d0` | Live indicator, check passed, freshness dot |
| `--warning` | `#d97706` | `#fffbeb` | `#fde68a` | NEW badge, NOT_IMPL notice, pending |
| `--error` | `#dc2626` | `#fef2f2` | `#fecaca` | Error toast, failed step, destructive |
| `--info` | `#0d9488` | `#f0fdfa` | `#99f6e4` | Generic info — alias of brand |

`--success` is **not** brand. Brand stays teal; success is green so
"live data" and "current selection" stay visually distinct.

---

## 7. Color · Anomaly Grades

**`[LOCKED]`** Three-tier confidence color. Calibrated for light
canvas — same hue family as the dark version but darker shades for
contrast.

| Grade | Color | Subtle bg | Border |
|---|---|---|---|
| `high` | `#dc2626` | `#fef2f2` | `#fecaca` |
| `medium` | `#d97706` | `#fffbeb` | `#fde68a` |
| `reference` | `#0891b2` | `#ecfeff` | `#a5f3fc` |

**`[LOCKED]`** Note: `reference` is **cyan-600 (`#0891b2`)**, not
lime/green. Lime fails contrast on warm-white canvas and clashes
with `--success`. Cyan distinguishes reference from medium (amber)
and from success (green) cleanly.

`--success` (green) and `--anomaly-medium` (amber) are intentionally
distinct hues so success ≠ medium-confidence anomaly.

---

## 8. Typography · Font Family

**`[LOCKED]`** Pretendard for all UI, JetBrains Mono for numerics.

```css
--font-sans: 'Pretendard', 'Pretendard Variable', -apple-system,
             BlinkMacSystemFont, system-ui, 'Apple SD Gothic Neo',
             sans-serif;
--font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo,
             Consolas, monospace;
```

**`[OPEN]`** Loading method. Three valid options:

- (a) CDN `<link>` in `index.html` (Pretendard from jsdelivr,
      JetBrains from Google Fonts) — simplest, no build change
- (b) `@import` at the top of `src/index.css` — same effect, no
      HTML edit
- (c) npm self-host (`pretendard` package + `@fontsource/jetbrains-mono`)
      and bundle — best caching, requires build wiring

Pick whichever matches the project's existing font-loading pattern
(if any). If none, (a) is fastest to ship.

When applied to UI, use `--font-mono` for: every number (statistics,
scores, axis ticks, dates in `YYYY-MM` form, version strings,
percentages). Use `--font-sans` for everything else including labels
adjacent to numbers.

---

## 9. Typography · Type Scale

**`[LOCKED]`** Seven-step scale. Names map to semantic role, not size.

| Token | Size / Line-height | Weight | Use |
|---|---|---|---|
| `display` | 28 / 36 | 700 | Page H1 (Methodology, main view title) |
| `heading` | 18 / 24 | 600 | Section card title (Methodology sections) |
| `subhead` | 14 / 20 | 600 | Panel headers, modal titles, dropdown groups |
| `body` | 14 / 20 | 400 | Body copy, descriptions |
| `caption` | 13 / 18 | 400 | Secondary copy, help text |
| `micro` | 12 / 16 | 500 | Inline labels, badge text, button labels |
| `nano` | 11 / 14 | 600 | Uppercase tracking-wider category headers, chips |

Letter-spacing: `display` / `heading` use `letter-spacing: -0.01em`
(tight). `nano` uses `letter-spacing: 0.08em` with `uppercase`.

Forbidden: any size below 11px. The current `text-[8px]` /
`text-[9px]` usages must be removed (substitute `nano` for tight
chips, or rework layout).

---

## 10. Typography · Font Weight

**`[LOCKED]`**

| Token | Weight | Use |
|---|---|---|
| Regular | 400 | Body |
| Medium | 500 | Labels, buttons, inactive nav |
| Semibold | 600 | Section headers, badges, active nav, emphasis |
| Bold | 700 | Display, brand name, NEW marker, step numbers |

No use of weight 300 (light) or 800+ (extra-bold).

---

## 11. Typography · Line Height

**`[LOCKED]`** Implicit in §9. Explicit override classes:

| Use | Value |
|---|---|
| Headings | 1.25 (tight) |
| Body | 1.5 |
| Long-form prose (Methodology body) | 1.625 (relaxed) |
| UI labels | 1.4 |
| Single-line (chip, button, icon) | 1 |

---

## 12. Spacing

**`[LOCKED]`** Tailwind 4px base scale unchanged. Component minimum
paddings raised — the current design uses `py-0.5` / `gap-1` heavily,
which is the primary cause of the cramped feel.

| Component | Min padding | Was |
|---|---|---|
| Button (compact, `sm`) | `h-7 px-3` (28×12) | unchanged |
| Button (default, `md`) | `h-8 px-4` (32×16) | typically `px-3` |
| Button (large, `lg`) | `h-10 px-5` (40×20) | n/a |
| Input | `h-9 px-3` | n/a |
| Generic card | `p-4` (16) | often `p-3` |
| Section card (Methodology) | `p-5` or `p-6` | `p-5` |
| Modal body | `p-5` or `p-6` | `p-4` |
| Dropdown item | `px-3 py-2` | `py-1.5` |
| Badge | `px-2 py-0.5` | unchanged |
| Panel header | `px-5 py-4` | `px-4 py-3` |
| Panel section body | `px-4 py-3` | `px-3 py-2` |
| Component group gap | `gap-3` (12) min | often `gap-1` |
| Card group gap | `gap-4` (16) min | `gap-2` |

Banned in body content: `py-0.5`, `gap-0.5`. Reserved for icon
alignment only.

---

## 13. Radius

**`[LOCKED]`** Four-tier radius system.

| Token | Px | Use |
|---|---|---|
| `--r-sm` | 6 | Badges, chips, small toggles, dropdown items |
| `--r-md` | 8 | Buttons, inputs, generic cards, dropdowns |
| `--r-lg` | 12 | Section cards, panel cards, modals (small) |
| `--r-xl` | 16 | Large cards, hero containers, modals (large) |
| `--r-pill` | 9999 | Status dots, switch handles, brush handles |

Rule: nested elements step down one tier from their parent. Modal
(`--r-xl`) contains buttons (`--r-md`). Panel section card
(`--r-lg`) contains stat rows (`--r-sm`).

---

## 14. Shadow (Elevation)

**`[LOCKED]`** Light-mode elevation. Warm-tinted shadow color
(`rgba(28, 24, 18, *)` matches `--text-primary` hue at low alpha),
two-layer for crispness.

| Token | Value | Use |
|---|---|---|
| `--e1` | `0 1px 2px rgba(28,24,18,.04), 0 1px 1px rgba(28,24,18,.06)` | Cards, banner chips, freshness chip |
| `--e2` | `0 2px 4px rgba(28,24,18,.04), 0 1px 2px rgba(28,24,18,.06)` | Section cards, primary buttons resting |
| `--e3` | `0 4px 12px rgba(28,24,18,.06), 0 1px 3px rgba(28,24,18,.04)` | Dropdowns, popovers, hovered cards |
| `--e4` | `0 12px 32px rgba(28,24,18,.08), 0 4px 12px rgba(28,24,18,.06)` | Tooltips, floating buttons, toasts |
| `--e5` | `0 24px 56px rgba(28,24,18,.12), 0 8px 16px rgba(28,24,18,.08)` | Modals, large overlays |

Color shadows for brand CTAs:
```css
box-shadow:
  0 4px 12px rgba(13, 148, 136, 0.24),
  0 1px 3px rgba(13, 148, 136, 0.16);
```
Use on `Help` floating button, primary CTAs in modals.

Focus ring (replaces default outline):
```css
--ring-brand: 0 0 0 2px var(--bg-canvas), 0 0 0 4px var(--brand);
```

---

## 15. Motion

**`[LOCKED]`** Five duration tokens, three easing tokens.

```css
--motion-instant: 0ms;
--motion-fast:    100ms;  /* hover color */
--motion-default: 180ms;  /* dropdown, button state */
--motion-emph:    240ms;  /* modal enter, panel expand */
--motion-slow:    400ms;  /* hero entrance, bar fill */

--ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-emph:   cubic-bezier(0.2, 0.8, 0.2, 1);
```

Tailwind class mapping (use as utility):
- `duration-100` → motion-fast
- `duration-200` → motion-default (round to 200 for tailwind support)
- `duration-300` → motion-emph
- `duration-500` → motion-slow

Reduced-motion override is mandatory (see `09-motion.md` §10).

StreamChart contract (rev.6): no `transition` on zoom completion.
Preserved verbatim.

---

## 16. Z-Index

**`[LOCKED]`** Replace all inline `zIndex: NNNN` values with these
tokens. Define in `src/utils/zIndex.ts`.

```ts
export const Z_INDEX = {
  HEADER:              50,
  PANEL:              100,
  DROPDOWN:           200,
  CHART_TOOLTIP:     1000,   // NEW
  OVERLAY:           7000,
  MODAL_OVERLAY:     8000,
  MODAL_CONTENT:     8001,   // NEW
  ONBOARDING_OVERLAY:   8500, // NEW
  ONBOARDING_SPOTLIGHT: 8501, // NEW
  ONBOARDING_TOOLTIP:   8502, // NEW
  TOAST:             9000,
} as const;
```

Inline violations to clean up (grep):
- `OnboardingGuide`: `8999` / `9000` / `9001` → onboarding tokens
- `HelpModal`: `8000` / `8001` → modal tokens
- `HelpFloatingButton`: `7000` → `OVERLAY`
- `StreamChart` tooltip: `9999` → `CHART_TOOLTIP`
- `IRFChart` tooltip: `9999` → `CHART_TOOLTIP`

---

## 17. Migration Strategy (Dark → Light)

**`[OPEN]`** Three viable paths. Pick whichever causes the least churn
with the existing Tailwind usage:

- (a) **Token swap**: Define new CSS variables, replace
      `bg-slate-900` etc. via grep with new utility classes
      (`bg-canvas`, etc.). High touch count, but every change is
      mechanical.
- (b) **Tailwind theme remap**: Override the Tailwind `slate` palette
      in `tailwind.config.ts` so existing `bg-slate-900` resolves to
      the new warm-white scale. Zero className changes, but semantic
      mismatch (the class still says "slate") could confuse future
      readers.
- (c) **Hybrid**: New tokens for net-new components; remap for
      existing.

Whichever path, the final state has zero usage of dark Tailwind
classes (`bg-slate-9xx`, `text-slate-1xx`, etc.) and zero hard-coded
dark hex values (`#0f172a`, `#1e293b`, `#020617`).

---

## 18. Verification

After tokens are wired:

- All four main tabs (`stream`, `scatter`, `raw-prices`,
  `methodology`) render without console errors
- No element has contrast below 4.5:1 except decorative
  (`--text-muted` separators, axis ticks at minimum 11px)
- `npx tsc --noEmit` passes
- `npx vitest run` passes
- No regression in StreamChart zoom behavior (rev.6 contract)
