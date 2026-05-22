# 02. Layout (AppShell · Banner · Header · FilterBar · FreshnessChip)

> 화면 최상위 구조 4종 + FreshnessChip 1종.
> 구조·자식 컴포넌트 위치 그대로. className·typography·spacing만 바꾼다.

참고 토큰: [`01_design_tokens.md`](./01_design_tokens.md)

---

## 1. AppShell — `src/components/layout/AppShell.tsx`

### 1.1 현재

```tsx
<div className="flex flex-col h-screen bg-slate-900 text-white">
  <Banner />
  <Header />
  {!isMethodology && <FilterBar />}
  <div className="flex flex-1 overflow-hidden">
    <main data-testid="main-area" className="flex-1 overflow-auto p-6">
      {children}
    </main>
    {!isMethodology && <Panel />}
  </div>
  <OnboardingGuide />
  <HelpFloatingButton />
</div>
```

### 1.2 분석
- root `bg-slate-900` (다크 root).
- main 영역 `p-6` (24px padding) — 일관됨.
- methodology 탭일 때 FilterBar/Panel 미렌더 → 풀 너비 페이지.

### 1.3 권장 변경

**선택 A — 미세 정비**:
- `bg-slate-900` → `bg-[#0b1220]` 또는 `bg-zinc-950` (조금 더 깊은 배경).
- main padding `p-6` → `px-8 py-6` (가로 호흡 ↑) — 단, 사이드 패널과 main 사이 시각 간격 추가됨.

**선택 B — 색 토큰 도입**:
- `01 §1.3` 토큰 적용.
```tsx
<div className="flex flex-col h-screen bg-[var(--bg-root)] text-[var(--text-primary)]">
```
또는 Tailwind plugin으로 `bg-bg-root` 등.

### 1.4 변경하면 안 되는 것
- `flex-col h-screen` 구조.
- main의 `overflow-auto` (스크롤 정책).
- Panel·FilterBar 조건부 렌더 로직.

---

## 2. Banner — `src/components/layout/Banner.tsx`

### 2.1 현재 (배너 + chips)

```tsx
<div role="banner" className="h-10 px-5 bg-slate-800/40 border-b border-slate-700/60 flex items-center gap-3 shrink-0 overflow-x-auto">
  <span className="text-slate-400 text-xs shrink-0">이달의 이상</span>
  <div className="flex items-center gap-1.5">
    {dedupedAnomalies.map((a) => (
      <button className={`flex items-center gap-1 px-2 h-5 rounded border text-[10px] font-medium transition-opacity hover:opacity-80 ${GRADE_COLORS[a.confidence_grade]}`}>
        {a.is_new && <span className="text-[8px] font-bold text-yellow-400 mr-0.5">NEW</span>}
        {a.commodity_name_kr}
        <span className="opacity-70">{GRADE_LABELS[a.confidence_grade]}</span>
      </button>
    ))}
  </div>
  <span className="text-slate-500 text-[11px] shrink-0 ml-1">({diffText})</span>
</div>
```

`GRADE_COLORS`:
- high: `bg-red-500/20 text-red-300 border-red-500/40`
- medium: `bg-orange-500/20 text-orange-300 border-orange-500/40`
- reference: `bg-lime-500/20 text-lime-300 border-lime-500/40`

### 2.2 분석
- 높이 40px, 패딩 가로 20px.
- chip 높이 20px (`h-5`), 텍스트 10px → 매우 작음.
- "NEW" 라벨 8px → 가독성 떨어짐.
- diff 텍스트 (`(지난달보다 N건 증가)`) 11px slate-500 → 너무 흐림.

### 2.3 권장 변경

**typography 위계 강화**:
```tsx
<div className="h-12 px-6 bg-slate-800/40 border-b border-slate-700/60 flex items-center gap-4 shrink-0 overflow-x-auto">
  <span className="text-slate-300 text-xs font-medium shrink-0 uppercase tracking-wide">이달의 이상</span>
  <div className="flex items-center gap-2">
    {/* chip */}
    <button className="flex items-center gap-1.5 px-2.5 h-6 rounded-md border text-xs font-medium transition-all hover:scale-105 ...">
      {a.is_new && <span className="text-[10px] font-bold text-yellow-300 px-1 py-0.5 rounded-sm bg-yellow-500/10">NEW</span>}
      <span>{a.commodity_name_kr}</span>
      <span className="text-[10px] opacity-80">{GRADE_LABELS[a.confidence_grade]}</span>
    </button>
  </div>
  <span className="text-slate-400 text-xs shrink-0 ml-auto">{diffText}</span>
</div>
```

변경 핵심:
- 높이 40 → 48 (`h-10` → `h-12`). 호흡감 ↑.
- chip 높이 20 → 24 (`h-5` → `h-6`), text 10 → 12.
- NEW 배지: 작은 글씨 인라인 → 별도 배지 (작은 카드형).
- 라벨 텍스트 색을 한 단계 밝게 (`slate-400` → `slate-300`).
- "지난달 대비"를 우측 정렬 (`ml-auto`) — chip이 가운데, 메타가 양 끝.

**GRADE_COLORS 정비 옵션**:
```ts
// 현 코드 보존 + opacity만 강화
high: 'bg-red-500/25 text-red-200 border-red-500/50',
medium: 'bg-orange-500/25 text-orange-200 border-orange-500/50',
reference: 'bg-lime-500/25 text-lime-200 border-lime-500/50',
```
또는 `01 §1.3 SEMANTIC` 토큰 사용:
```ts
high: 'bg-[var(--anomaly-high)]/15 text-[var(--anomaly-high)] border-[var(--anomaly-high)]/40',
```

### 2.4 빈 상태 (`total_count === 0`)
현재: `<span className="text-slate-400">이번 달 탐지된 이상이 없습니다</span>`
권장: 아이콘 + 메시지 (예: 체크마크 + "이번 달 이상 없음" + `text-emerald-300`).

---

## 3. Header — `src/components/layout/Header.tsx`

### 3.1 현재 (높이 56, 가로 20px)

```tsx
<header className="flex items-center justify-between h-14 px-5 bg-slate-900 border-b border-slate-700/60 shrink-0 relative z-10">
  <div className="flex items-center gap-4">
    {/* 서비스명 */}
    <div className="flex items-center gap-2 shrink-0">
      <svg ... stroke="#e24b4a" />  {/* anomaly.high 색 사용 */}
      <span className="text-white font-bold text-sm tracking-tight">가격렌즈</span>
    </div>
    <div className="w-px h-5 bg-slate-700" />  {/* 세로 구분선 */}

    {/* 주 품목 드롭다운 */}
    <button className="flex items-center gap-2 h-8 px-3 bg-slate-800 border border-slate-600 rounded-md text-xs font-medium ...">
      <span className={`w-2 h-2 rounded-full ${GRADE_DOT[grade]}`} />
      <span className="text-slate-200">{name_kr}</span>
      <svg ... />  {/* chevron */}
    </button>

    {/* 보조 품목 — "비교 추가" 버튼 또는 chip */}
    <button className="flex items-center gap-1 h-8 px-3 bg-transparent border border-dashed border-slate-600 rounded-md text-slate-400 hover:text-slate-200 hover:border-slate-500 text-xs">
      <span>비교 추가</span><span className="text-base leading-none">+</span>
    </button>

    <div className="w-px h-5 bg-slate-700" />

    {/* 뷰 탭 */}
    <nav className="flex items-center gap-1">
      <button className={`h-7 px-3 rounded text-xs font-medium ${active ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
        {tab.label}
      </button>
    </nav>
  </div>

  <div className="flex items-center gap-3">
    <FreshnessChip />
    <button className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-800 border border-slate-700 text-slate-400 hover:text-white text-xs">?</button>
  </div>
</header>
```

### 3.2 분석
- 서비스명 logo가 `#e24b4a` (anomaly high 색) — 시맨틱 충돌. anomaly 빨강과 brand 빨강이 같으면 인지 혼란.
- 탭 active `bg-slate-700` (단순 회색). brand 색 없음 → 어느 탭이 활성인지 약함.
- 드롭다운 chevron 11px slate-500 — 보이지 않음.
- 보조 품목 "비교 추가" 점선 보더 — 좋은 시각적 hint.

### 3.3 권장 변경

**logo 색 변경**:
- anomaly 색과 분리. brand primary (`#5b8cff`) 또는 새 brand color.
- 또는 더 추상적인 logo SVG (현재는 line chart 미니어처).

**탭 active 강조**:
```tsx
className={`h-8 px-4 rounded-md text-sm font-medium transition-all ${
  activeTab === tab.id
    ? 'bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] border border-[var(--brand-primary)]/30'
    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
}`}
```
- active: brand 배경 (15% 투명도) + brand 텍스트 + 보더. 한 눈에 보임.
- inactive: hover 시 약한 배경.

**드롭다운 chevron 강화**:
- 색 `text-slate-500` → `text-slate-400`. 크기 11 → 14.
- 회전 transition duration 200ms.

**높이/패딩**:
- `h-14 px-5` → `h-16 px-6` (호흡감 + 시각 무게).
- 버튼 `h-8` → `h-9` (32 → 36).

**구분선**:
- 현 `w-px h-5 bg-slate-700` (얇은 세로 라인).
- 권장 유지. 다만 `bg-slate-700` → `bg-slate-700/50`로 더 미묘하게.

### 3.4 드롭다운 (open 시) — 둘 다

현재:
```tsx
<div className="absolute top-full left-0 mt-1 w-48 bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-1 max-h-72 overflow-y-auto">
  {grouped.map(({ cluster, items }) => (
    <div key={cluster}>
      <div className="px-3 py-1 text-[10px] text-slate-500 font-medium uppercase tracking-wide border-t border-slate-700/50 first:border-t-0">
        {CLUSTER_LABELS[cluster]}
      </div>
      {items.map((c) => (
        <button className="w-full flex items-center gap-2 px-3 py-1.5 text-xs ...">
          <span className={`w-1.5 h-1.5 rounded-full ${...}`} />
          {c.name_kr}
        </button>
      ))}
    </div>
  ))}
</div>
```

권장:
- `w-48` → `w-56`. 라벨 잘림 방지.
- 클러스터 헤더: `text-[10px]` → `text-[11px]`, `tracking-wide` → `tracking-widest` (uppercase 강조).
- 항목 `py-1.5 text-xs` → `py-2 text-sm`. spacing 호흡.
- active 항목 `bg-slate-700/50` → `bg-[var(--brand-primary)]/15 text-[var(--brand-primary)]`.
- 드롭다운 진입 모션: `motion-fade-in` (200ms) — `01 §6.2` 참고.

---

## 4. FilterBar — `src/components/layout/FilterBar.tsx`

### 4.1 현재 (높이 48, 가로 20px, **whitespace-nowrap** — 최근 추가)

```tsx
<div className="flex flex-nowrap items-center gap-3 h-12 px-5 bg-slate-900 border-b border-slate-700/60 shrink-0 whitespace-nowrap">
  {/* 기간 프리셋 */}
  <div className="flex items-center gap-1 shrink-0">
    <span className="text-slate-500 text-[10px] mr-1">기간</span>
    <div className="flex items-center bg-slate-800/60 border border-slate-700 rounded-md p-0.5">
      {PERIOD_PRESETS.map((p) => (
        <button className={`h-6 px-2.5 rounded text-[11px] font-medium ${active ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
          {p.label}
        </button>
      ))}
    </div>
  </div>

  <div className="w-px h-5 bg-slate-700 shrink-0" />

  {/* 사건 필터 (드롭다운) */}
  <button className="flex items-center gap-1.5 h-7 px-2.5 border rounded text-xs ...">
    <svg ... />사건{count > 0 ? ` (${count})` : ''}<svg chevron ... />
  </button>

  <div className="w-px h-5 bg-slate-700 shrink-0" />

  {/* 신뢰도 / 패턴 / (raw-prices만) 레이아웃 */}
  {/* 동일 토글 그룹 패턴 반복 */}

  {/* 우측: 구간 on/off */}
  <div className="flex items-center gap-2 ml-auto shrink-0">
    <span className="text-slate-500 text-[10px]">구간</span>
    {availableSegments.map((seg) => (
      <button className="flex items-center gap-1.5 bg-transparent border-0 p-0">
        <span className="text-slate-300 text-[11px] font-mono">{label}</span>
        <span className={`relative w-7 h-3.5 rounded-full ${isOn ? 'bg-emerald-500/70' : 'bg-slate-700'}`}>
          <span className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white ${isOn ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
        </span>
      </button>
    ))}
  </div>
</div>
```

### 4.2 분석
- 라벨 텍스트 `text-[10px] text-slate-500` — 매우 작고 흐림.
- 토글 그룹 내부 버튼 active 색 `bg-slate-600 text-white` — 단순 회색.
- 세로 구분선 다수 (`w-px h-5 bg-slate-700`) — 시각적 노이즈 가능.
- 구간 on/off 토글 (스위치 형) — 다른 곳에 없는 디자인. 자체 일관성 OK.

### 4.3 권장 변경

**라벨 강화**:
```tsx
<span className="text-slate-400 text-[11px] font-medium uppercase tracking-wider mr-1.5">기간</span>
```
- 색 `slate-500` → `slate-400`. 크기 10 → 11. `font-medium uppercase tracking-wider`로 헤더 느낌.

**토글 그룹 active**:
```tsx
className={`h-7 px-3 rounded text-xs font-medium transition-all ${
  active ? 'bg-[var(--brand-primary)] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
}`}
```
- active: brand 색 solid (탭과 일관). 그림자 추가.
- inactive: hover 시 약 배경.

**세로 구분선 정리**:
- 현재 `bg-slate-700` opacity 100% → `bg-slate-700/40` 권장. 미묘.
- 또는 제거하고 `gap-4` 또는 `gap-5`로 spacing만으로 구분.

**높이/padding**:
- `h-12 px-5` → `h-14 px-6`. 호흡감.
- 토글 그룹 내부 버튼 `h-6` → `h-7`. 클릭 영역 확장.

**구간 on/off 토글 정비**:
- 현재 `bg-emerald-500/70` (on) / `bg-slate-700` (off).
- 권장: on `bg-[var(--brand-primary)]` / off `bg-slate-700`. brand 일관.
- 핸들 `w-2.5 h-2.5` → `w-3 h-3` 약간 크게.

---

## 5. FreshnessChip — `src/components/layout/FreshnessChip.tsx`

### 5.1 현재

```tsx
<div className="flex items-center gap-2 h-7 px-2.5 bg-slate-800/60 border border-slate-700/60 rounded-md text-xs">
  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
  <span className="text-slate-300">{baseLabel} 기준 · 다음 갱신 {nextLabel} 예정</span>
</div>
```

Loading:
```tsx
<div className="... border-dashed border-slate-700 ...">
  <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
  <span className="text-slate-500 animate-pulse">…</span>
</div>
```

### 5.2 분석
- 28px 높이, 좁은 텍스트. dot은 6px (`w-1.5 h-1.5`).
- emerald-500 dot — 데이터 정상 신호. 좋음.
- 텍스트 한 줄. 한국어로 적절.

### 5.3 권장 변경
- `h-7` → `h-8` (28 → 32).
- text-xs 유지. dot `w-2 h-2` (8px). 펄스 모션 추가 옵션:
```tsx
<div className="w-2 h-2 rounded-full bg-emerald-400 animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
```
- emerald 약한 glow → "라이브 데이터" 느낌.

### 5.4 빈 상태 / 오래된 데이터
- 현재 분기 없음 (data 있으면 OK / loading이면 dashed).
- 향후: `data_up_to`가 90일 이상 과거면 dot `bg-amber-500` + 텍스트 `text-amber-300`. 디자인 변경 시 분기 추가 검토.

---

## 6. 변경 체크리스트 (이 파일 기준)

- [ ] AppShell `bg-slate-900` 톤 정비
- [ ] AppShell main padding `p-6` 유지 또는 `px-8 py-6`
- [ ] Banner 높이 `h-10` → `h-12`
- [ ] Banner chip 높이 `h-5` → `h-6`, 텍스트 10px → 12px
- [ ] Banner NEW 배지 인라인 → 카드형
- [ ] Header `h-14 px-5` → `h-16 px-6`
- [ ] Header 서비스명 logo 색 anomaly 색과 분리
- [ ] Header 탭 active `bg-slate-700` → brand 색
- [ ] Header 드롭다운 너비 / spacing 정비
- [ ] FilterBar 라벨 typography 강화
- [ ] FilterBar 토글 그룹 active brand 색
- [ ] FilterBar 세로 구분선 opacity 약화
- [ ] FilterBar 구간 on/off 스위치 색 brand 정합
- [ ] FreshnessChip 높이 +4, dot +2, 펄스 추가
