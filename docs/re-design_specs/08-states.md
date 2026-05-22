# 08 · States

> Standards for the four data states: `Loading` · `Empty` · `Error`
> · `Disabled`. The current implementation uses text + opacity for
> everything, which buries state changes. Redesign introduces shared
> components and a 3-size pattern (large / medium / inline) for each
> state.

---

## 1. Loading

**`[LOCKED]`** Three-tier pattern by container size.

### 1.1 Tier A — Skeleton shimmer (top-level page / large area)

For: `MethodologyView` section bodies on first load, Banner before
data, Panel sections before fetch.

```jsx
<div role="status" aria-busy="true" aria-live="polite"
     className="skeleton-stack">
  <div className="skeleton-bar" style={{ width: '60%' }} />
  <div className="skeleton-bar" style={{ width: '85%' }} />
  <div className="skeleton-bar" style={{ width: '75%' }} />
</div>
```

```css
.skeleton-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.skeleton-bar {
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

Bar height matches the text it stands in for (16px for body,
24px for headings, 36px for display).

### 1.2 Tier B — Spinner + message (chart / card)

For: `StreamChart`, `ScatterChart`, `RawPricesChart`,
`Minimap`, large panel sections.

```jsx
<div role="status" aria-busy="true" aria-live="polite"
     className="loading-block">
  <svg className="loading-spinner" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-dasharray="60 20"
            stroke-linecap="round" />
  </svg>
  <span className="loading-label">데이터를 불러오는 중…</span>
</div>
```

```css
.loading-block {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 12px;
  height: 100%;
  color: var(--text-tertiary);
}
.loading-spinner {
  width: 32px; height: 32px;
  animation: spin 1s linear infinite;
}
.loading-label {
  font-size: 14px;
  color: var(--text-tertiary);
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### 1.3 Tier C — Inline (chip / button)

For: dropdown body loading, button text, inline labels.

```jsx
<span className="loading-dots" aria-busy="true">
  <span /><span /><span />
</span>
```

```css
.loading-dots {
  display: inline-flex; gap: 4px;
}
.loading-dots span {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--text-tertiary);
  animation: bounce 0.6s ease-in-out infinite;
}
.loading-dots span:nth-child(2) { animation-delay: 0.15s; }
.loading-dots span:nth-child(3) { animation-delay: 0.30s; }
@keyframes bounce {
  0%, 100% { transform: translateY(0);   opacity: 0.5; }
  50%      { transform: translateY(-3px); opacity: 1; }
}
```

Or, when even simpler is wanted: `<span className="opacity-pulse">…</span>`
where `opacity-pulse` is a 1s `opacity: 0.4 ↔ 1` fade.

### 1.4 Unified loading messages

| Tier | Standard text |
|---|---|
| A (skeleton) | (no text) |
| B (chart) | `데이터를 불러오는 중…` |
| Inline dropdown | `로딩 중…` |
| Inline button | `(dots only)` |
| Specific (품목) | `품목 로딩 중…` |
| Specific (사건) | `이벤트 로딩 중…` |

### 1.5 ARIA

Every loading container has:
- `role="status"` (live region)
- `aria-busy="true"`
- `aria-live="polite"`

So screen readers announce when content arrives.

---

## 2. Empty

**`[LOCKED]`** Three-size pattern.

### 2.1 Large — full chart area

For: StreamChart `noAnomalies`, ScatterChart no data, RawPricesChart
no data, Panel "no analysis for this commodity".

```jsx
<div className="empty-large">
  <div className="empty-large__icon">
    <Icon name="chart-bar-square" size={32} />
  </div>
  <div className="empty-large__copy">
    <h3>{title}</h3>
    <p>{description}</p>
  </div>
  {actions && <div className="empty-large__actions">{actions}</div>}
</div>
```

```css
.empty-large {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 16px;
  padding: 32px;
  text-align: center;
}
.empty-large__icon {
  width: 64px; height: 64px;
  border-radius: 50%;
  background: var(--bg-subtle);
  display: flex; align-items: center; justify-content: center;
  color: var(--text-tertiary);
}
.empty-large__copy h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 0;
}
.empty-large__copy p {
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.5;
  margin: 4px 0 0;
  max-width: 320px;
}
.empty-large__actions {
  display: flex; gap: 8px;
  margin-top: 8px;
}
```

### 2.2 Medium — chip overlay (positioned over chart)

For: ScatterChart "this period has no points" overlay when partial
data exists.

```jsx
<div className="empty-chip">
  <Icon name="info" size={14} />
  <span>{message}</span>
</div>
```

```css
.empty-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--r-md);
  box-shadow: var(--e2);
  font-size: 12px;
  color: var(--text-secondary);
}
```

### 2.3 Small — inline (mini chart / cell)

For: panel inline charts, table cells with no value.

```jsx
<div className="empty-inline" style={{ height: 70 }}>
  <Icon name="dot" size={16} style={{ opacity: 0.4 }} />
  <span>해당 기간 데이터 없음</span>
</div>
```

```css
.empty-inline {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 4px;
  color: var(--text-tertiary);
  font-size: 11px;
}
```

### 2.4 Standard messages

| Context | Title | Description |
|---|---|---|
| StreamChart no anomalies | `이 기간에는 탐지된 이상이 없습니다` | `필터 기간을 넓히거나 다른 품목을 살펴보세요.` |
| ScatterChart no points | `이 기간에는 관측 데이터가 없습니다` | (none) |
| ScatterChart no anomalies | `이 기간에는 이상 탐지 관측치가 없습니다` | (none) |
| RawPricesChart no data | `이 기간에는 데이터가 없습니다` | `필터 기간을 넓혀보세요.` |
| Panel no anomalies | `이 품목에는 현재 기간 내 탐지된 이상이 없습니다` | `필터 기간을 넓히거나 다른 품목을 살펴보세요.` |
| Banner total=0 | `이번 달 탐지된 이상이 없습니다` | (none, use success tone) |
| Minimap no data | `전체 기간 데이터 없음` | (none) |
| Inline chart | `해당 기간 데이터 없음` | (none) |

### 2.5 Action affordances (large only)

Where the empty state is recoverable, offer 1-2 actions:

```jsx
actions={
  <>
    <Button variant="ghost" size="sm" onClick={() => setPeriod('all')}>
      전체 기간 보기
    </Button>
    <Button variant="ghost" size="sm" onClick={() => openCommodityPicker()}>
      다른 품목
    </Button>
  </>
}
```

Ghost variant — empty state actions are suggestions, not primary
CTAs.

### 2.6 Per-context icons

| Context | Icon |
|---|---|
| No anomalies | `chart-bar-square` (chart icon) |
| No data overall | `database` |
| No search results | `search` (none in current spec) |
| No items (empty list) | `list` |

---

## 3. Error

**`[LOCKED]`** Three-size pattern, similar shape to Empty.

### 3.1 Large — full chart area

```jsx
<div className="error-large">
  <div className="error-large__icon">
    <Icon name="alert" size={32} />
  </div>
  <div className="error-large__copy">
    <h3>{title}</h3>
    <p>{message ?? '잠시 후 다시 시도해주세요.'}</p>
    {errorCode && <code className="error-code">({errorCode})</code>}
  </div>
  {onRetry && (
    <Button variant="secondary" size="sm" onClick={onRetry}>
      다시 시도
    </Button>
  )}
</div>
```

```css
.error-large {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 16px;
  padding: 32px;
  text-align: center;
}
.error-large__icon {
  width: 64px; height: 64px;
  border-radius: 50%;
  background: var(--error-subtle);
  border: 1px solid var(--error-border);
  display: flex; align-items: center; justify-content: center;
  color: var(--error);
}
.error-large__copy h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}
.error-large__copy p {
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.5;
  margin: 4px 0 0;
  max-width: 320px;
}
.error-code {
  display: inline-block;
  margin-top: 6px;
  padding: 2px 6px;
  background: var(--bg-subtle);
  border-radius: var(--r-sm);
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-tertiary);
}
```

### 3.2 Inline — section body

```jsx
<div className="error-inline">
  <Icon name="alert" size={18} />
  <div className="error-inline__body">
    <p>{message}</p>
    {errorCode && <code>({errorCode})</code>}
  </div>
  {onRetry && (
    <Button variant="ghost" size="sm" onClick={onRetry}>재시도</Button>
  )}
</div>
```

```css
.error-inline {
  display: flex; align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background: var(--error-subtle);
  border: 1px solid var(--error-border);
  border-radius: var(--r-md);
}
.error-inline svg {
  color: var(--error); flex-shrink: 0; margin-top: 1px;
}
.error-inline__body p {
  font-size: 14px;
  color: var(--error);
  line-height: 1.5;
  margin: 0;
}
.error-inline__body code {
  font-size: 11px;
  color: rgba(220, 38, 38, 0.7);
  font-family: var(--font-mono);
  margin-top: 2px;
  display: inline-block;
}
```

### 3.3 Toast — runtime (see `07-overlays.md §5`)

Variant `error`. Triggered by global error handlers / mutation
failures.

### 3.4 Standard messages

Format: `<지칭> + <를/을> + <불러오지 못했습니다 / 실행하지 못했습니다>`.

| Context | Title | Body |
|---|---|---|
| Chart load failure | `데이터를 불러오지 못했습니다` | `잠시 후 다시 시도해주세요.` |
| Specific feature failure | `[기능명]을 실행하지 못했습니다` | (cause-specific) |
| Network timeout | `요청 시간이 초과되었습니다` | `네트워크 상태를 확인하고 다시 시도해주세요.` |
| 404 — commodity not found | `선택한 품목 데이터가 아직 없습니다` | (no retry — different from generic 5xx) |

### 3.5 Error codes

When backend returns an error code (`FE-API-001` etc), surface in
monospace tiny text. Always wrap in parens.

### 3.6 Special: NOT_IMPLEMENTED

`backend Phase 7 pending` cases — these are not errors, they're
warnings. Use warning tone (amber), not error (red):

```jsx
<div className="warning-inline">
  <Icon name="clock" size={18} />
  <div>
    <Badge tone="warning" size="sm">구현 대기</Badge>
    <p>이 기능은 백엔드 구현 후 표시됩니다.</p>
  </div>
</div>
```

Same shape as `.error-inline`, but `--warning-subtle` background,
`--warning-border`, `--warning` icon color.

### 3.7 Special: WHOLESALE_NOT_AVAILABLE

This is an info state, not error. Use Toast variant `info`:

```ts
showToast({
  message: '이 품목은 도매가 데이터가 없어 자동으로 다른 레이아웃으로 전환됩니다.',
  variant: 'info',
});
```

---

## 4. Disabled

**`[LOCKED]`** Three patterns by element type.

### 4.1 Button disabled

```css
button:disabled {
  background: var(--bg-muted);
  color: var(--text-disabled);
  border-color: var(--border-default);
  cursor: not-allowed;
  pointer-events: none;
  box-shadow: none;
}
```

The `pointer-events: none` ensures hover/click visuals don't
trigger. Keep the element focusable for keyboard nav (do not add
`tabindex="-1"`).

### 4.2 Toggle disabled

For switches, segmented controls, toggle buttons:

```css
.toggle:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

Less aggressive — preserves the color identity (so the user can
still see "this is the X segment toggle, but currently inactive").

Add `aria-disabled="true"` and `title` attribute explaining why:

```jsx
<button
  disabled
  aria-disabled
  title="이 품목은 도매가 데이터가 없습니다"
  ...>
  D' (도매→소매)
</button>
```

### 4.3 Region disabled (whole section disabled)

For Panel sections that can't render because dependency missing:

```jsx
<div className="region-disabled"
     aria-disabled="true">
  {children}
</div>
```

```css
.region-disabled {
  opacity: 0.45;
  pointer-events: none;
  user-select: none;
  position: relative;
}
/* Optional overlay with "explanation" pill in the corner */
.region-disabled::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--bg-canvas);
  opacity: 0.3;
  pointer-events: none;
  border-radius: inherit;
}
```

For "segmentsDisabled" cells (FilterBar), replace the current `—`
placeholder with the disabled-toggle pattern above. The visible
affordance preserves the layout shape.

---

## 5. Empty / Error State Helper Component

**`[OPEN]`** Whether to introduce a shared component is up to the
implementer. If yes:

```tsx
// src/components/ui/StateView.tsx
interface StateViewProps {
  variant: 'loading' | 'empty' | 'error' | 'warning';
  size: 'large' | 'inline' | 'chip';
  icon?: IconName;
  title: string;
  description?: string;
  errorCode?: string;
  actions?: ReactNode;
  onRetry?: () => void;
}
export function StateView(props: StateViewProps) { ... }
```

If preferred, keep inline JSX per call site and just adopt the CSS
classes above. The patterns are self-contained; a component is
ergonomics, not requirement.

---

## 6. Icon Catalog (for state usage)

Use these icons from the central icon set:

| Purpose | Icon |
|---|---|
| Empty — no chart data | `chart-bar-square` (custom path) |
| Empty — no list items | `list` |
| Empty — no search results | `search` |
| Empty — generic | `info` |
| Error — generic | `alert` (warning triangle) |
| Warning — pending | `clock` |
| Loading — spinner | (inline SVG circle, no icon name) |
| Success | `check` |

All icons are inline SVG paths defined once in `src/utils/icons.ts`
(or wherever the icon set lives). No icon library install.

---

## 7. ARIA Standards

| State | Role / attribute |
|---|---|
| Loading | `role="status"` `aria-busy="true"` `aria-live="polite"` |
| Empty | (no special role — descriptive heading + text is enough) |
| Error (inline) | `role="alert"` |
| Error (toast) | `role="alert"` (already set in `07-overlays.md §8.3`) |
| Disabled | `aria-disabled="true"` (in addition to `disabled` attr) |

---

## 8. Verification

- [ ] All loading containers use one of the 3 tiers — no mixed-message
      states
- [ ] All empty containers use one of the 3 sizes — large variants have
      icon + title + description, no naked text
- [ ] All error containers use the matching pattern, with icon and
      retry where appropriate
- [ ] Empty messages follow the standard table — Korean text exactly
      as specified
- [ ] Error codes render as monospaced parenthesized small text
- [ ] NOT_IMPLEMENTED uses warning (amber), not error (red)
- [ ] Disabled buttons have `cursor: not-allowed` and no hover effects
- [ ] Disabled toggles keep color identity at 0.4 opacity
- [ ] All disabled elements with non-obvious cause have `title` attr
- [ ] ARIA roles applied per the table in §7
