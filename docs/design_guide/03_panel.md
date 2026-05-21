# 03. Panel (분석 수치 사이드 패널) + Inline 차트 8종 공통

> 우측 사이드 패널은 가장 정보 밀도가 높은 영역. 4개 섹션 (계량경제·ML·패턴 경로·IRF) + inline 차트 8종 포함.
> 디자인 변경 핵심: 위계 정리 + 카드 elevation + inline 차트 시각 표준 통합.

참고: [`01_design_tokens.md`](./01_design_tokens.md), [`07_chart_palette.md`](./07_chart_palette.md)

---

## 1. Panel 컨테이너 — `src/components/layout/Panel.tsx`

### 1.1 현재

```tsx
<aside
  data-testid="panel"
  style={{ width: panelWidth }}  // 280 ~ 520 drag-resize
  className="relative shrink-0 bg-slate-900 border-l border-slate-700/60 flex flex-col overflow-hidden"
>
  <DragHandle onDrag={handleDrag} />
  {/* Header */}
  <div className="px-4 py-3 border-b border-slate-700/60">...</div>
  {/* Sections */}
  <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">...</div>
</aside>
```

### 1.2 분석
- 폭: 280~520px drag-resize. `panelWidth` Zustand 슬라이스 관리.
- 배경: root와 동일 `bg-slate-900` (구분 없음).
- 좌측 border `border-l border-slate-700/60`로 main 영역과 분리.
- 헤더 padding `px-4 py-3`, 섹션 영역 `px-3 py-2 space-y-2`.

### 1.3 권장 변경

**배경 분리** (main과 시각 구분):
```tsx
className="relative shrink-0 bg-slate-950 border-l border-slate-800 flex flex-col overflow-hidden shadow-[inset_1px_0_0_rgba(255,255,255,0.04)]"
```
- `bg-slate-900` → `bg-slate-950` (더 어둡게) 또는 `bg-[#070b14]`.
- inset 좌측 highlight로 미묘한 깊이.

**padding**:
- 헤더 `px-4 py-3` → `px-5 py-4`.
- 섹션 영역 `px-3 py-2` → `px-4 py-3`. 더 호흡.
- 섹션 간 `space-y-2` → `space-y-3`.

---

## 2. DragHandle — Panel.tsx:300

### 2.1 현재

```tsx
<div
  onMouseDown={onMouseDown}
  className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-slate-500/40 transition-colors"
/>
```
- 폭 4px (`w-1`), hover 시 slate-500/40 표시.

### 2.2 권장
- 폭 `w-1` → `w-[3px]` 또는 `w-px` (더 미묘).
- hover 색 `bg-slate-500/40` → `bg-[var(--brand-primary)]/40` (brand 색으로 인터랙티브 hint).
- drag 중 별도 색 (state 추적 필요). 단순화하려면 active pseudo: `active:bg-[var(--brand-primary)]`.

---

## 3. Panel Header — Panel.tsx:452

### 3.1 현재

```tsx
<div className="px-4 py-3 border-b border-slate-700/60">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <span className="font-medium">{commodity_name_kr}</span>
      <span className="text-slate-600">·</span>
      <span>{segment_label_kr}</span>
      <span className="text-slate-600">·</span>
      <span className="font-mono text-[11px]">{period}</span>
    </div>
    <button aria-label="패널 닫기" className="text-slate-500 hover:text-slate-300 text-sm leading-none ml-2">✕</button>
  </div>
  {detail && (
    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
      <ConfidenceBadge grade={...} />
      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
        {patternLabel(...)}
      </span>
      {is_new && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold border" style={{ color: ANOMALY_COLORS.high, ... }}>NEW</span>}
    </div>
  )}
</div>
```

`ConfidenceBadge` (Panel.tsx:27):
```tsx
<span className="px-1.5 py-0.5 rounded text-[10px] font-semibold border"
      style={{ color, borderColor: color, backgroundColor: `${color}20` }}>
  {confidenceLabel(grade)}
</span>
```

### 3.2 권장 변경

**위계 명확화** — 품목명·구간·시점은 동일 무게이면 안 됨:
```tsx
<div className="px-5 py-4 border-b border-slate-800">
  <div className="flex items-start justify-between gap-3">
    <div className="flex-1 min-w-0">
      {/* 1차 정보: 품목명 (가장 큼) */}
      <h2 className="text-slate-100 text-sm font-semibold truncate">{commodity_name_kr}</h2>
      {/* 2차 정보: 구간 · 시점 */}
      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
        <span>{segment_label_kr}</span>
        <span className="text-slate-600">·</span>
        <span className="font-mono">{period}</span>
      </div>
    </div>
    <button className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors">
      <svg className="w-4 h-4" ...><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
    </button>
  </div>
  {/* 배지 영역 */}
  <div className="flex items-center gap-1.5 mt-3 flex-wrap">
    <ConfidenceBadge grade={...} />
    <PatternBadge pattern={...} />
    {is_new && <NewBadge />}
  </div>
</div>
```

**ConfidenceBadge 변경** (현재 inline style):
- 텍스트 크기 `text-[10px]` → `text-[11px] font-semibold`.
- padding `px-1.5 py-0.5` → `px-2 py-0.5`.
- radius `rounded` (4) → `rounded-md` (6).
- backgroundColor `${color}20` (12% opacity) → `${color}1f` (12%) 유지 OR `25` (15%) 약간 진하게.

**NEW 배지 → 별도 컴포넌트**:
```tsx
function NewBadge() {
  return (
    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border"
          style={{ color: ANOMALY_COLORS.high, borderColor: `${ANOMALY_COLORS.high}80`, backgroundColor: `${ANOMALY_COLORS.high}1a` }}>
      NEW
    </span>
  );
}
```

**닫기 버튼**:
- 텍스트 `✕` → SVG path icon (위 코드 참고). 또는 lucide-react·heroicons 사용 시 명시.
- 클릭 영역 28×28 확보 (`w-7 h-7`).

---

## 4. Section Card — Panel.tsx:535, 611, 650, 686

### 4.1 현재 (4 섹션 공통 패턴)

```tsx
<div className="bg-slate-800/40 border border-slate-700/40 rounded-lg overflow-hidden">
  <SectionHeader title="..." sectionKey="stat" />
  {expandedSections.has('stat') && (
    <div className="p-3 space-y-2">...</div>
  )}
</div>
```

`SectionHeader`:
```tsx
<button className="w-full flex items-center justify-between px-3 py-2 border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
  <span className="text-slate-300 text-xs font-medium">{title}</span>
  <span className="text-slate-500 text-[10px]">{isOpen ? '▴' : '▾'}</span>
</button>
```

### 4.2 분석
- 카드 배경 `bg-slate-800/40` — 매우 미묘 (40% 투명도).
- 헤더 화살표 `▴ ▾` 텍스트 문자 — 디자인 가능하면 SVG.

### 4.3 권장 변경

**카드 elevation 추가**:
```tsx
<div className="bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
```
- 배경 더 진하게 (`/60`). border 짙게 (`slate-800` 대신 `/40`).
- `shadow-sm` 으로 미묘한 깊이.

**Section header**:
```tsx
<button className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/50 transition-colors group">
  <span className="text-slate-200 text-sm font-medium">{title}</span>
  <svg className={`w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} ...>
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
</button>
```
- padding `px-3 py-2` → `px-4 py-3`. 클릭 영역 확장.
- 텍스트 `text-xs text-slate-300` → `text-sm text-slate-200 font-medium`.
- 화살표 → SVG chevron. group hover로 색 변화.

---

## 5. StatRow — Panel.tsx:67

### 5.1 현재

```tsx
<div className="flex items-center justify-between py-0.5">
  <span className="text-slate-500 text-[11px]">{label}</span>
  <span className="text-[11px] font-mono" style={{ color: highlight ? ANOMALY_COLORS.high : '#94a3b8' }}>
    {value}
  </span>
</div>
```

### 5.2 분석
- 좁다 (`py-0.5` = 2px). 두 줄 정보가 거의 붙어 있음.
- 라벨/값 동일 크기 (11px). 라벨이 살짝 작아야 위계.

### 5.3 권장 변경

```tsx
<div className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-800/40 last:border-0">
  <span className="text-slate-400 text-xs">{label}</span>
  <span className={`text-xs font-mono tabular-nums ${highlight ? 'text-[var(--anomaly-high)]' : 'text-slate-200'}`}>
    {value}
  </span>
</div>
```
- `py-0.5` → `py-1.5` (호흡).
- 항목 사이 미세 보더 (`border-b border-slate-800/40`).
- 라벨 색 약간 밝게 (`slate-500` → `slate-400`), 값 색 밝게 (`#94a3b8` → `text-slate-200`).
- `tabular-nums` 추가 — 숫자 폭 일정.

---

## 6. MlBarRow — Panel.tsx:195

### 6.1 현재

```tsx
<button className="w-full flex items-center gap-2 px-2 py-1.5 bg-slate-800/60 rounded hover:bg-slate-700/30 transition-colors">
  <span className="text-slate-400 text-[11px] w-24 shrink-0 text-left">{mlModelLabel(model)}</span>
  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
    <div className="h-full rounded-full transition-all"
         style={{ width: `${barWidth}%`, backgroundColor: barColor }} />
  </div>
  <span className="text-[10px] font-mono w-10 text-right" style={{ color: barColor }}>{formatNum(score)}</span>
  <span className="text-slate-600 text-[9px]">{isOpen ? '▴' : '▾'}</span>
</button>
```

### 6.2 권장 변경

```tsx
<button className="w-full flex items-center gap-3 px-3 py-2.5 bg-slate-900/60 hover:bg-slate-800/60 rounded-md transition-colors group">
  <span className="text-slate-300 text-xs font-medium w-28 shrink-0 text-left">{mlModelLabel(model)}</span>
  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden shadow-inner">
    <div className="h-full rounded-full transition-[width] duration-500 ease-out"
         style={{ width: `${barWidth}%`, backgroundColor: barColor, boxShadow: `0 0 8px ${barColor}80` }} />
  </div>
  <span className="text-xs font-mono tabular-nums w-12 text-right" style={{ color: barColor }}>{formatNum(score)}</span>
  <svg className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} ...>
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" />
  </svg>
</button>
```
- padding `px-2 py-1.5` → `px-3 py-2.5`. 클릭 영역.
- bar height `h-2` 유지. 단 `shadow-inner` 추가.
- bar에 box-shadow glow (`0 0 8px ${barColor}80`) — anomaly 색일 때 글로우.
- transition `transition-all` → `transition-[width] duration-500 ease-out`. width만 부드럽게.
- 모델명 폭 `w-24` → `w-28`.
- 화살표 SVG.

---

## 7. 패턴 판정 경로 (Judgment Path) — Panel.tsx:657

### 7.1 현재

```tsx
{detail?.judgment_path.map((step) => (
  <div className="flex items-start gap-2 py-1">
    <div className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
         style={{
           backgroundColor: step.passed ? '#1e293b' : '#3b1c1c',
           border: `1px solid ${step.passed ? '#334155' : ANOMALY_COLORS.high}`,
           color: step.passed ? '#94a3b8' : ANOMALY_COLORS.high,
         }}>
      {step.step}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-slate-300 text-[11px] font-medium">{step.label}</div>
      <div className="text-slate-500 text-[10px]">{step.value}</div>
    </div>
    <span className="text-[10px] font-bold" style={{ color: step.passed ? '#22c55e' : ANOMALY_COLORS.high }}>
      {step.passed ? '✓' : '✗'}
    </span>
  </div>
))}
```

### 7.2 권장 변경

**스텝 indicator 강화** — 진행 흐름을 시각적으로:
```tsx
<div className="flex items-start gap-3 py-2 relative">
  {/* 좌측 세로 라인 (연결) — last:hidden 으로 마지막엔 없음 */}
  {!isLast && <div className="absolute left-[10px] top-7 bottom-0 w-px bg-slate-800" />}

  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 z-10"
       style={{
         backgroundColor: step.passed ? 'var(--semantic-success-bg)' : 'var(--semantic-error-bg)',
         border: `1.5px solid ${step.passed ? 'var(--semantic-success)' : 'var(--semantic-error)'}`,
         color: step.passed ? 'var(--semantic-success)' : 'var(--semantic-error)',
       }}>
    {step.step}
  </div>
  <div className="flex-1 min-w-0">
    <div className="text-slate-200 text-xs font-medium">{step.label}</div>
    <div className="text-slate-500 text-[11px] mt-0.5">{step.value}</div>
  </div>
  <span className="text-base font-bold shrink-0" style={{ color: step.passed ? 'var(--semantic-success)' : 'var(--semantic-error)' }}>
    {step.passed ? '✓' : '✗'}
  </span>
</div>
```
- 좌측 connector 라인으로 step 진행 시각화.
- indicator 4px → 5px (`w-4 h-4` → `w-5 h-5`).
- 텍스트 `text-[11px]` → `text-xs` (라벨), `text-[10px]` → `text-[11px]` (값).
- 색 inline → CSS 변수 (`01 §1.3`).

---

## 8. Inline Chart Section (확장 차트) — Panel.tsx:101, 151

### 8.1 현재 (2 종류 — 시계열 4 + 스냅샷 2)

```tsx
<div className="border border-slate-700/40 rounded overflow-hidden">
  <button className="w-full flex items-center justify-between px-2 py-1.5 bg-slate-800/60 hover:bg-slate-700/30 transition-colors">
    <span className="text-slate-400 text-[11px]">{label}</span>
    <span className="text-slate-600 text-[9px]">{isOpen ? '▴' : '▾'}</span>
  </button>
  {isOpen && (
    <div className="px-2 pb-2 pt-1">
      {isLoading && <div className="flex items-center justify-center h-20 text-slate-600 text-[10px]">로딩 중…</div>}
      {data && <TransmissionRateChart data={...} />}
    </div>
  )}
</div>
```

### 8.2 권장 변경

```tsx
<div className="border border-slate-800 rounded-md overflow-hidden bg-slate-900/40">
  <button className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-800/60 transition-colors group">
    <span className="text-slate-300 text-xs font-medium">{label}</span>
    <svg className={`w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} ...>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" />
    </svg>
  </button>
  {isOpen && (
    <div className="px-3 pb-3 pt-2 border-t border-slate-800/60">
      {/* 차트 또는 loading skeleton */}
    </div>
  )}
</div>
```

---

## 9. Inline 차트 8종 공통 표준

8개 차트: `TransmissionRateChart`, `ZScoreChart`, `ECTChart`, `BreakpointsChart`, `IQRBoxplot`, `AsymmetryHistogram`, `IRFChart`, `MLMapChart`.

### 9.1 현재 공통 패턴

```tsx
const MARGIN = { top: 12, right: 12, bottom: 24, left: 44 };
const height = 200;

// 축 색상 (모든 차트)
g.append('g').call(d3.axisBottom(x).ticks(4)).attr('color', '#64748b');
g.append('g').call(d3.axisLeft(y).ticks(4)).attr('color', '#64748b');

// 라인 stroke-width 1.5

// 빈 상태
<div className="flex items-center justify-center text-slate-500 text-xs" style={{ height }}>
  해당 기간 데이터가 없습니다.
</div>

// 컨테이너
<div ref={containerRef} className="w-full">
  <svg ref={svgRef} className="w-full" />
</div>
```

**Tooltip** (각 차트 d3 DOM 직접 생성, cssText 박힘):
```ts
'position:fixed;pointer-events:none;background:#1e293b;border:1px solid #475569;border-radius:6px;padding:6px 10px;font-size:11px;color:#f1f5f9;z-index:9999;white-space:nowrap;display:none;box-shadow:0 4px 12px rgba(0,0,0,0.4);'
```

### 9.2 권장 표준

**MARGIN 통일** (변경 없음):
```ts
const CHART_MARGIN = { top: 16, right: 16, bottom: 28, left: 48 };
```
- top 12 → 16 (상단 라벨 공간).
- bottom 24 → 28 (X축 라벨 여유).
- left 44 → 48 (Y축 텍스트 여유).

**축 색상 토큰화**:
```ts
// src/utils/chartTheme.ts (신설)
export const CHART_THEME = {
  axisColor: '#94a3b8',       // slate-400 — 현 '#64748b' 보다 약간 밝게
  axisTickColor: '#94a3b8',
  gridColor: '#1e293b',        // slate-800
  gridStrokeDasharray: '3,3',
  backgroundColor: 'transparent',
  textColor: '#cbd5e1',        // slate-300
  textMutedColor: '#64748b',   // slate-500
  fontFamily: 'inherit',
  fontSize: '11px',
} as const;
```

**Tooltip 공통 helper** — 8개 차트의 cssText 통일:
```ts
// src/utils/chartTooltip.ts (신설)
export function createChartTooltip(id: string): HTMLDivElement {
  let tip = document.getElementById(id) as HTMLDivElement | null;
  if (tip) return tip;
  tip = document.createElement('div');
  tip.id = id;
  tip.style.cssText = `
    position: fixed;
    pointer-events: none;
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(8px);
    border: 1px solid #334155;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 12px;
    font-family: inherit;
    color: #f1f5f9;
    z-index: 1000;
    white-space: nowrap;
    display: none;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.04);
  `;
  document.body.appendChild(tip);
  return tip;
}
```
- `backdrop-filter: blur` 추가 — 글로시 느낌.
- 그림자 두 단계 (외부 + inset).
- z-index 9999 → 1000 (`Z_INDEX.CHART_TOOLTIP` 새 토큰).

**stroke-width 표준**:
- 메인 라인: 1.5 → 2.
- 보조 라인 (rolling mean, threshold, baseline): 1 또는 1.5 dashed.
- 면적 stroke 없음.

**dot/marker 크기**:
- 호버 표시 dot: `r=4` (현재).
- 강조 marker (highlight, peak): `r=5~6`.

**빈 상태**:
```tsx
<div className="flex flex-col items-center justify-center gap-2 text-slate-500 text-xs" style={{ height }}>
  <svg className="w-8 h-8 opacity-30" ...><!-- 차트 아이콘 --></svg>
  <span>해당 기간 데이터가 없습니다.</span>
</div>
```

### 9.3 차트별 특수 색상 (현황 보존 + 토큰화)

`07_chart_palette.md`에서 통합. 여기선 위치만 명시:
- `TransmissionRateChart`: line `transmissionRateLine`, mean `rollingMeanLine`, band `q1q3Band`, highlight `ANOMALY_COLORS.high`.
- `ZScoreChart`: line `zscoreLine`, threshold `zscoreWarningLine` (주의) / `zscoreAlertLine` (경보).
- `ECTChart`: line `ectLine`, zero line `ectZeroLine`.
- `BreakpointsChart`: line `transmissionRateLine`, bp vertical `breakpointsLine`.
- `IQRBoxplot`: box `iqrBoxFill`, median `iqrMedianLine`, current `iqrCurrentMarker`.
- `AsymmetryHistogram`: up `asymmetryUpBin`, down `asymmetryDownBin`.
- `IRFChart`: full `irfFullLine`, sub `irfSubperiodLine`, CI band `irfConfidenceBand`, peak `irfPeakMarker`.
- `MLMapChart`: anomaly `mlMapHighlight`, normal `mlMapNormalFill`.

---

## 10. NotImplemented Notice (Phase 7 대기) — Panel.tsx:280

### 10.1 현재

```tsx
<span className="px-1.5 py-0.5 rounded text-[10px] font-semibold border"
      style={{ color: '#fbbf24', borderColor: '#fbbf2480', backgroundColor: '#fbbf2415' }}>
  백엔드 구현 대기 중
</span>
<span className="text-slate-600 text-[10px] leading-snug">
  {section}은 Phase 7 작업 이후 표시됩니다.
</span>
```

### 10.2 권장 변경
- 배지 컴포넌트화: `<BackendPendingBadge />`.
- 컨테이너 카드:
```tsx
<div className="flex flex-col items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/30 rounded-md">
  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border text-amber-300 border-amber-500/50 bg-amber-500/10">
    구현 대기
  </span>
  <p className="text-slate-300 text-xs leading-relaxed">
    {section}은 백엔드 Phase 7 작업 이후 표시됩니다.
  </p>
</div>
```
- 컬러: `#fbbf24` → `amber-400` (`text-amber-300` 등 Tailwind 사용).
- "백엔드 구현 대기 중" → "구현 대기" (간결).

---

## 11. 변경 체크리스트

- [ ] Panel 배경 `bg-slate-900` → `bg-slate-950` 또는 더 어두운 톤
- [ ] Panel padding `px-4 py-3` → `px-5 py-4` (헤더), `px-3 py-2` → `px-4 py-3` (섹션)
- [ ] DragHandle hover 색 brand
- [ ] Panel Header 품목명을 1차(text-sm semibold) / 구간·시점을 2차(text-[11px])로 위계 분리
- [ ] ConfidenceBadge 텍스트 `text-[10px]` → `text-[11px]`, padding `px-2`
- [ ] 닫기 ✕ → SVG icon + hover 배경
- [ ] 섹션 카드 `bg-slate-800/40` → `bg-slate-900/60`, `shadow-sm` 추가
- [ ] SectionHeader padding 확장 + 텍스트 크기 ↑ + chevron SVG
- [ ] StatRow `py-0.5` → `py-1.5` + 미세 border + `tabular-nums`
- [ ] MlBarRow padding ↑ + width transition + glow box-shadow
- [ ] Judgment Path step indicator 크기 ↑ + connector 라인
- [ ] Inline chart wrapper SVG chevron + padding 정비
- [ ] 차트 8종 `CHART_THEME` 토큰 도입
- [ ] Tooltip cssText → `createChartTooltip` helper로 추출
- [ ] NotImplemented Notice 컴포넌트화
