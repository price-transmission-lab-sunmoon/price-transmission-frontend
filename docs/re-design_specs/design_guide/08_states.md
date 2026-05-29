# 08. States (Loading · Empty · Error · Disabled)

> 데이터 상태 4종의 시각 표준. 현재는 텍스트 + opacity로만 표현 → 사용자 인지 부담.
> 일러스트·아이콘·구조화된 메시지로 정비.

---

## 1. Loading

### 1.1 현재 사용 패턴 (관찰)

| 컴포넌트 | 현 구현 |
|---|---|
| Banner | `<div className="h-4 w-64 bg-slate-700 rounded animate-pulse" />` |
| FreshnessChip | `<span className="animate-pulse">…</span>` + dashed border |
| Header 품목 드롭다운 | `<span className="text-slate-400">품목 로딩 중...</span>` |
| FilterBar 이벤트 dropdown | `<div className="px-3 py-2 text-xs text-slate-500">이벤트 로딩 중...</div>` |
| StreamChart | `<div className="...">로딩 중…</div>` |
| ScatterChart | `<div className="...">데이터 불러오는 중…</div>` |
| RawPricesChart | `<div className="...">데이터 로딩 중...</div>` |
| Minimap | `<div className="...animate-pulse" />` (skeleton) |
| Panel 섹션 inline 차트 | `<div className="...">로딩 중…</div>` |
| MethodologyView | `<LoadingSkeleton rows={N} />` — 막대 3개 animate-pulse |

**문제**:
- 메시지 통일 안 됨 ("로딩 중…", "데이터 불러오는 중…", "데이터 로딩 중...", "품목 로딩 중...").
- skeleton 와 텍스트 메시지 혼재.
- pulse 강도가 약해 시각적 진행 hint 부족.

### 1.2 권장 표준

**3단계 loading 패턴**:

**A. 최상위 페이지 / 큰 영역** — Skeleton shimmer
```tsx
<div className="space-y-3" aria-busy="true" aria-live="polite">
  <div className="h-5 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 rounded-md animate-shimmer" style={{ width: '60%', backgroundSize: '200% 100%' }} />
  <div className="h-5 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 rounded-md animate-shimmer" style={{ width: '85%', backgroundSize: '200% 100%' }} />
  <div className="h-5 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 rounded-md animate-shimmer" style={{ width: '75%', backgroundSize: '200% 100%' }} />
</div>
```

```css
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.animate-shimmer {
  animation: shimmer 1.6s linear infinite;
}
```

**B. 중간 영역 (chart, card)** — Spinner + 메시지
```tsx
<div className="flex flex-col items-center justify-center gap-3 h-full text-center" aria-busy="true">
  <svg className="w-8 h-8 text-slate-500 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="60 20" strokeLinecap="round" />
  </svg>
  <span className="text-slate-400 text-sm">데이터를 불러오는 중…</span>
</div>
```

**C. 작은 UI (chip, button)** — 점 3개 또는 inline pulse
```tsx
<span className="inline-flex items-center gap-1">
  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-[bounce_0.6s_ease-in-out_0s_infinite]" />
  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-[bounce_0.6s_ease-in-out_0.15s_infinite]" />
  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-[bounce_0.6s_ease-in-out_0.3s_infinite]" />
</span>
```

또는 단순 텍스트:
```tsx
<span className="text-slate-500 animate-pulse">…</span>
```

### 1.3 통일 메시지

| 영역 | 표준 메시지 |
|---|---|
| 페이지 첫 로드 | (skeleton만, 텍스트 없음) |
| chart 영역 | "데이터를 불러오는 중…" |
| 인라인 (드롭다운) | "로딩 중…" |
| chip / button | (스피너 또는 점 3개만) |

### 1.4 ARIA

모든 loading 컨테이너에 `aria-busy="true" aria-live="polite"` 추가. 스크린 리더가 상태 변화 인지.

---

## 2. Empty

### 2.1 현재 사용 패턴

| 컴포넌트 | 현 메시지 |
|---|---|
| Banner (total=0) | "이번 달 탐지된 이상이 없습니다" |
| StreamChart | "이 기간에는 탐지된 이상이 없습니다." + "필터 기간을 넓히거나 다른 품목을 살펴보세요." |
| ScatterChart 빈 포인트 | "이 기간에는 관측 데이터가 없습니다." (chip 형) |
| ScatterChart anomaly 없음 | "이 기간에는 이상 탐지 관측치가 없습니다" (chip 형) |
| RawPricesChart | "이 기간에는 데이터가 없습니다." |
| Panel 패널 닫힘 (이상 없음) | "이 품목에는 현재 기간 내 / 탐지된 이상이 없습니다." + "필터 기간을 넓히거나 다른 품목을 살펴보세요." + 추천 품목 리스트 |
| Panel 추천 품목 | "이달 이상 탐지 품목" |
| Minimap | "전체 기간 데이터 없음" |
| Inline chart | "해당 기간 데이터가 없습니다." |

**문제**:
- 일러스트 부재 (텍스트만).
- 일부는 "다음에 무엇을 할지" 안내 (StreamChart) / 일부는 안내 없음.
- chip 형(작은) vs 큰 메시지 일관성 부족.

### 2.2 권장 표준

**A. 대형 빈 상태 (전체 차트 영역)**:
```tsx
<div className="flex flex-col items-center justify-center gap-4 h-full p-8 text-center">
  <div className="w-16 h-16 rounded-full bg-slate-800/60 flex items-center justify-center">
    <svg className="w-8 h-8 text-slate-500" viewBox="0 0 24 24" fill="none">
      {/* 컨텍스트별 아이콘 — chart, search, inbox 등 */}
      <path d="M3 3v18h18M7 14l3-3 4 4 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
  <div className="flex flex-col gap-1.5 max-w-sm">
    <h3 className="text-slate-100 text-base font-semibold">이 기간에는 탐지된 이상이 없습니다</h3>
    <p className="text-slate-400 text-sm leading-relaxed">필터 기간을 넓히거나 다른 품목을 살펴보세요.</p>
  </div>
  {/* 선택적: 빠른 액션 버튼 */}
  <div className="flex items-center gap-2 mt-2">
    <button className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-md transition-colors">
      전체 기간 보기
    </button>
    <button className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-md transition-colors">
      다른 품목
    </button>
  </div>
</div>
```

**B. 중형 (chip 오버레이)**:
```tsx
<div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700 backdrop-blur text-slate-300 text-xs">
  <svg className="w-3.5 h-3.5 text-slate-500" ...></svg>
  <span>이 기간에는 관측 데이터가 없습니다</span>
</div>
```

**C. 인라인 (작은 차트)**:
```tsx
<div className="flex flex-col items-center justify-center gap-2 text-slate-500 text-xs" style={{ height }}>
  <svg className="w-6 h-6 opacity-40" ...></svg>
  <span>해당 기간 데이터 없음</span>
</div>
```

### 2.3 메시지 톤 통일

- "이 기간에는 / 이 품목에는 / 현재" → 문맥 명시.
- "탐지된 이상이 없습니다" / "데이터가 없습니다" → 정확한 의미.
- 다음 행동 제안 (CTA 텍스트만 또는 버튼): "필터 기간 확장" / "다른 품목" 등.

---

## 3. Error

### 3.1 현재 사용 패턴

| 컴포넌트 | 현 구현 |
|---|---|
| Banner | (없음, fallback null) |
| StreamChart | "데이터를 불러오지 못했습니다" |
| ScatterChart `COMMODITY_NOT_FOUND` | "해당 품목 데이터가 없습니다." |
| ScatterChart 기타 | "데이터를 불러오지 못했습니다." + apiError.message subtitle |
| RawPricesChart | "데이터를 불러올 수 없습니다." |
| Minimap | "전체 기간 데이터 없음" (구분 모호) |
| MethodologyView | `<ErrorBanner message="..." />` (chip 형, red-900/20) |
| Toast (error variant) | `bg-red-700 text-white` |
| ErrorBoundary | "오류가 발생했습니다. 페이지를 새로고침 해주세요." |

**문제**:
- 메시지 일관성 ("못했습니다" / "없습니다" 혼재).
- 에러 코드/원인 표시 없음. 재시도 액션 없음 (Toast에만 있음).

### 3.2 권장 표준

**A. 대형 에러 (chart 전체 실패)**:
```tsx
<div className="flex flex-col items-center justify-center gap-4 h-full p-8 text-center">
  <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
    <svg className="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="none">
      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
  <div className="flex flex-col gap-1.5 max-w-sm">
    <h3 className="text-slate-100 text-base font-semibold">데이터를 불러오지 못했습니다</h3>
    <p className="text-slate-400 text-sm leading-relaxed">{message ?? '잠시 후 다시 시도해주세요.'}</p>
    {errorCode && (
      <span className="text-slate-600 text-[10px] font-mono mt-1">({errorCode})</span>
    )}
  </div>
  <button onClick={onRetry}
          className="mt-2 px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg border border-slate-700 transition-colors">
    다시 시도
  </button>
</div>
```

**B. 인라인 에러 (섹션 내)**:
```tsx
<div className="flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
  <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" ...></svg>
  <div className="flex-1 min-w-0">
    <p className="text-red-300 text-sm leading-relaxed">{message}</p>
    {errorCode && <p className="text-red-400/60 text-[11px] font-mono mt-0.5">({errorCode})</p>}
  </div>
  {onRetry && (
    <button onClick={onRetry} className="shrink-0 text-xs font-semibold text-red-200 hover:text-red-100 underline">
      재시도
    </button>
  )}
</div>
```

**C. Toast (이미 06_modals_overlays.md에서 정의)**:
- variant=`error`로 표시.
- 자동 dismiss 8초.
- `onRetry` 시 재시도 버튼.

### 3.3 메시지 톤 통일

표준 형식:
- 1차 (제목): "데이터를 불러오지 못했습니다" / "[기능명]을 실행하지 못했습니다"
- 2차 (본문): "잠시 후 다시 시도해주세요" 또는 구체적 원인
- 3차 (메타): 에러 코드 (`FE-API-001` 등) — `font-mono text-[10px]`

특수 케이스:
- `COMMODITY_NOT_FOUND`: "선택한 품목 데이터가 아직 없습니다" (404와 다른 톤)
- `NOT_IMPLEMENTED`: "이 기능은 백엔드 구현 후 표시됩니다" (warning amber로)
- `WHOLESALE_NOT_AVAILABLE`: "이 품목은 도매가 데이터가 없어 / 자동으로 다른 레이아웃으로 전환됩니다" (info, Toast)

---

## 4. Disabled

### 4.1 현재 사용 패턴

| 컴포넌트 | 현 구현 |
|---|---|
| Header 드롭다운 (commoditiesLoading) | `disabled:cursor-not-allowed disabled:opacity-60` |
| RawPricesChart 소스 토글 (wholesale 미지원) | `disabled:cursor-not-allowed`, opacity 0.4, border #475569, color #64748b |
| FilterBar 구간 토글 (`segmentsDisabled`) | `<span>—</span>` 표시 |

**문제**:
- opacity로만 disabled 표시 → 시각적 노이즈.
- 일부는 "—" placeholder, 일부는 dimmed → 일관성 부족.

### 4.2 권장 표준

**A. 버튼 disabled**:
```tsx
<button disabled={isDisabled}
        className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                   bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100
                   disabled:bg-slate-900 disabled:text-slate-600 disabled:cursor-not-allowed disabled:hover:bg-slate-900">
  {label}
</button>
```

핵심:
- disabled 시: 배경 더 어둡게 + 텍스트 매우 어둡게 + cursor.
- hover 효과 disabled 시 비활성.

**A-2. 토글 그룹 disabled item**:
```tsx
<button disabled={isDisabled}
        aria-disabled={isDisabled}
        title={isDisabled ? '이 품목은 도매가 데이터가 없습니다' : undefined}
        className="...
                   disabled:opacity-30 disabled:cursor-not-allowed">
  {label}
</button>
```
- tooltip(`title` attr) 으로 disabled 이유 안내.
- opacity 30% — 명백히 인지 가능.

**B. 입력 disabled** (현재 없으나 향후):
```tsx
<input disabled={isDisabled}
       className="bg-slate-900 border border-slate-700 text-slate-300 px-3 py-2 rounded-md
                  disabled:bg-slate-950 disabled:border-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed" />
```

**C. 영역 전체 disabled** (`segmentsDisabled` 같은):
```tsx
<div className="opacity-40 pointer-events-none select-none" aria-disabled="true">
  {children}
  {/* 또는 placeholder */}
</div>
```

또는 placeholder:
```tsx
<span className="text-slate-600 text-xs">—</span>
```
- 현재 코드 그대로 유지 가능. 다만 placeholder 색을 `slate-700`까지 어둡게.

### 4.3 Tooltip on disabled

가능하면 disabled 이유를 hover tooltip으로:
- HTML `title` attr (단순).
- 또는 lib 없이 CSS hover로 표시 (복잡).

권장: 단순 `title` attr 사용. 접근성 양호.

---

## 5. 일러스트 가이드

복잡한 일러스트 도입은 비용 큼. 다음 단계로 진행:

### 5.1 단계 0 — 아이콘만 (즉시 적용 가능)

`heroicons` 또는 `lucide-react` 같은 lib 도입 OR SVG path 직접 박기. 본 가이드는 직접 path 권장 (의존 추가 없음).

용도별 아이콘:
- Empty (이상 없음): `chart-bar-square` 또는 `inbox-stack`.
- Empty (검색 결과 없음): `magnifying-glass`.
- Error: `exclamation-triangle`.
- Warning (NOT_IMPL): `clock` 또는 `wrench-screwdriver`.
- Info: `information-circle`.
- Success: `check-circle`.

크기:
- 대형 (페이지 빈 상태): `w-8 h-8` 컨테이너 `w-16 h-16 rounded-full bg-*-500/10`.
- 인라인: `w-5 h-5`.
- 작은 (chip): `w-3.5 h-3.5`.

### 5.2 단계 1 — 컴포넌트화

```tsx
// src/components/ui/EmptyState.tsx
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  variant?: 'default' | 'error' | 'warning';
}

export function EmptyState({ icon, title, description, action, variant = 'default' }: EmptyStateProps) {
  const iconBgClass = {
    default: 'bg-slate-800/60',
    error: 'bg-red-500/10 border-red-500/30',
    warning: 'bg-amber-500/10 border-amber-500/30',
  }[variant];
  // ... 렌더
}
```

이 컴포넌트로 stream/scatter/raw-prices 빈 상태 통일.

### 5.3 단계 2 — SVG 일러스트 (선택, 큰 작업)

브랜드 아이덴티티가 정립되면 SVG 일러스트 1~3 종 제작. Heroicons 무료 — 또는 Figma → SVG export.

---

## 6. 변경 체크리스트

- [ ] `animate-shimmer` keyframes index.css 추가
- [ ] LoadingSkeleton 컴포넌트 만들거나 MethodologyView 것 재사용
- [ ] Spinner 통일 (SVG circle stroke-dasharray)
- [ ] EmptyState 컴포넌트 신설 (`src/components/ui/EmptyState.tsx`)
- [ ] StreamChart / ScatterChart / RawPricesChart 빈 상태 → EmptyState 사용
- [ ] inline 차트 빈 상태 → EmptyState `variant=inline`
- [ ] ErrorState 컴포넌트 신설 또는 EmptyState `variant=error` 활용
- [ ] Toast variant 아이콘 추가 (06_modals_overlays.md 참고)
- [ ] 모든 disabled 요소에 `title` attr (이유 안내)
- [ ] FilterBar `segmentsDisabled` 시 "—" → 적절한 placeholder
- [ ] ARIA 속성 (`aria-busy`, `aria-live`, `aria-disabled`) 추가
