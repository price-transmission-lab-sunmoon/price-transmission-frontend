# 07. Chart Palette (차트 색상 통합)

> 4개 SoT 객체 (`colorUtils.ts`)에 약 30종 색상이 정의됨. d3 default 7종이 섞여 브랜드 일관성 깨짐.
> 이 문서는 통합 palette 제안 + 색맹/대비 검토 + 적용 가이드.

---

## 1. 현재 색상 인벤토리

### 1.1 ANOMALY_COLORS (3종, SoT)

| Grade | Hex | Tailwind 근사 | 의미 |
|---|---|---|---|
| `high` | `#e24b4a` | red-500 | 고신뢰 (통계+ML 동시) |
| `medium` | `#ef9f27` | orange-400 | 중신뢰 (통계만) |
| `reference` | `#c8d850` | lime-400 | 참고 (ML만) |

**평가**: 빨강→주황→연두 그라데이션 — 신호등 약함. 직관적이지만 lime은 reference로는 시각 무게가 약함 (warning과 혼동 가능성).

### 1.2 SEGMENT_COLORS_PRIMARY (5종)

| Segment | Hex | Tailwind |
|---|---|---|
| `A` | `#3b82f6` | blue-500 |
| `B` | `#22c55e` | green-500 |
| `D_prime` | `#f97316` | orange-500 |
| `C` | `#94a3b8` | slate-400 |
| `D` | `#64748b` | slate-500 |

**평가**: A·B·D' 강한 색, C·D 회색 (PM 미정 상태). 색상 자체는 적절. orange-500은 anomaly.medium(`#ef9f27`)과 비슷한 톤 → 혼동 가능.

### 1.3 SEGMENT_COLORS_SECONDARY (5종)

| Segment | Hex | Tailwind |
|---|---|---|
| `A` | `#06b6d4` | cyan-500 |
| `B` | `#a855f7` | purple-500 |
| `D_prime` | `#ec4899` | pink-500 |
| `C` | `#94a3b8` | slate-400 |
| `D` | `#64748b` | slate-500 |

**평가**: PRIMARY와 완전 다른 hue. 보조 품목 비교 시 사용자가 "A는 항상 파랑"이라 인지하기 어려움. → **인지 부담**.

### 1.4 RAW_PRICE_COLORS (5종)

| Source | Hex | Tailwind |
|---|---|---|
| `intl_price_krw` | `#a855f7` | purple-500 |
| `import_price_usd` | `#3b82f6` | blue-500 |
| `ppi` | `#22c55e` | green-500 |
| `wholesale_price` | `#f97316` | orange-500 |
| `cpi` | `#e24b4a` | red-500 |

**충돌**:
- `cpi`(`#e24b4a`) === `ANOMALY_COLORS.high` 동일.
- `import_price_usd`(`#3b82f6`) === `SEGMENT_COLORS_PRIMARY.A` 동일.
- `ppi`(`#22c55e`) === `SEGMENT_COLORS_PRIMARY.B` 동일.
- `wholesale_price`(`#f97316`) === `SEGMENT_COLORS_PRIMARY.D_prime` 동일.

→ RawPrices 뷰에서 노드 + 라인 색이 겹치며, 다른 탭으로 가도 "이 색이 무엇을 의미하는지" 매 탭마다 재학습 필요.

### 1.5 PANEL_CHART_COLORS (~20종)

```ts
{
  // TransmissionRateChart
  transmissionRateLine: '#1f77b4',   // ★ d3 default
  rollingMeanLine: '#666666',        // ★ 회색
  q1q3Band: '#aaaaaa',               // ★ 회색
  detectionMarker: '#e24b4a',

  // ZScoreChart
  zscoreLine: '#9467bd',             // ★ d3 default (purple)
  zscoreWarningLine: '#ef9f27',
  zscoreAlertLine: '#e24b4a',

  // ECTChart
  ectLine: '#2ca02c',                // ★ d3 default (green)
  ectZeroLine: '#000000',            // ★ 검정

  // IRFChart
  irfFullLine: '#000000',            // ★ 검정
  irfSubperiodLine: '#cccccc',       // ★ 회색
  irfConfidenceBand: '#1f77b4',      // ★ d3 default
  irfPeakMarker: '#e24b4a',

  // MLMapChart
  mlMapHighlight: '#e24b4a',
  mlMapNormalFill: '#94a3b8',

  // IQRBoxplot
  iqrBoxFill: '#cbd5e1',
  iqrMedianLine: '#475569',
  iqrCurrentMarker: '#e24b4a',

  // AsymmetryHistogram
  asymmetryUpBin: '#f97316',
  asymmetryDownBin: '#06b6d4',

  // BreakpointsChart
  breakpointsLine: '#e24b4a',
}
```

**문제**:
1. d3 default 7종 섞임 (`#1f77b4`, `#9467bd`, `#2ca02c`, `#666666`, `#aaaaaa`, `#cccccc`, `#000000`). UI brand와 톤 불일치.
2. `#e24b4a` (anomaly.high) 6회 중복 사용: detectionMarker / zscoreAlertLine / irfPeakMarker / mlMapHighlight / iqrCurrentMarker / breakpointsLine. → 시맨틱은 일관 (모두 "이상치 강조") OK.
3. 검정 (`#000000`) 사용 — 다크 모드에서 안 보임. `ectZeroLine`, `irfFullLine` 문제.

---

## 2. 통합 Palette 제안

### 2.1 설계 원칙

1. **시맨틱 우선**: 같은 의미는 같은 색. anomaly·warning·ok·info 등.
2. **그룹 일관성**: segment A는 어디서나 파랑. SECONDARY는 같은 hue의 다른 밝기 (또는 dashed).
3. **다크 모드 contrast**: `text-slate-100` 배경 `slate-950` 위에서 WCAG AA 통과.
4. **색맹 친화**: red-green 의존 X. 추가 시각 단서 (모양·dash·강도).
5. **d3 default 제거**: `#1f77b4`, `#9467bd`, `#2ca02c` 등 → brand palette로 교체.

### 2.2 통합 토큰 (제안)

```ts
// src/utils/colorUtils.ts — 갱신안

// ── ANOMALY (3종) — 시맨틱 ──────────────────────────
export const ANOMALY_COLORS = {
  high:      '#ef4444',   // red-500 (현 #e24b4a 유지 가능)
  medium:    '#f59e0b',   // amber-500 (현 #ef9f27 유지 가능)
  reference: '#a3e635',   // lime-400 (현 #c8d850 유지 가능 — but 시인성 검토)
} as const;
// 권장: reference를 lime → 약간 어두운 sky/teal 계열로 변경 검토 (배경 무관 시인성)
// export const ANOMALY_COLORS.reference = '#38bdf8'; // sky-400 (대안)

// ── SEGMENT (메인 5종, 보조는 같은 hue 어둡게/dashed) ─
export const SEGMENT_COLORS_PRIMARY = {
  A:        '#3b82f6',    // blue-500
  B:        '#10b981',    // emerald-500 (현 #22c55e green → emerald 권장: 다크 모드 시인성)
  C:        '#a855f7',    // purple-500 (현 slate-400 → 실 색 부여)
  D:        '#ec4899',    // pink-500 (현 slate-500 → 실 색 부여)
  D_prime:  '#f97316',    // orange-500
} as const;

export const SEGMENT_COLORS_SECONDARY = {
  // 동일 hue, 명도 낮춤 + dashed 라인으로 구별
  A:        '#3b82f680',
  B:        '#10b98180',
  C:        '#a855f780',
  D:        '#ec489980',
  D_prime:  '#f9731680',
} as const;
// 또는 hue 유지 + opacity 0.5만 적용 (런타임)

// ── RAW PRICE (5종) — segment와 다른 hue group ────
export const RAW_PRICE_COLORS = {
  intl_price_krw:   '#8b5cf6',   // violet-500 (현 a855f7 유지)
  import_price_usd: '#0ea5e9',   // sky-500 (현 #3b82f6 → segment.A와 분리)
  ppi:              '#14b8a6',   // teal-500 (현 #22c55e → segment.B와 분리)
  wholesale_price:  '#f97316',   // orange-500 (현재 유지)
  cpi:              '#dc2626',   // red-600 (현 #e24b4a → anomaly.high와 약간 분리)
} as const;
// 핵심: segment 색상과 hue 분리. segment=blue/emerald/purple/pink/orange / raw=violet/sky/teal/orange/red

// ── BRAND / SEMANTIC (신설) ───────────────────────
export const BRAND = {
  primary:      '#5b8cff',
  primaryHover: '#7aa3ff',
  primaryMuted: '#5b8cff15',
} as const;

export const SEMANTIC = {
  success: '#34d399',   // emerald-400
  warning: '#fbbf24',   // amber-400
  error:   '#f87171',   // red-400
  info:    '#5b8cff',   // BRAND.primary
} as const;

// ── PANEL CHART (20종) — d3 default 제거 + brand 정합 ─
export const PANEL_CHART_COLORS = {
  // TransmissionRateChart
  transmissionRateLine: BRAND.primary,        // ← #1f77b4 (d3) 폐기
  rollingMeanLine:      '#94a3b8',            // slate-400 (← #666666)
  q1q3Band:             '#475569',            // slate-600 (← #aaaaaa)
  detectionMarker:      ANOMALY_COLORS.high,

  // ZScoreChart
  zscoreLine:           '#a78bfa',            // violet-400 (← #9467bd)
  zscoreWarningLine:    SEMANTIC.warning,
  zscoreAlertLine:      ANOMALY_COLORS.high,

  // ECTChart
  ectLine:              '#34d399',            // emerald-400 (← #2ca02c)
  ectZeroLine:          '#64748b',            // slate-500 (← #000000)

  // IRFChart
  irfFullLine:          '#cbd5e1',            // slate-300 (← #000000)
  irfSubperiodLine:     '#64748b',            // slate-500 (← #cccccc)
  irfConfidenceBand:    BRAND.primary,        // ← #1f77b4
  irfPeakMarker:        ANOMALY_COLORS.high,

  // MLMapChart
  mlMapHighlight:       ANOMALY_COLORS.high,
  mlMapNormalFill:      '#475569',            // slate-600 (← #94a3b8 — 너무 밝음)

  // IQRBoxplot
  iqrBoxFill:           '#334155',            // slate-700 (← #cbd5e1 — 너무 밝음)
  iqrMedianLine:        '#cbd5e1',            // slate-300 (← #475569)
  iqrCurrentMarker:     ANOMALY_COLORS.high,

  // AsymmetryHistogram
  asymmetryUpBin:       '#f97316',            // orange-500 (현재 유지)
  asymmetryDownBin:     '#0ea5e9',            // sky-500 (← #06b6d4)

  // BreakpointsChart
  breakpointsLine:      ANOMALY_COLORS.high,
} as const;
```

### 2.3 색맹 검토 (Deuteranopia·Protanopia)

| 쌍 | 충돌 위험 | 대안 |
|---|---|---|
| anomaly.high (red) vs anomaly.medium (amber) | 빨강-주황 구분 어려움 (적녹색맹) | 모양 변형 추가: high=실선 원, medium=두꺼운 stroke ring |
| segment.A (blue) vs raw.import (sky) | 같은 blue hue → 적녹색맹 영향 적음 | 명도 차이로 OK |
| segment.B (emerald) vs anomaly.reference (lime) | 둘 다 녹색계 → 색맹 환자 구분 어려움 | reference를 lime → sky 또는 cyan으로 변경 (위 §2.2 대안) |
| segment.D' (orange) vs anomaly.medium (amber) | 매우 비슷 | medium을 amber-500 (현 ef9f27) → 약간 어둡게 또는 dash 모양 |

**권장 보강**: 색 외에 모양 단서 추가.
- `high` 노드: 원 + glow + 펄스 (현재).
- `medium` 노드: 원 + 약한 glow (현재).
- `reference` 노드: 작은 원 + outline only (안 채움) — 권장 변경. 현재는 채움.

### 2.4 명도 대비 (WCAG)

배경 `slate-950` (`#020617`) 또는 `slate-900` (`#0f172a`) 위 텍스트:

| 색 | hex | contrast vs slate-900 | 통과 (4.5:1 AA) |
|---|---|---|---|
| `text-slate-100` | `#f1f5f9` | 16.7 | ✓ |
| `text-slate-300` | `#cbd5e1` | 11.6 | ✓ |
| `text-slate-400` | `#94a3b8` | 6.8 | ✓ |
| `text-slate-500` | `#64748b` | 4.1 | ✗ (AA 미달) |
| `text-slate-600` | `#475569` | 2.5 | ✗ |
| ANOMALY.high `#ef4444` | | 4.3 | ✗ (AA 미달, AA Large 통과) |
| ANOMALY.medium `#f59e0b` | | 7.4 | ✓ |
| ANOMALY.reference `#a3e635` | | 11.7 | ✓ |
| BRAND.primary `#5b8cff` | | 5.0 | ✓ |

**시사점**:
- `text-slate-500` 자주 사용되는데 AA 미달. 라벨에 사용은 OK (큰 문제 X) but 본문엔 slate-400 이상 권장.
- `text-slate-600` 거의 안 보임 — 디자인 변경 시 제거 권장 (장식만).
- anomaly.high red는 굵게 + 글로우로 보강 필요.

---

## 3. SoT 변경 적용 가이드

### 3.1 변경 절차

1. **백업**: `colorUtils.ts` 현 상태 git stash 또는 별도 브랜치.
2. **새 색 정의**: `colorUtils.ts`에 BRAND, SEMANTIC 추가 (병행 운영).
3. **PANEL_CHART_COLORS 한 번에 갱신**: d3 default 7종 제거.
4. **타입 체크**: `npx tsc --noEmit`.
5. **시각 검증**: `npm run dev` → 4 탭 모두 확인.
6. **단위 테스트**: 없으면 manual. inline 차트 8종 패널 열어 확인.

### 3.2 색상 변경의 부수효과

- `ANOMALY_COLORS` 변경 → StreamChart 노드 + Banner chip + Panel ConfidenceBadge + ScatterChart 노드 + RawPricesChart 노드 + Methodology 신뢰도 등급 카드 dot. **6 컴포넌트** 영향.
- `SEGMENT_COLORS_PRIMARY` 변경 → StreamChart 라인 + RawPricesChart 매핑 + Minimap 라인 + FilterBar 토글. **4 컴포넌트** 영향.
- `RAW_PRICE_COLORS` 변경 → RawPricesChart + Minimap (raw variant) + Methodology Section6 (사용 시). **3 컴포넌트** 영향.
- `PANEL_CHART_COLORS` 변경 → 패널 inline 차트 8종.

→ 변경 시 git diff로 모든 color 사용처 확인. grep:
```
grep -rn "ANOMALY_COLORS\|SEGMENT_COLORS\|RAW_PRICE_COLORS\|PANEL_CHART_COLORS" src/
```

### 3.3 inline 색상 (직접 hex 박힌 곳) 정비

`07_chart_palette.md` 변경 후 hex 직접 사용 코드 grep 필요:

```bash
grep -rn "#1f77b4\|#9467bd\|#2ca02c\|#666666\|#aaaaaa\|#cccccc\|#000000\|#e24b4a\|#ef9f27\|#c8d850\|#3b82f6\|#22c55e\|#f97316\|#94a3b8\|#64748b\|#06b6d4" src/
```

발견 시 대응:
- 컴포넌트 직접 박힘 → `colorUtils.ts` import로 변경.
- d3 attr inline → 변수 추출 후 사용.

---

## 4. 차트별 권장 색상 매핑 (요약)

| 차트 | 주 라인 | 보조 라인 | 강조 / marker |
|---|---|---|---|
| StreamChart segment | `SEGMENT_COLORS_PRIMARY[seg]` | `SEGMENT_COLORS_SECONDARY[seg]` (보조 품목 dashed) | `ANOMALY_COLORS[grade]` (노드) |
| ScatterChart | (baseline) `BRAND.primary` | (trajectory) `#475569` | `ANOMALY_COLORS[grade]` |
| RawPricesChart | `RAW_PRICE_COLORS[source]` | overlay `#64748b` dashed | `ANOMALY_COLORS[grade]` |
| Minimap (stream) | `SEGMENT_COLORS_PRIMARY[seg]` opacity 0.3 | (없음) | `ANOMALY_COLORS[grade]` 밀도 배경 |
| Minimap (raw) | `RAW_PRICE_COLORS[source]` opacity 0.3 | (없음) | (없음) |
| TransmissionRateChart | `PANEL_CHART_COLORS.transmissionRateLine` (=BRAND.primary) | rollingMean dashed `slate-400` | band `slate-600` 15%, highlight `ANOMALY.high` |
| ZScoreChart | `zscoreLine` (violet-400) | warning/alert threshold dashed | (없음) |
| ECTChart | `ectLine` (emerald-400) | zero line `slate-500` 약한 | (없음) |
| BreakpointsChart | `transmissionRateLine` | bp vertical `ANOMALY.high` dashed | (없음) |
| IQRBoxplot | box fill `slate-700`, median `slate-300` | (없음) | current marker `ANOMALY.high` |
| AsymmetryHistogram | up `orange-500`, down `sky-500` | (없음) | (없음) |
| IRFChart | full `slate-300` | sub `slate-500` | CI band `BRAND.primary` 30%, peak `ANOMALY.high` |
| MLMapChart | (없음) | normal `slate-600` | highlight `ANOMALY.high` |

---

## 5. 변경 체크리스트

- [ ] `colorUtils.ts`에 `BRAND`, `SEMANTIC` 토큰 신설
- [ ] `PANEL_CHART_COLORS` d3 default 7종 제거 → brand 색으로 교체
- [ ] `RAW_PRICE_COLORS` SEGMENT 색상과 hue 분리 (cpi·import·ppi)
- [ ] `SEGMENT_COLORS_PRIMARY` C/D 실색 부여 또는 회색 명시 (PM 확인)
- [ ] `SEGMENT_COLORS_SECONDARY` 동일 hue + 명도/opacity 차이로 통일
- [ ] `ANOMALY_COLORS.reference` lime → sky/cyan 변경 검토 (색맹 친화)
- [ ] 노드 모양 단서 추가 (reference outline-only 등)
- [ ] 검정 (`#000000`) 사용 제거 (ectZeroLine, irfFullLine)
- [ ] grep으로 직접 hex 사용처 발견 + colorUtils import로 정리
