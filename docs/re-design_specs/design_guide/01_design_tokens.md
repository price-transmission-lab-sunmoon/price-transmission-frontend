# 01. 디자인 토큰

> color · typography · spacing · radius · shadow · motion · z-index — 6+1축 토큰 정의.
> 이 파일의 토큰을 먼저 정하면 그 다음 컴포넌트별 가이드(`02`~`06`)는 자동으로 따라옴.

---

## 1. Color

### 1.1 현재 사용 색상 (실측)

**Tailwind 클래스 빈도 (전 src grep)**

| 카테고리 | 사용 토큰 |
|---|---|
| 배경 (slate) | `bg-slate-900`(root) / `slate-800` / `slate-800/40` / `slate-800/60` / `slate-800/90` / `slate-700` / `slate-700/20~60` |
| 텍스트 (slate) | `text-white` / `slate-100/200/300/400/500/600/700` |
| 보더 (slate) | `border-slate-600` / `slate-700` / `slate-700/30~60` |
| 액센트 | `bg-blue-600/80` `bg-cyan-600` `bg-emerald-500` `bg-red-700` `bg-yellow-600` `bg-amber-900/15` |
| 텍스트 액센트 | `text-blue-300/400` `text-cyan-300/400` `text-red-300/400` `text-orange-300` `text-lime-300` `text-amber-200/90` `text-yellow-400` `text-purple-300` `text-teal-300` |
| 보더 액센트 | `border-amber-500/40` `border-red-800/40` `border-blue-700/50` `border-purple-700/50` `border-teal-700/50` `border-cyan-600/800` `border-lime-500/40` |

**`colorUtils.ts` SoT 색상**

```ts
ANOMALY_COLORS = {
  high: '#e24b4a',    // 빨강 (Tailwind red-500 가까움)
  medium: '#ef9f27',  // 주황 (orange-400 가까움)
  reference: '#c8d850', // 라임 (lime-400 가까움)
}
SEGMENT_COLORS_PRIMARY = {
  A: '#3b82f6',       // blue-500
  B: '#22c55e',       // green-500
  D_prime: '#f97316', // orange-500
  C: '#94a3b8',       // slate-400 (PM 미정)
  D: '#64748b',       // slate-500 (PM 미정)
}
SEGMENT_COLORS_SECONDARY = { A: '#06b6d4', B: '#a855f7', D_prime: '#ec4899', C/D: slate }
RAW_PRICE_COLORS = {
  intl_price_krw: '#a855f7',   // purple-500
  import_price_usd: '#3b82f6', // blue-500
  ppi: '#22c55e',              // green-500
  wholesale_price: '#f97316',  // orange-500
  cpi: '#e24b4a',              // anomaly.high와 동일
}
PANEL_CHART_COLORS = {
  transmissionRateLine: '#1f77b4',  // d3 default
  rollingMeanLine: '#666666',
  q1q3Band: '#aaaaaa',
  zscoreLine: '#9467bd',            // d3 default
  zscoreWarningLine: '#ef9f27',
  zscoreAlertLine: '#e24b4a',
  ectLine: '#2ca02c',               // d3 default
  ectZeroLine: '#000000',
  irfFullLine: '#000000',
  irfSubperiodLine: '#cccccc',
  irfConfidenceBand: '#1f77b4',
  irfPeakMarker: '#e24b4a',
  mlMapHighlight: '#e24b4a',
  mlMapNormalFill: '#94a3b8',
  iqrBoxFill: '#cbd5e1',
  iqrMedianLine: '#475569',
  iqrCurrentMarker: '#e24b4a',
  asymmetryUpBin: '#f97316',
  asymmetryDownBin: '#06b6d4',
  breakpointsLine: '#e24b4a',
  detectionMarker: '#e24b4a',
}
```

**문제점**:
- `PANEL_CHART_COLORS`에 d3 default (`#1f77b4`, `#9467bd`, `#2ca02c`, `#666666`, `#aaaaaa`, `#cccccc`, `#000000`) 7종 섞임 → UI brand와 톤 불일치.
- `RAW_PRICE_COLORS.cpi`(`#e24b4a`) === `ANOMALY_COLORS.high` 충돌. RawPrices 뷰에서 CPI 곡선과 anomaly 노드 색이 같음 → 시각 혼란.
- `SEGMENT_COLORS_PRIMARY` (vivid) ↔ `SEGMENT_COLORS_SECONDARY` (다른 hue) — 같은 segment라도 색이 완전 다름. 보조 품목 비교 시 인지 부담.

### 1.2 변경 방안

**옵션 A: slate 베이스 유지 + brand 정의** (보수적, 권장)
- Background scale 그대로 (`slate-900/800/700`).
- **Brand primary** 도입 1색 — 예: `#5b8cff` (refined blue) 또는 `#06b6d4` (cyan-500, 이미 OnboardingGuide CTA 색).
- 액센트 산발 (red-700, yellow-600, blue-300, cyan-300, lime-300, purple-300, teal-300, amber-200) → 4종으로 축소: success(emerald-400), warning(amber-300), error(red-400), info(brand).

**옵션 B: 베이스 변경** (대담)
- Background: `slate` → `zinc` (warmer) 또는 `neutral` (true gray).
- Text contrast 보존: `text-slate-300` → `text-zinc-300` 1:1 매핑.
- 단점: 모든 grep 치환 필요. 양 큼.

**옵션 C: 듀얼 톤** (다크 + 라이트)
- 본 가이드 범위 외. 별 작업으로 분리 권장.

### 1.3 권장 토큰 정의 (옵션 A 기준)

```ts
// src/utils/colorUtils.ts에 추가 또는 src/utils/theme.ts 신설
export const BRAND = {
  primary: '#5b8cff',       // 메인 인터랙션 (탭 active, CTA)
  primaryHover: '#7aa3ff',
  primaryMuted: '#5b8cff20',
} as const;

export const SEMANTIC = {
  success: '#34d399',   // emerald-400
  warning: '#fbbf24',   // amber-400
  error: '#f87171',     // red-400
  info: '#5b8cff',      // BRAND.primary
} as const;

export const NEUTRAL = {
  // 배경 스케일 (가장 어두운 → 밝은)
  bgRoot: '#0f172a',      // slate-900
  bgSurface: '#1e293b',   // slate-800
  bgRaised: '#334155',    // slate-700
  bgInteractive: '#475569', // slate-600
  // 텍스트 스케일 (밝은 → 어두운)
  textPrimary: '#f8fafc',   // slate-50
  textSecondary: '#cbd5e1', // slate-300
  textTertiary: '#94a3b8',  // slate-400
  textMuted: '#64748b',     // slate-500
  textDisabled: '#475569',  // slate-600
  // 보더
  borderStrong: '#334155',
  borderWeak: '#1e293b',
} as const;
```

**적용 규칙**:
- 버튼·탭 active: `BRAND.primary`
- 모든 success indicator (FreshnessChip dot, 통과 ✓): `SEMANTIC.success`
- 모든 warning (NOT_IMPL, NEW): `SEMANTIC.warning`
- 모든 error (Toast error, anomaly high 외 UI error): `SEMANTIC.error`
- chart palette는 `07_chart_palette.md`에서 별도 정의.

---

## 2. Typography

### 2.1 현재 사용 (실측)

| 클래스 | 빈도 | 크기 |
|---|---|---|
| `text-xs` | 63 | 12px |
| `text-[10px]` | 32 | 10px |
| `text-sm` | 26 | 14px |
| `text-[11px]` | 21 | 11px |
| `text-[9px]` | 7 | 9px |
| `text-base` | 3 | 16px |
| `text-[8px]` | 2 | 8px |
| `text-lg` | 1 | 18px |

**문제점**:
- 12px 이하가 압도적 → 시각 위계 평탄.
- 9px/10px/11px 임의값 혼재 → spacing scale 위반.
- 가장 큰 게 `text-lg`(18px) 1회 — 위계 최상단이 약함.

### 2.2 권장 타이포 스케일

| 토큰 | Tailwind | px | 용도 |
|---|---|---|---|
| `display` | `text-2xl font-bold` | 24 | (도입 시) 페이지 타이틀 |
| `heading` | `text-base font-semibold` | 16 | 섹션 헤더 (현 MethodologyView SectionHeader) |
| `subhead` | `text-sm font-medium` | 14 | 패널 헤더, 모달 타이틀, 드롭다운 라벨 |
| `body` | `text-sm` | 14 | 본문 / 도움말 본문 |
| `caption` | `text-xs` | 12 | 메인 UI 라벨·버튼·배지 |
| `micro` | `text-[11px]` | 11 | 보조 라벨, footer chip |
| `nano` | `text-[10px]` | 10 | 배지 안, freshness, anomaly chip |

**금지**: `text-[8px]` (가독성 미달), `text-[9px]` (특수 케이스만).

### 2.3 Font weight

| 토큰 | Tailwind | 용도 |
|---|---|---|
| `regular` | (없음, default 400) | 본문 |
| `medium` | `font-medium` (500) | 라벨, 버튼 |
| `semibold` | `font-semibold` (600) | 섹션 헤더, 배지 |
| `bold` | `font-bold` (700) | 강조 (서비스명, NEW, 단계 번호) |

### 2.4 Font family

```js
// tailwind.config.ts theme.extend.fontFamily
fontFamily: {
  sans: ['Pretendard', 'Inter', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
}
```

**Pretendard**: 한글·라틴 일관성 우수. `<link>` 또는 `@import` 필요.
**Inter** 또는 **Geist**: 영문/숫자 fallback.
**JetBrains Mono**: 수치 표시용 (`font-mono`).

### 2.5 Line-height

| 용도 | 클래스 |
|---|---|
| 헤딩 | `leading-tight` (1.25) |
| 본문 | `leading-relaxed` (1.625) — 현재 사용 중. 유지. |
| 좁은 UI 라벨 | `leading-snug` (1.375) |
| 단일 행 | `leading-none` (1) — 화살표·아이콘 |

---

## 3. Spacing

### 3.1 현재 사용

`gap-1/1.5/2/3`, `px-2/2.5/3/4/5`, `py-0.5/1/1.5/2/3`. 모두 Tailwind default 4px scale.

**문제점**:
- `py-0.5` (2px), `px-1.5` (6px) 등 좁은 단위 다용 → 호흡감 부족.
- `gap-1` (4px) 같은 단위가 버튼 그룹에 자주 쓰여 답답.

### 3.2 권장 spacing 정책

**4px base scale 유지**, 다만 컴포넌트별 minimum 정의:

| 컴포넌트 | minimum padding |
|---|---|
| 버튼 (compact) | `h-7 px-3` (28×12+) |
| 버튼 (default) | `h-8 px-4` (32×16+) |
| 버튼 (large) | `h-10 px-5` (40×20+) |
| 입력 | `h-9 px-3` |
| 카드 | `p-4` (16px) — 현재 `p-3` 다수 → 늘림 |
| 섹션 카드 (Methodology) | `p-5` 또는 `p-6` 유지 |
| 모달 | `p-5` |
| 드롭다운 항목 | `px-3 py-2` (현 `py-1.5` → 늘림) |
| 배지 | `px-2 py-0.5` 유지 |
| 컴포넌트 간 gap | `gap-3`(12) 최소, 카드 그룹 `gap-4`(16) |

**금지/축소**: `py-0.5`, `gap-0.5` 사용은 chip·dot·아이콘 정렬에만. 텍스트 컨텐츠엔 사용 금지.

---

## 4. Radius

### 4.1 현재 사용 (혼재)

| Tailwind | px | 용도 (관찰) |
|---|---|---|
| `rounded` | 4 | 배지, 작은 button |
| `rounded-md` | 6 | 드롭다운, 토글 그룹, 버튼 |
| `rounded-lg` | 8 | 패널 섹션, 큰 카드, 모달 헤더 |
| `rounded-xl` | 12 | 메서드 섹션 카드, Help 모달 |
| `rounded-full` | 999 | dot, status indicator, floating btn |

### 4.2 권장 radius 시스템

| 토큰 | px | 용도 (규칙) |
|---|---|---|
| `radius-sm` | 4 | 배지, chip, 작은 토글 |
| `radius-md` | 8 | 일반 카드, 드롭다운, 버튼 |
| `radius-lg` | 12 | 큰 카드, 모달, 패널 섹션 |
| `radius-pill` | 9999 | 원형 (dot, floating, status) |

**규칙**:
- 같은 시각 계층은 같은 radius. 예: 모든 패널 섹션 카드 `radius-lg`, 모든 일반 버튼 `radius-md`.
- 컴포넌트 안의 nested 요소는 부모보다 한 단계 작은 radius. 예: 모달(`lg`) 안 버튼(`md`).

---

## 5. Shadow (Elevation)

### 5.1 현재 사용

| 클래스 | 사용처 |
|---|---|
| (없음) | 카드, 패널, 차트 컨테이너 (대부분) |
| `shadow` (default) | (없음) |
| `shadow-lg` | HelpFloatingButton, Toast |
| `shadow-xl` | 드롭다운, 모달 내부 카드, Pipeline 툴팁, Scatter 툴팁 |
| `shadow-2xl` | HelpModal 본체 |

**문제점**: 카드·패널이 전부 flat. 시각 계층 구분이 border opacity (`/30/40/60`)에만 의존 → 깊이감 빈약.

### 5.2 권장 elevation 시스템

| Level | Tailwind 근사 | 용도 |
|---|---|---|
| `e0` | (없음) | flat 표면 (body, root) |
| `e1` | `shadow-sm` | 카드 (Banner chips, 일반 카드) |
| `e2` | `shadow` | 드롭다운 시작점, Panel 섹션 카드 |
| `e3` | `shadow-md` | 호버 elevated, 활성 카드 |
| `e4` | `shadow-lg` | 떠있는 UI (floating button, toast) |
| `e5` | `shadow-xl` | 모달, 큰 팝오버, 온보딩 툴팁 |
| `e6` | `shadow-2xl` | (예약) 풀스크린 모달, 비상 알림 |

**다크 모드 그림자 보강**: 검정 그림자는 다크 배경에서 약함. 색상 그림자 권장:
```css
.shadow-elevated {
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.04);
}
```
또는 Tailwind plugin으로 정의.

---

## 6. Motion

### 6.1 현재 사용

- `transition-colors`: 거의 모든 hover에 사용 (default duration 150ms).
- `transition-transform`: 드롭다운 화살표 회전 (`rotate-180`), help item 회전.
- `transition-opacity`: 일부 배지.
- `transition-all`: ML bar width.
- CSS `@keyframes anomaly-pulse`: StreamChart high-grade anomaly만.
- `animate-pulse` (Tailwind): Loading skeleton (`<div className="animate-pulse">`).

**문제점**:
- 모든 모션이 color/transform 단순 전환. fade-in, scale-in 같은 입장 모션 없음.
- 드롭다운 / 모달 / 패널 열림은 즉시 표시. easing 없음.

### 6.2 권장 motion 토큰

| 토큰 | duration | easing | 용도 |
|---|---|---|---|
| `motion-instant` | 0ms | linear | 시각 피드백 없음 |
| `motion-fast` | 100ms | ease-out | hover 색 변환 |
| `motion-default` | 200ms | ease-out | dropdown/modal fade-in, 버튼 상태 |
| `motion-emph` | 300ms | cubic-bezier(0.2, 0.8, 0.2, 1) | 패널 열림·닫힘, 큰 요소 |
| `motion-slow` | 500ms | ease-in-out | 강조 진입 (배너, 안내) |

```css
/* index.css */
@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes slide-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes scale-in {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}
.motion-fade-in { animation: fade-in 200ms ease-out; }
.motion-slide-up { animation: slide-up 200ms ease-out; }
.motion-scale-in { animation: scale-in 200ms cubic-bezier(0.2, 0.8, 0.2, 1); }
```

**박제 보존**: StreamChart 줌 모션·후속 transition 금지 정책은 변경 금지 (`CLAUDE.md §StreamChart 설계 계약`).

---

## 7. Z-index

### 7.1 현재 토큰 (`src/utils/zIndex.ts`)

```ts
Z_INDEX = {
  TOAST: 9000,
  MODAL: 8000,
  OVERLAY: 7000,
  DROPDOWN: 200,
  PANEL: 100,
  HEADER: 50,
}
```

### 7.2 위반 사례 (디자인 변경 기회에 정합)

| 컴포넌트 | 현 inline 값 | 권장 |
|---|---|---|
| OnboardingGuide overlay | `zIndex: 8999` | `Z_INDEX.MODAL - 1` 또는 새 `ONBOARDING_OVERLAY` |
| OnboardingGuide spotlight | `zIndex: 9000` | 새 `ONBOARDING_SPOTLIGHT` |
| OnboardingGuide 툴팁 | `zIndex: 9001` | 새 `ONBOARDING_TOOLTIP` |
| HelpModal overlay | `zIndex: 8000` | `Z_INDEX.MODAL` ✓ |
| HelpModal content | `zIndex: 8001` | `Z_INDEX.MODAL + 1` 또는 별 토큰 |
| HelpFloatingButton | `zIndex: 7000` | `Z_INDEX.OVERLAY` ✓ |
| StreamChart tooltip | `zIndex: 9999` | `Z_INDEX.TOAST + 999` 또는 차트 tooltip 전용 토큰 |
| IRFChart tooltip | `zIndex: 9999` | 동상 |
| Header (AppShell) | `z-10` | `Z_INDEX.HEADER` ✓ |
| Banner chip overflow | `z-10` | 정합 (overflow chip 아니라 호버 dropdown 영역) |

### 7.3 권장 토큰 확장

```ts
export const Z_INDEX = {
  HEADER: 50,
  PANEL: 100,
  DROPDOWN: 200,
  CHART_TOOLTIP: 1000,         // 신설 — 차트 hover 툴팁
  OVERLAY: 7000,
  MODAL_OVERLAY: 8000,
  MODAL_CONTENT: 8001,         // 신설
  ONBOARDING_OVERLAY: 8500,    // 신설
  ONBOARDING_SPOTLIGHT: 8501,  // 신설
  ONBOARDING_TOOLTIP: 8502,    // 신설
  TOAST: 9000,
} as const;
```

---

## 8. 토큰 적용 우선순위

디자인 변경 시 한꺼번에 하지 말 것. 다음 순서:

1. **타이포** (`02_layout`, `03_panel` 영향 큼)
2. **spacing** (모든 컴포넌트)
3. **color BRAND/SEMANTIC** (`02`, `04`, `05`)
4. **radius 표준화** (모든 컴포넌트)
5. **shadow elevation 적용** (카드·패널)
6. **motion** (선택 — 큰 작업, 별 단계)
7. **z-index 정합** (mechanical)
8. **chart palette 통합** (`07_chart_palette.md` 별도)

각 단계마다 빌드 + tsc + 시각 확인.
