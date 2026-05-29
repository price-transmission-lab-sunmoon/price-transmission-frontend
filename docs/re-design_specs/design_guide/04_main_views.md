# 04. Main Views (StreamChart · ScatterChart · RawPricesChart · Minimap)

> MainPage 4뷰 (3 탭 + 미니맵). 가장 시각적으로 큰 영역. 차트가 페이지의 80%.
> **박제 보존**: `docs/CLAUDE.md §StreamChart 설계 계약 rev.6`의 동작 정책은 절대 깨지 않는다.

---

## 1. MainPage 라우팅 — `src/pages/MainPage.tsx`

### 1.1 현재

```tsx
if (activeTab === 'raw-prices') {
  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex-1 min-h-0"><RawPricesChart /></div>
      <Minimap variant="raw-prices" />
    </div>
  );
}
if (activeTab === 'scatter') {
  return (
    <div className="flex flex-col h-full items-center justify-center gap-2 overflow-hidden">
      <div className="w-full h-full max-w-[min(100%,calc(100vh-260px))] aspect-square">
        <ScatterChart />
      </div>
    </div>
  );
}
// 기본: stream
return (
  <div className="flex flex-col h-full gap-3">
    <div className="flex-1 bg-slate-800/30 border border-slate-700/60 rounded-lg overflow-hidden">
      <StreamChart />
    </div>
    <Minimap variant="stream" />
  </div>
);
```

### 1.2 권장 변경
- 컨테이너 `bg-slate-800/30 border border-slate-700/60 rounded-lg` → `bg-slate-900/40 border border-slate-800 rounded-xl shadow-sm`.
- `gap-2` / `gap-3` → `gap-3` 통일.
- scatter 뷰의 정사각형 컨테이너 유지.

---

## 2. StreamChart — `src/components/charts/StreamChart.tsx`

> 가장 중요한 차트. 박제 정책 다수 적용됨. 디자인 변경 가능한 것 / 불가능한 것 명확히 분리.

### 2.1 박제 정책 (변경 금지)

| 영역 | 박제 |
|---|---|
| 줌 | RAF throttle 금지, scaleExtent [1,30], wheel 즉각 반응 |
| Y축 | viewport 동적 sync (rev.6), 통합 min/max + 10% 패딩 (최소 0.2) |
| 노드 | X spread 금지, +N 클러스터 배지 금지, z-order stack (reference→medium→high) |
| 곡선 | curveMonotoneX (step/linear/catmull-rom 금지) |
| Area fill | 사용 금지 |
| 라인 | segment당 path 1개. null 사전 필터로 완전 연속 |
| Warmup | 배경 vertical band (회색 #475569 opacity 0.18) |
| 펄스 | CSS `@keyframes anomaly-pulse`, SVG `<animate>` 금지 |

### 2.2 변경 가능 영역

**색상**:
- `ANOMALY_COLORS`, `SEGMENT_COLORS_PRIMARY/SECONDARY` — `07_chart_palette.md`에서 통합 정의.
- Warmup band 색 `#475569 opacity 0.18` → `slate-600 / 15%`. 더 진하게 가능 (현 회색 너무 약함).
- 이벤트 overlay (`ev-rect`) opacity 0.12 — 유지 또는 0.15.

**stroke-width**:
- 주 라인 `2` → 유지 또는 `2.5`.
- 보조 라인 (secondary commodity) `1.5` → 유지.

**기준선** (`drawRefLine` y=0, y=1):
- 현재: `stroke #94a3b8`, dasharray `4,3`, opacity 0.5.
- 권장: `stroke #475569` (더 어둡게), opacity 0.4, dasharray `2,4` (더 sparse).
- 라벨 텍스트 색 `#94a3b8` → `#cbd5e1`. 작은 글씨 → 더 잘 보이게.

**노드 반지름** (`ANOMALY_RADII`):
- 현재: high=7, medium=5.5, reference=4.
- 권장: 유지. 시인성 위해 high=8로 약간 확대 가능.

**노드 glow** (high/medium):
```ts
// 현재 (StreamChart.tsx:336)
.attr('r', r + 3)
.attr('opacity', 0.25)
.style('filter', `blur(${grade === 'high' ? 3 : 2}px)`);
```
- 권장: `r + 4`로 약간 확대, `blur` 4 / 3 으로.
- 색은 노드 색 유지.

**선택 노드 표시** (현재 `stroke: #ffffff width: 2 + drop-shadow`):
- 권장: stroke `#ffffff` → `var(--brand-primary)` 또는 더 두꺼운 stroke (3px).
- drop-shadow 강도 ↑: `drop-shadow(0 0 6px rgba(91,140,255,0.7))`.

**NEW 라벨**:
```ts
// 현재
.attr('font-size', '9px')
.attr('font-weight', '700')
```
- 권장: `font-size: 10px`, 배경 추가 (chip 같은 모양).
- 또는 노드 우상단에 작은 dot (`r=2.5 fill yellow-400`) — 더 simple.

**Tooltip** (StreamChart.tsx:575):
```js
'position:fixed;pointer-events:none;background:#1e293b;border:1px solid #334155;border-radius:6px;padding:8px 12px;font-size:12px;color:#f1f5f9;z-index:9999;white-space:nowrap;'
```
- → `03 §9.2`의 `createChartTooltip` helper 사용.

**X축 폰트**:
```ts
.attr('fill', '#94a3b8').attr('font-size', 11);
```
- 권장: `font-size: 11`. 색 유지 또는 `slate-300`. font-family `inherit`.

**그리드** (gridG `stroke #1e293b dasharray 3,3`):
- 색 `#1e293b` (slate-800) — 매우 약함. 적절. 유지.

### 2.3 차트 영역 컨테이너

```tsx
<div ref={containerRef} className="w-full h-full min-h-[320px] relative">
  <svg ref={svgRef} className="w-full h-full overflow-visible" />
</div>
```
- `min-h-[320px]` 유지.
- 부모(`MainPage`)가 `bg-slate-800/30 border border-slate-700/60 rounded-lg` 감쌈 → `04 §1.2` 권장 변경 적용.

### 2.4 빈 상태 (`noAnomalies`)

```tsx
{noAnomalies && (
  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
    <div className="text-slate-300 text-sm">이 기간에는 탐지된 이상이 없습니다.</div>
    <div className="text-slate-500 text-xs">필터 기간을 넓히거나 다른 품목을 살펴보세요.</div>
  </div>
)}
```

권장:
```tsx
<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
  <div className="w-12 h-12 rounded-full bg-slate-800/60 flex items-center justify-center">
    <svg className="w-6 h-6 text-slate-500" ...><!-- chart icon --></svg>
  </div>
  <div className="text-slate-200 text-sm font-medium">이 기간에는 탐지된 이상이 없습니다</div>
  <div className="text-slate-400 text-xs">필터 기간을 넓히거나 다른 품목을 살펴보세요</div>
</div>
```
- 일러스트(아이콘) 추가로 시각적 안내.
- 텍스트 위계 (sm 굵게 + xs 보조).

---

## 3. ScatterChart — `src/components/charts/ScatterChart.tsx`

### 3.1 현재 구성요소
1. 구간 탭 (`A`/`B`/`D'` 또는 4구간)
2. 접이식 설명 패널 ("전달 구조 뷰란?")
3. SVG 차트 + glow filter (high/medium)
4. 호버 툴팁
5. 시점 슬라이더 (재시작·재생·일시정지·range input)

### 3.2 구간 탭

```tsx
<button className={[
  'px-3 py-1 rounded text-xs font-medium transition-colors',
  active ? 'bg-blue-600/80 text-white' : 'bg-slate-700/60 text-slate-400 hover:bg-slate-600/60 hover:text-slate-200',
].join(' ')}>
  구간 {SEGMENT_DISPLAY[tab]}
</button>
```

권장:
- `bg-blue-600/80` → `bg-[var(--brand-primary)]` (brand 일관).
- `px-3 py-1` → `px-4 py-1.5` (조금 더 큼).
- inactive: `bg-slate-700/60` → `bg-slate-800/60`. 더 어둡게.

### 3.3 접이식 설명 패널

```tsx
<div className="border border-slate-700/50 rounded-lg bg-slate-800/30 shrink-0">
  <button className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-400 hover:text-slate-200">
    <span className="font-medium">[전달 구조 뷰란?]</span>
    <span>{isPanelExpanded ? '▲' : '▼'}</span>
  </button>
  {isPanelExpanded && (
    <div className="px-3 pb-3 text-xs text-slate-400 leading-relaxed border-t border-slate-700/40 pt-2 whitespace-pre-line">
      {/* 설명 텍스트 */}
    </div>
  )}
</div>
```

권장:
- 라벨 `[전달 구조 뷰란?]` → `📖 전달 구조 뷰란?` 또는 SVG info 아이콘 + "전달 구조 뷰란?".
- 화살표 `▲ ▼` → SVG chevron.
- padding `px-3 py-2` → `px-4 py-3`. 본문 `px-3 pb-3` → `px-4 pb-4`.
- 본문 폰트 `text-xs` → `text-[13px]`. 읽기 편하게.
- 본문에 markdown 강조 추가 가능 (예: `X축`/`Y축` 굵게).

### 3.4 SVG 차트 디자인 변경

**기준선** (BASELINE_COLOR `#3b82f6`):
- `#3b82f6` (blue-500) → `var(--brand-primary)` 또는 유지.
- 기준선 dashed `4,3`. stroke-width 1.5. 유지.

**그리드**:
```ts
.style('stroke', '#94a3b8').style('stroke-opacity', 0.3).style('stroke-dasharray', '3,3');
```
- 권장: stroke `#475569`, opacity 0.4. 현재 회색이 살짝 강함.

**Glow filter** (현재 코드):
```js
fHigh.append('feGaussianBlur').attr('stdDeviation', '3');  // high
fMed.append('feGaussianBlur').attr('stdDeviation', '2');   // medium
```
- 권장: 유지. 시각 효과 좋음.

**Zone label / desc** (`ZONE_LABEL_COLOR = '#94a3b8'`, `ZONE_DESC_COLOR = '#64748b'`):
- 권장: `slate-400` / `slate-500` (현 유지).

**Trajectory** (TRAJECTORY_COLOR `#475569` opacity 0.4):
- 권장: 유지.

### 3.5 슬라이더

```tsx
<input type="range" className="flex-1 h-1 accent-blue-500 cursor-pointer" />
```

권장:
- `accent-blue-500` → `accent-[var(--brand-primary)]`.
- `h-1` (4px) → `h-1.5` (6px). 좀 더 시인성.
- 슬라이더 thumb 커스텀 CSS (Tailwind는 accent 색만 변경):
```css
input[type="range"]::-webkit-slider-thumb {
  width: 14px; height: 14px;
  background: var(--brand-primary);
  border: 2px solid white;
  border-radius: 50%;
  cursor: pointer;
}
```

**재생/일시정지 버튼**:
- 텍스트 `▶` / `❚❚` → SVG icon.
- `text-blue-400` → `text-[var(--brand-primary)]`.
- `w-6 h-6` → `w-7 h-7` (28px). 클릭 영역.

**시점 라벨** (`text-xs text-slate-400 w-16 text-right tabular-nums`):
- 권장: 유지 (`tabular-nums` 이미 적용).

### 3.6 호버 툴팁

```tsx
<div className="absolute pointer-events-none z-20 bg-slate-800 border border-slate-600/60 rounded-lg px-3 py-2 text-xs text-slate-200 shadow-xl">
```

권장: `03 §9.2`의 `createChartTooltip` helper와 일관성 위해 동일 스타일 사용. 현재 React 컴포넌트 형태라 별도 CSS:
```tsx
<div className="absolute pointer-events-none z-[var(--z-chart-tooltip)] bg-slate-900/95 backdrop-blur border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-slate-100 shadow-xl shadow-black/40 ring-1 ring-white/5">
```

---

## 4. RawPricesChart — `src/components/charts/RawPricesChart.tsx`

### 4.1 구성요소
1. 소스 토글 (Layout 1만, 5종 source on/off)
2. SVG 차트 + anomaly 노드 + 이벤트 overlay
3. 백엔드 미적재 카드 (data.total_points === 0)
4. anomaly hover 툴팁
5. Toast (레이아웃 자동 전환 안내)

### 4.2 소스 토글

```tsx
<button className="flex items-center gap-1 px-2 py-0.5 rounded text-xs border transition-opacity disabled:cursor-not-allowed"
        style={{
          borderColor: disabled ? '#475569' : color,
          color: disabled ? '#64748b' : active ? color : '#64748b',
          opacity: disabled ? 0.4 : active ? 1 : 0.4,
        }}>
  <span className="inline-block w-3 h-0.5 rounded" style={{ backgroundColor: ... }} />
  {SOURCE_LABEL[src]}
</button>
```

권장:
- padding `px-2 py-0.5` → `px-3 py-1`.
- 색 dot `w-3 h-0.5` (작은 선) → `w-2.5 h-2.5 rounded-full` (점) — 더 직관적.
- active 시 배경 추가:
```tsx
style={{
  borderColor: disabled ? '#475569' : color,
  color: disabled ? '#64748b' : active ? color : '#64748b',
  backgroundColor: active && !disabled ? `${color}1a` : 'transparent',
  opacity: disabled ? 0.4 : 1,
}}
```
- active 일 때 opacity 1 + 배경 색.

### 4.3 백엔드 미적재 카드

```tsx
<div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
  <div className="flex flex-col items-center gap-3 px-6 py-5 max-w-md text-center bg-slate-800/90 border border-amber-500/40 rounded-lg shadow-xl">
    <span className="px-2 py-0.5 rounded text-[10px] font-semibold border" style={{ color: '#fbbf24', borderColor: '#fbbf2480', backgroundColor: '#fbbf2415' }}>
      백엔드 적재 대기 중
    </span>
    <div className="text-amber-200/90 text-sm font-medium leading-snug">
      원시 시계열 데이터가 아직 DB에 적재되지 않았습니다.
    </div>
    <div className="text-slate-400 text-xs leading-relaxed">
      파이프라인 Phase 0 결과물(국제가·수입단가·PPI·CPI)이<br />
      적재된 후 자동으로 표시됩니다.
    </div>
    <div className="text-slate-500 text-[10px] leading-snug pt-1 border-t border-slate-700/40 w-full">
      흐름 보기 / 전달 구조 탭은 정상 작동합니다.
    </div>
  </div>
</div>
```

권장:
- 일러스트 추가 — SVG 아이콘 (시계/저장소/구름 등) `w-12 h-12 text-amber-400 opacity-60`.
- 배경 `bg-slate-800/90` → `bg-slate-900/95 backdrop-blur`. 더 강조.
- 배지 색을 Tailwind 토큰으로:
```tsx
<span className="px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider border text-amber-300 border-amber-500/50 bg-amber-500/10">
  구현 대기
</span>
```
- 본문 텍스트 `text-sm font-medium` 유지.

### 4.4 SVG 차트

**그리드** (GRID_OPACITY 0.3):
- 유지.

**OVERLAY_COLOR `#64748b`, OVERLAY_DASH `4,3`** (이벤트 오버레이):
- 권장: 유지.

**Y축 BASELINE_Y = 100** (2020=100 기준선):
- 기준선 색 추가 권장: `stroke=#94a3b8 opacity=0.4 stroke-dasharray=2,4`. 라벨 "기준 (100)".

### 4.5 Anomaly 호버 툴팁

`03 §9.2` helper로 통합. 현재 인라인 React 컴포넌트:
```tsx
<div className="absolute pointer-events-none z-50 bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-xs text-slate-200 shadow-lg">
```
권장: `04 §3.6`과 동일하게 통일.

### 4.6 Toast (레이아웃 자동 전환 안내)

```tsx
<div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-700 border border-slate-500 text-white text-sm px-5 py-2.5 rounded-lg shadow-xl pointer-events-none">
  {toast}
</div>
```

권장: 이 토스트는 `src/components/ui/Toast.tsx`와 별도로 직접 박혀 있음. `showToast()`로 통합하는 게 좋음. 디자인 변경 시 검토.

---

## 5. Minimap — `src/components/charts/Minimap.tsx`

### 5.1 현재

```tsx
const HEIGHT = 64;
const BRUSH_FILL = 'rgba(100, 149, 237, 0.20)';
const BRUSH_STROKE = '#6495ED';

<div ref={containerRef} className="bg-slate-800/30 border border-slate-700/50 rounded-lg overflow-hidden" style={{ height: HEIGHT }}>
  <svg ref={svgRef} style={{ display: 'block' }} />
</div>
```

### 5.2 분석
- 높이 64px. 미니맵으로 충분.
- Brush 색 `#6495ED` (cornflowerblue) — 고전적이지만 brand와 불일치.

### 5.3 권장 변경

**Brush 색**:
```ts
const BRUSH_FILL = 'rgba(91, 140, 255, 0.20)';   // var(--brand-primary) 알파 30%
const BRUSH_STROKE = '#5b8cff';                  // var(--brand-primary)
```
또는 CSS 변수 직접 사용 (D3 attr는 변수 안 됨 → JS에서 getComputedStyle 후 사용).

**컨테이너**:
```tsx
className="bg-slate-900/40 border border-slate-800 rounded-lg overflow-hidden shadow-inner"
```
- 배경 약간 어둡게. inner shadow로 sunken 효과.

**anomaly 밀도 색** (현재 ANOMALY_COLORS):
- 유지.
- opacity `0.10~0.12` → 유지 (미니맵은 미묘해야 함).

**X축 (연도 눈금)**:
```ts
.attr('stroke', '#475569').attr('stroke-opacity', 0.5);
.attr('fill', '#94a3b8').attr('font-size', '10px');
```
- 권장: 유지.

**Loading skeleton**:
```tsx
<div className="bg-slate-800/30 border border-slate-700/50 rounded-lg animate-pulse" style={{ height: HEIGHT }} />
```
- 권장: `bg-slate-900/40 border-slate-800/60`. `animate-pulse` 유지.

**Error/empty fallback**:
```tsx
<div className="flex items-center justify-center bg-slate-800/30 border border-slate-700/50 rounded-lg" style={{ height: TOTAL_HEIGHT }}>
  <span className="text-slate-500 text-xs">전체 기간 데이터 없음</span>
</div>
```
- 권장: 아이콘 추가:
```tsx
<div className="flex items-center justify-center gap-2 bg-slate-900/40 border border-slate-800 rounded-lg" style={{ height: TOTAL_HEIGHT }}>
  <svg className="w-4 h-4 text-slate-600" ...><!-- chart icon --></svg>
  <span className="text-slate-500 text-xs">전체 기간 데이터 없음</span>
</div>
```

---

## 6. 공통 차트 컨테이너 표준

모든 메인 차트는 다음 컨테이너 표준 권장:

```tsx
<div className="relative w-full h-full bg-slate-900/40 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
  <svg ref={svgRef} className="w-full h-full overflow-visible" />
  {/* 빈 상태 오버레이 */}
</div>
```

핵심:
- 배경 `bg-slate-900/40` (반투명, root가 살짝 비침).
- 보더 `border-slate-800`.
- radius `rounded-xl` (12px) — 메인 영역은 큰 radius.
- `shadow-sm` 미세 깊이.
- `overflow-hidden` (clip 정합).

---

## 7. 변경 체크리스트

- [ ] MainPage 컨테이너 `rounded-lg` → `rounded-xl shadow-sm`
- [ ] StreamChart 박제 정책 보존하며 색·stroke만 정비
- [ ] StreamChart Tooltip → `createChartTooltip` helper
- [ ] StreamChart noAnomalies 빈 상태에 아이콘 추가
- [ ] ScatterChart 탭 active `bg-blue-600/80` → brand 색
- [ ] ScatterChart 설명 패널 화살표 → SVG chevron
- [ ] ScatterChart 슬라이더 thumb 커스텀 + accent brand
- [ ] ScatterChart 재생/일시정지 → SVG icon
- [ ] RawPricesChart 소스 토글 색 dot 형 + active 배경
- [ ] RawPricesChart 미적재 카드 일러스트 추가
- [ ] RawPricesChart 직접 박힌 Toast → showToast 통합 (선택)
- [ ] Minimap brush 색 brand 통일
- [ ] Minimap loading/empty 일러스트
- [ ] 모든 차트 hover 툴팁 공통 helper 사용
