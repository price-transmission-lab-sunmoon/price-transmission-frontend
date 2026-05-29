# 05. Methodology Page (방법론 페이지) + PipelineFlowDiagram

> 6섹션 (파이프라인·패턴 3종·계량경제 기법·ML 모델·신뢰도 등급·데이터 소스).
> 정적 컨텐츠 위주. 정보 디자인이 핵심 — table·card·accordion 시각 정비.

---

## 1. MethodologyView 최상위 컨테이너 — `src/components/charts/MethodologyView.tsx:506`

### 1.1 현재

```tsx
<div className="max-w-4xl mx-auto py-6 space-y-6">
  <Section1Pipeline />
  <Section2Patterns />
  <Section3Econometrics />
  <Section4MLModels />
  <Section5ConfidenceGrade />
  <Section6DataSources />
</div>
```

### 1.2 분석
- 최대 폭 `max-w-4xl` (896px) — 읽기 좋은 폭.
- 섹션 간 `space-y-6` (24px).
- 가운데 정렬 (`mx-auto`).

### 1.3 권장 변경
- 폭 `max-w-4xl` → `max-w-5xl` (1024px). 약간 더 넉넉.
- 페이지 상단에 H1 타이틀 추가:
```tsx
<div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
  <header className="mb-2">
    <h1 className="text-slate-100 text-2xl font-bold tracking-tight">분석 방법론</h1>
    <p className="text-slate-400 text-sm mt-1">
      가격 전달 이상 탐지 모델의 분석 흐름과 통계·머신러닝 기법
    </p>
  </header>
  <Section1Pipeline />
  ...
</div>
```
- 페이지 헤더로 문맥 제공. 현재는 갑자기 섹션 1 시작.

---

## 2. SectionCard / SectionHeader — MethodologyView.tsx:16, 27

### 2.1 현재

```tsx
function SectionCard({ children }) {
  return (
    <section className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
      {children}
    </section>
  );
}

function SectionHeader({ num, title }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-700 text-slate-300 text-xs font-bold shrink-0">
        {num}
      </span>
      <h2 className="text-slate-100 text-base font-semibold">{title}</h2>
    </div>
  );
}
```

### 2.2 분석
- 카드 padding 20px (`p-5`), radius 12px (`rounded-xl`).
- 번호 indicator: 원형 28px (`w-7 h-7`) slate-700 배경.
- 타이틀 `text-base` (16px) `font-semibold`.

### 2.3 권장 변경

**번호 indicator 강화**:
```tsx
<span className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-hover)] text-white text-sm font-bold shrink-0 shadow-md shadow-[var(--brand-primary)]/30">
  {num}
</span>
```
- 28 → 36px (`w-7` → `w-9`). 시각 무게 ↑.
- radius `rounded-full` → `rounded-xl` (사각 모서리 둥근 — 모던).
- gradient + brand 색.
- 그림자 + 색 그림자 — 깊이감.

**카드 elevation**:
```tsx
<section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-sm">
```
- 배경 `bg-slate-800/40` → `bg-slate-900/60`. 더 깊은 톤.
- padding `p-5` → `p-6`. 호흡.
- radius `rounded-xl` → `rounded-2xl` (16px). 메인 섹션 카드는 큰 radius.
- `shadow-sm` 추가.

**타이틀**:
```tsx
<h2 className="text-slate-50 text-lg font-bold tracking-tight">{title}</h2>
```
- `text-base` → `text-lg` (16 → 18). 위계 강화.
- `font-semibold` → `font-bold`.
- `tracking-tight` (글자 간격 약간 좁게 — 굵은 글씨에 적합).

---

## 3. Section 2 — 패턴 3종 카드

### 3.1 현재 (PatternCard, MethodologyView.tsx:101)

```tsx
<div className="bg-slate-900/50 border border-slate-700/40 rounded-lg p-4">
  <div className="flex items-center gap-2 mb-2">
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${PATTERN_CHIP_COLORS[pattern_id]}`}>
      패턴 1 / 2 / 3
    </span>
  </div>
  <h3 className="text-slate-200 text-sm font-medium mb-2">{label_kr}</h3>
  <p className="text-slate-400 text-xs leading-relaxed mb-3">{description}</p>
  <div className="flex flex-wrap gap-1">
    {applicable_segments.map((seg) => (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-700/60 text-slate-400 border border-slate-600/50">
        {SEGMENT_LABEL[seg]}
      </span>
    ))}
  </div>
</div>
```

`PATTERN_CHIP_COLORS`:
- pattern1: `bg-blue-900/40 text-blue-300 border-blue-700/50`
- pattern2: `bg-purple-900/40 text-purple-300 border-purple-700/50`
- pattern3: `bg-teal-900/40 text-teal-300 border-teal-700/50`

3 카드가 `grid lg:grid-cols-3` 레이아웃.

### 3.2 권장 변경

```tsx
<div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${PATTERN_CHIP_COLORS[pattern_id]}`}>
    패턴 {N}
  </span>
  <h3 className="text-slate-100 text-base font-semibold mt-3">{label_kr}</h3>
  <p className="text-slate-300 text-sm leading-relaxed mt-2">{description}</p>
  <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-slate-800">
    <span className="text-slate-500 text-[10px] uppercase tracking-wider mr-1">적용 구간</span>
    {applicable_segments.map((seg) => (
      <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
        {SEGMENT_LABEL[seg]}
      </span>
    ))}
  </div>
</div>
```

핵심:
- 배경 그라데이션 (`bg-gradient-to-br from-... to-...`).
- 패턴 chip이 카드 상단에 강조 (uppercase tracking).
- 본문 텍스트 `text-xs` → `text-sm`. 더 읽기 편하게.
- 구간 표시 영역에 `적용 구간` 라벨 + 상단 미세 보더로 구분.

---

## 4. Section 3 — 계량경제 기법 Accordion

### 4.1 현재 (AccordionItem, MethodologyView.tsx:259)

```tsx
<div className="border border-slate-700/40 rounded-lg overflow-hidden">
  <button className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/40 hover:bg-slate-800/60 transition-colors text-left">
    <div>
      <span className="text-slate-200 text-sm font-medium">{title}</span>
      <span className="ml-3 text-slate-500 text-xs hidden sm:inline">{summary}</span>
    </div>
    <span className={`text-slate-400 text-xs transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}>▾</span>
  </button>
  {isOpen && (
    <div className="px-4 py-3 bg-slate-900/20 border-t border-slate-700/30">
      <p className="text-slate-400 text-xs leading-relaxed">{detail}</p>
    </div>
  )}
</div>
```

### 4.2 권장 변경

```tsx
<div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/40">
  <button className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-800/40 transition-colors text-left group">
    <div className="flex-1 min-w-0">
      <span className="text-slate-100 text-sm font-semibold">{title}</span>
      <span className="ml-3 text-slate-400 text-xs hidden sm:inline">{summary}</span>
    </div>
    <svg className={`w-5 h-5 text-slate-500 group-hover:text-slate-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} ...>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" />
    </svg>
  </button>
  {isOpen && (
    <div className="px-5 pb-5 pt-2 border-t border-slate-800 bg-slate-950/40">
      <p className="text-slate-300 text-sm leading-relaxed">{detail}</p>
    </div>
  )}
</div>
```

핵심:
- padding `px-4 py-3` → `px-5 py-4`. 클릭 영역 확장.
- 화살표 `▾` → SVG chevron.
- 본문 텍스트 `text-xs` → `text-sm`, 색 `slate-400` → `slate-300`.
- 본문 영역 배경 더 어둡게 (`bg-slate-950/40`).

---

## 5. Section 4 — ML 모델 Table

### 5.1 현재 (MethodologyView.tsx:365)

```tsx
<table className="w-full text-xs">
  <thead>
    <tr className="text-slate-500 border-b border-slate-700/50">
      <th className="text-left py-2 pr-4 font-medium w-40">모델</th>
      <th className="text-left py-2 pr-4 font-medium">작동 원리</th>
      <th className="text-left py-2 font-medium">이 서비스에서의 역할</th>
    </tr>
  </thead>
  <tbody className="divide-y divide-slate-700/30">
    {ML_MODELS.map((m) => (
      <tr className="align-top">
        <td className="py-2.5 pr-4 text-slate-300 font-medium whitespace-nowrap">{m.name}</td>
        <td className="py-2.5 pr-4 text-slate-400 leading-relaxed">{m.principle}</td>
        <td className="py-2.5 text-slate-400 leading-relaxed">{m.role}</td>
      </tr>
    ))}
  </tbody>
</table>

<div className="mt-4 pt-3 border-t border-slate-700/30">
  <p className="text-slate-500 text-xs font-medium mb-2">ML 입력 피처 (6종, 전 품목 공통)</p>
  <div className="flex flex-wrap gap-1.5">
    {ML_FEATURES.map((f) => (
      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-700/50 text-slate-400 border border-slate-600/40">{f}</span>
    ))}
  </div>
</div>
```

### 5.2 권장 변경

**Table → 카드형 row**:
```tsx
<div className="space-y-2">
  {ML_MODELS.map((m) => (
    <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3 p-4 bg-slate-950/40 border border-slate-800 rounded-lg">
      <div className="flex flex-col gap-1">
        <span className="text-slate-100 text-sm font-semibold">{m.name}</span>
        <span className="text-slate-500 text-[10px] uppercase tracking-wider">모델</span>
      </div>
      <div className="space-y-3">
        <div>
          <span className="text-slate-500 text-[10px] uppercase tracking-wider">작동 원리</span>
          <p className="text-slate-300 text-sm leading-relaxed mt-0.5">{m.principle}</p>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] uppercase tracking-wider">서비스 역할</span>
          <p className="text-slate-300 text-sm leading-relaxed mt-0.5">{m.role}</p>
        </div>
      </div>
    </div>
  ))}
</div>
```

- table 대신 카드 그리드 — 모바일 친화 + 라벨 분리.
- 또는 table 유지 시 row hover 효과 추가:
```tsx
<tbody className="divide-y divide-slate-800">
  {ML_MODELS.map((m) => (
    <tr className="align-top hover:bg-slate-800/40 transition-colors">
      <td className="py-3 pr-4 text-slate-100 text-sm font-medium whitespace-nowrap">{m.name}</td>
      <td className="py-3 pr-4 text-slate-300 text-sm leading-relaxed">{m.principle}</td>
      <td className="py-3 text-slate-300 text-sm leading-relaxed">{m.role}</td>
    </tr>
  ))}
</tbody>
```

**Feature chip**:
```tsx
<span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600 transition-colors">
  {f}
</span>
```

---

## 6. Section 5 — 신뢰도 등급 카드

### 6.1 현재 (MethodologyView.tsx:437)

```tsx
{GRADE_ROWS.map((r) => (
  <div className="flex items-center gap-4 px-4 py-3 bg-slate-900/40 border border-slate-700/30 rounded-lg">
    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
    <div className="flex-1 min-w-0">
      <span className="text-slate-200 text-sm font-medium">{r.grade}</span>
      <span className="ml-3 text-slate-500 text-xs">{r.condition}</span>
    </div>
    <span className="text-slate-500 text-xs shrink-0 hidden sm:block">{r.paper}</span>
  </div>
))}
```

### 6.2 권장 변경

```tsx
{GRADE_ROWS.map((r) => (
  <div className="flex items-center gap-4 px-5 py-4 bg-slate-950/40 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
    <span className="relative w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: r.color }}>
      <span className="absolute inset-0 rounded-full animate-ping opacity-50" style={{ backgroundColor: r.color }} />
    </span>
    <div className="flex-1 min-w-0 flex items-baseline gap-3">
      <span className="text-slate-100 text-base font-semibold">{r.grade}</span>
      <span className="text-slate-400 text-sm">{r.condition}</span>
    </div>
    <span className="text-slate-500 text-xs shrink-0 hidden sm:block px-2 py-0.5 rounded-md border border-slate-700 bg-slate-800">
      {r.paper}
    </span>
  </div>
))}
```

핵심:
- dot에 펄스 (`animate-ping`).
- 등급명 `text-sm` → `text-base font-semibold` (위계 강화).
- 우측 paper 표시를 chip 형태로.
- hover 시 border 색 변화.

---

## 7. Section 6 — 데이터 소스 Table

### 7.1 현재

기본적 table. row 순번, 소스명, 제공 기관, 활용 단계 4컬럼.

### 7.2 권장 변경

테이블 유지하되 시각 정비:
```tsx
<div className="overflow-x-auto -mx-2">
  <table className="w-full text-sm">
    <thead>
      <tr className="text-slate-500 border-b border-slate-800">
        <th className="text-left py-3 px-3 font-medium text-xs uppercase tracking-wider w-12">#</th>
        <th className="text-left py-3 px-3 font-medium text-xs uppercase tracking-wider">소스</th>
        <th className="text-left py-3 px-3 font-medium text-xs uppercase tracking-wider">제공 기관</th>
        <th className="text-left py-3 px-3 font-medium text-xs uppercase tracking-wider">활용 단계</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-800">
      {DATA_SOURCES.map((row) => (
        <tr className="hover:bg-slate-800/40 transition-colors">
          <td className="py-3 px-3 text-slate-500 text-sm font-mono">{row.num}</td>
          <td className="py-3 px-3 text-slate-100 text-sm font-medium">{row.source}</td>
          <td className="py-3 px-3 text-slate-300 text-sm">{row.org}</td>
          <td className="py-3 px-3 text-slate-400 text-sm">{row.usage}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

- 헤더 폰트 `text-xs uppercase tracking-wider` (라벨 느낌).
- 폰트 `text-xs` → `text-sm`.
- 번호 `font-mono`.
- row hover.

---

## 8. PipelineFlowDiagram — `src/components/charts/PipelineFlowDiagram.tsx`

### 8.1 현재 SVG attr

```ts
// 노드 박스
.attr('fill', '#1e293b')        // slate-800
.attr('stroke', '#334155')      // slate-700
.attr('stroke-width', 1.5)
.attr('rx', 6);

// 호버 stroke
.attr('stroke', '#64748b');     // slate-500

// 라벨 텍스트
.attr('font-size', '12')
.attr('font-family', 'sans-serif')
.attr('fill', '#e2e8f0');       // slate-200

// 엣지
.attr('stroke', '#475569')      // slate-600
.attr('stroke-width', 1.5);

// 엣지 라벨 배경
.attr('fill', '#0f172a');       // slate-900

// 화살표 marker fill #475569
```

상수 (PipelineFlowDiagram.tsx:5):
- NODE_W: 140
- NODE_H: 44
- PHASE_GAP: 88
- NODE_GAP: 24

### 8.2 권장 변경

**노드 박스**:
```ts
.attr('fill', '#1e293b')
.attr('stroke', '#334155')
.attr('stroke-width', 1)
.attr('rx', 10);  // 6 → 10. radius ↑
```

**호버 effect** (현재 stroke 색 변경만):
```ts
// hover 시 background 변경 + 그림자 (filter)
.on('mouseover', function() {
  d3.select(this.parentNode as Element).select('rect:first-child')
    .attr('fill', '#1e3a52')           // 약간 brand 색 섞기
    .attr('stroke', '#5b8cff')         // brand-primary
    .attr('stroke-width', 1.5);
});
```

**라벨 텍스트**:
```ts
.attr('font-size', '13')               // 12 → 13
.attr('font-family', 'inherit')        // 시스템 폰트 → Pretendard 등 상속
.attr('font-weight', '500')
.attr('fill', '#f1f5f9');              // slate-100
```

**엣지** + 화살표:
```ts
.attr('stroke', '#475569')             // 유지
.attr('stroke-width', 1.5)
.attr('stroke-linecap', 'round')
// 화살표 marker fill 동일 색
```

**노드 크기**:
- NODE_W: 140 → 160 (라벨 잘림 방지).
- NODE_H: 44 → 48.

### 8.3 클릭 툴팁 (popover)

```tsx
<div className="absolute z-20 w-52 bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl pointer-events-auto">
```

권장:
```tsx
<div className="absolute z-20 w-64 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-xl p-4 shadow-xl shadow-black/40">
  <div className="flex items-start justify-between gap-2 mb-2">
    <span className="text-slate-100 text-sm font-semibold">{tooltip.label}</span>
    <button className="text-slate-500 hover:text-slate-200 transition-colors w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-800">
      <svg className="w-3.5 h-3.5"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" /></svg>
    </button>
  </div>
  <p className="text-slate-300 text-sm leading-relaxed">{tooltip.description}</p>
</div>
```

핵심:
- 폭 `w-52` → `w-64` (더 넓게).
- 배경 `bg-slate-800` → `bg-slate-900/95 backdrop-blur`.
- radius `rounded-lg` → `rounded-xl`.
- 그림자 `shadow-xl shadow-black/40` (다크 모드 그림자 강화).
- 닫기 ✕ → SVG path icon.

### 8.4 버전 표시

```tsx
<div className="absolute top-2 right-2 text-[11px] text-slate-500 pointer-events-none z-10">
  파이프라인 버전: {version}
</div>
```

권장:
```tsx
<div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-[10px] text-slate-400 font-mono uppercase tracking-wider pointer-events-none z-10">
  v{version}
</div>
```
- 배지 형태로 — 인지 가능한 메타 정보.
- 폰트 mono + uppercase.

---

## 9. Loading skeleton (MethodologyView.tsx:35)

```tsx
<div className="space-y-2 animate-pulse">
  {Array.from({ length: rows }).map((_, i) => (
    <div className="h-4 bg-slate-700/60 rounded" style={{ width: `${70 + (i % 3) * 10}%` }} />
  ))}
</div>
```

권장:
```tsx
<div className="space-y-3">
  {Array.from({ length: rows }).map((_, i) => (
    <div className="h-4 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 rounded-md animate-shimmer"
         style={{ width: `${70 + (i % 3) * 10}%`, backgroundSize: '200% 100%' }} />
  ))}
</div>
```

```css
/* index.css */
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.animate-shimmer {
  animation: shimmer 1.6s linear infinite;
}
```
- pulse 단조 → shimmer (가로 빛 흐름). `08_states.md`에서 통합.

---

## 10. ErrorBanner (MethodologyView.tsx:45)

```tsx
<div className="flex items-center gap-2 px-3 py-2 bg-red-900/20 border border-red-800/40 rounded-lg text-red-400 text-xs">
  <span>⚠</span>
  <span>{message}</span>
</div>
```

권장:
```tsx
<div className="flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
  <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" ...><!-- warning icon --></svg>
  <span className="text-red-300 text-sm leading-relaxed">{message}</span>
</div>
```
- ⚠ 이모지 → SVG warning icon.
- 텍스트 `text-xs` → `text-sm`. 더 읽기 편하게.
- padding 확장.

---

## 11. 변경 체크리스트

- [ ] MethodologyView 페이지 헤더 H1 추가
- [ ] max-w 4xl → 5xl
- [ ] SectionCard 배경/padding/radius 강화
- [ ] SectionHeader 번호 indicator 36px + gradient + brand
- [ ] SectionHeader 타이틀 `text-base` → `text-lg font-bold`
- [ ] PatternCard 그라데이션 배경 + 구간 chip 영역 분리
- [ ] AccordionItem padding 확장 + chevron SVG + 본문 `text-sm`
- [ ] ML 모델 table row hover + 폰트 sm
- [ ] 신뢰도 등급 dot 펄스 + 등급명 위계 강화 + paper chip
- [ ] 데이터 소스 table 헤더 uppercase + 폰트 sm
- [ ] PipelineFlowDiagram 노드 radius 10 + 폰트 13 + brand hover
- [ ] 노드 클릭 popover 배경 backdrop-blur + 폭 ↑
- [ ] 버전 표시 mono 배지
- [ ] LoadingSkeleton shimmer 모션
- [ ] ErrorBanner SVG icon + text-sm
