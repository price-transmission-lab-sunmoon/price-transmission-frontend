# Feature 명세서 — 분석 수치 패널

**문서 유형**: Feature 명세서
**브랜치명**: `feat/fe-panel`
**담당자**: 하대수
**작성일**: 2026-05-05
**상태**: 초안

**변경 이력**
- v1 (2026-05-05): 최초 작성
- v2 (2026-05-10): 명세서 정합화 감사 결과 반영 (헤더·본문 구체 버전 제거, judgment_path 키 명세, stat_series_breakpoints fixture 별도 명시, PM 별건 추가)
- v3 (2026-05-14): cross-spec 점검 결과 반영
  - **I6**: 8종 D3 차트 색상 상수를 `src/utils/colorUtils.ts` `PANEL_CHART_COLORS` 객체로 통합. 컴포넌트 내 색상 리터럴 분산 정정 (fe-stream-chart v3 §4.1 SoT 정합)
  - fe-stream-chart v3 §4.1 `ANOMALY_COLORS`·`ANOMALY_RADII` 재사용 명시 (헤더 신뢰도 배지·차트 마커 색상)

---

## ⚠️ 구현 시작 전 필수 확인

| 문서 | 버전 | 참조 목적 | 확인 |
|------|------|-----------|------|
| `web_plan_vN.md §6` | 최신 | 패널 UX (4섹션, 슬라이드인, 너비 드래그, 인라인 그래프) | ☐ |
| `api_spec_vN.md §패널 엔드포인트` | 최신 | `/detail`, `/stat-series`, `/stat-snapshot`, `/irf`, `/ml-map` | ☐ |
| `exception_spec_vN.md §8 feat/fe-panel` | 최신 | FE-API-001~004, FE-D3-001~003, PARSE-NUM-002, PARSE-ARR-002, FE-MOCK-001 | ☐ |
| `feature_dev_list_vN.md §feat/fe-panel` | 최신 | 11개 구현 범위·4개 완료 기준 | ☐ |
| `feature_spec_fe-stream-chart_vN.md §3.2, §4.1` | 최신 | selectedAnomalyId/isPanelOpen 사용·**`colorUtils.ts` SoT 키** | ☐ |
| `feature_spec_fe-layout-filter_vN.md §3.1` | 최신 | useAppStore 구조·SoT 필드명 + `setPrimaryCommodity` 액션 | ☐ |
| `frame_spec_frontend_vN.md §6.2, §8.6` | 최신 | PanelState 슬라이스 정의·D3 위치 | ☐ |

---

## ⚠️ PM 별건 — 결재 대기 항목

| # | 항목 | 충돌 내용 | 본 명세 잠정 채택 |
|---|------|----------|-------------------|
| 1 | OI-15 `/ml-map` projection_method | api_spec 기본값·축 라벨 미정 | `pca` + 응답 `x_label`/`y_label` 그대로 사용 |
| 2 | `judgment_path` 키 1:1 검증 | api_spec_vN §detail D-04 본문과 일치 여부 미검증 | 본 명세 키 채택 (step/label/value/passed) |
| 3 | ROCKET_FEATHER_DIRECTIONS `'symmetric'` | plan_frontend_alignment §9.5 PM 검토 중 | §3.3 ④ AsymmetryHistogram 분기 추가 필요 |
| 4 | `ocsvm` vs `oneclass_svm` 별칭 | manifest §9.3 | `ocsvm` 단일 사용 |
| 5 | CLAUDE.md `anomaly_id` 타입 정정 | string → number | fe-layout-filter PR에서 처리 |

---

## 1. 기능 개요 / 1.2 데이터 흐름 / 1.3 프레임 내 위치 / 1.4 구현 범위

(v2 §1 동일 — AnalysisPanel·4섹션·8종 차트·5종 hooks·PanelState 슬라이스 신규)

---

## 2. 입력 데이터

(v2 §2 동일 — `/detail` 단일 호출 + lazy 4종 + useAppStore 읽기 상태)

---

## 3. 출력 데이터

### 3.1 렌더링 출력 / 3.2 useAppStore 쓰기

(v2 §3.1, §3.2 동일)

### 3.3 시각화 규격 (v3 — colorUtils.ts SoT 통합)

#### ① 패널 컨테이너 / ② 헤더 / ③ 계량경제학 수치 섹션

(v2 §3.3 ①, ②, ③ 동일)

> **헤더 신뢰도 배지 색상 (v3 정정)**: `ANOMALY_COLORS.high/medium/reference` (fe-stream-chart v3 §4.1 import). 리터럴 `#e24b4a` 등 직접 사용 금지.

#### ④ 차트 규격 — colorUtils.ts SoT 통합 (v3 신규 — I6 해소)

본 feat는 `src/utils/colorUtils.ts`에 **`PANEL_CHART_COLORS` 객체를 추가**한다. 8종 차트 색상은 모두 이 SoT에서 import.

```typescript
// src/utils/colorUtils.ts (fe-stream-chart 정의 상수 다음에 추가)

export const PANEL_CHART_COLORS = {
  // TransmissionRateChart
  transmissionRateLine:       '#1f77b4',  // 전이율 곡선
  rollingMeanLine:            '#666666',  // 롤링평균 (dash 4-2)
  q1q3Band:                   '#aaaaaa',  // Q1~Q3 밴드 (opacity 0.15)
  detectionMarker:            '#e24b4a',  // 탐지시점 수직선 (ANOMALY_COLORS.high 재사용 권장)

  // ZScoreChart
  zscoreLine:                 '#9467bd',  // Z-score 곡선
  zscoreWarningLine:          '#ef9f27',  // 주의 임계선 y=2.0 (ANOMALY_COLORS.medium 재사용 권장)
  zscoreAlertLine:            '#e24b4a',  // 경보 임계선 y=2.5 (ANOMALY_COLORS.high 재사용 권장)

  // ECTChart
  ectLine:                    '#2ca02c',  // ECT 곡선 (녹색)
  ectZeroLine:                '#000000',  // y=0 기준선

  // IRFChart
  irfFullLine:                '#000000',  // 전체 곡선 (굵은선)
  irfSubperiodLine:           '#cccccc',  // 하위 기간 곡선 (얇은선들)
  irfConfidenceBand:          '#1f77b4',  // CI 밴드 (opacity 0.2)
  irfPeakMarker:              '#e24b4a',

  // MLMapChart
  mlMapHighlight:             '#e24b4a',  // 현재 포인트 stroke (is_highlight=true)
  mlMapNormalFill:            '#94a3b8',  // 일반 포인트 fill

  // IQRBoxplot
  iqrBoxFill:                 '#cbd5e1',
  iqrMedianLine:              '#475569',
  iqrCurrentMarker:           '#e24b4a',

  // AsymmetryHistogram
  asymmetryUpBin:             '#f97316',  // 상승 분포 (주황)
  asymmetryDownBin:           '#06b6d4',  // 하락 분포 (청록)

  // BreakpointsChart
  breakpointsLine:            '#e24b4a',  // bp_dates 수직선 (dash 4-2)
} as const;
```

**컴포넌트 적용 예시**:

```typescript
// TransmissionRateChart.tsx
import { PANEL_CHART_COLORS, ANOMALY_COLORS } from '@/utils/colorUtils';

// stroke 적용
.attr('stroke', PANEL_CHART_COLORS.transmissionRateLine)
// 탐지시점 수직선은 ANOMALY_COLORS.high 재사용 가능
.attr('stroke', ANOMALY_COLORS.high)
```

**인라인 차트 공통 레이아웃** (v2 표 동일):

| 차트 | 높이 | 사용 색상 키 |
|------|------|--------------|
| TransmissionRateChart | 200px | `transmissionRateLine`, `rollingMeanLine`, `q1q3Band`, `detectionMarker` |
| ZScoreChart | 200px | `zscoreLine`, `zscoreWarningLine`, `zscoreAlertLine` |
| ECTChart | 200px | `ectLine`, `ectZeroLine` |
| BreakpointsChart | 200px | `transmissionRateLine`, `breakpointsLine` |
| IQRBoxplot | 180px | `iqrBoxFill`, `iqrMedianLine`, `iqrCurrentMarker` |
| AsymmetryHistogram | 180px | `asymmetryUpBin`, `asymmetryDownBin` |
| IRFChart | 240px | `irfFullLine`, `irfSubperiodLine`, `irfConfidenceBand`, `irfPeakMarker` |
| MLMapChart | 240px | `mlMapHighlight`, `mlMapNormalFill` |

**개별 차트 명세** (v2 §3.3 ④의 차트별 상세는 동일, 색상만 SoT 키 참조로 변경):

- **TransmissionRateChart**: X축 period (date-fns `parse 'yyyy-MM'`), Y축 transmission_rate, 곡선 `PANEL_CHART_COLORS.transmissionRateLine` (width 1.5), 롤링평균 `rollingMeanLine` (dash 4-2), Q1~Q3 밴드 `q1q3Band` (opacity 0.15), 탐지시점 `ANOMALY_COLORS.high` (width 2)
- **ZScoreChart**: `zscoreLine`, 주의/경보 임계선 (dash 2-2)
- **IQRBoxplot**: 박스 Q1~Q3 `iqrBoxFill`, median 가로선 `iqrMedianLine`, 현재값 마커 `iqrCurrentMarker`
- **IRFChart**: scope='full' `irfFullLine` 굵은선, scope='subperiod' `irfSubperiodLine` 얇은선들, CI 밴드 `irfConfidenceBand` opacity 0.2, peak_horizon 위치 dot + 텍스트
- **MLMapChart**: 모든 points r=3 + anomaly_score 그라데이션, is_highlight=true → stroke `mlMapHighlight` 2px r=6, 축 라벨은 응답 `x_label`/`y_label` 그대로 사용 (PM 별건 #1)
- **AsymmetryHistogram**: 겹친 히스토그램 `asymmetryUpBin`/`asymmetryDownBin` (opacity 0.6), bin 20개, PM 별건 #3 `'symmetric'` 분기 추가 필요
- **BreakpointsChart**: 전이율 곡선 + bp_dates 수직선 `breakpointsLine` (dash 4-2)
- **ECTChart**: `ectLine`, y=0 기준선 `ectZeroLine` (width 0.5), 차트 헤더 라벨 응답 `ect_type` 그대로 표시

#### ⑤ ML 판정 섹션 / ⑥ 판정 경로 섹션 / ⑦ IRF 섹션

(v2 §3.3 ⑤, ⑥, ⑦ 동일)

> **ML 바 차트 색상 (v3 정정)**: `*_anomaly=true` 시 `ANOMALY_COLORS.high`, false 시 `PANEL_CHART_COLORS.mlMapNormalFill`. 리터럴 직접 사용 금지.

---

## 4. 파라미터 제약 조건

(v2 §4 동일 + v3 색상 SoT 표 추가)

| 파라미터 | 관리 위치 | 비고 |
|---------|-----------|------|
| 차트 색상 8종 | `src/utils/colorUtils.ts` `PANEL_CHART_COLORS` | 본 feat가 정의 (v3) |
| 이상 노드 색상·반지름 | `src/utils/colorUtils.ts` `ANOMALY_COLORS`/`ANOMALY_RADII` | fe-stream-chart 정의 (재사용) |
| 패널 너비 | useAppStore PanelState `panelWidth` | 280~520 클램프 |

---

## 5. 예외처리 / 6. 목업 / 8. 금지 사항 / 9. PR 템플릿

(v2 §5, §6, §8, §9 동일 + v3 추가)

### 5.1 적용 예외 코드 (v3 보완)

`PARSE-ENUM-002` / `PARSE-SCHEMA-001` 추가 처리는 v2 §5.1과 동일. 추가로 `FE-API-005` (타임아웃) 명시.

### 7. 완료 기준 (v3 추가)

| 항목 (v3 신규) | 기준 |
|------|------|
| `PANEL_CHART_COLORS` SoT 통합 | grep 검증: 8종 차트 컴포넌트에서 색상 리터럴(`#1f77b4` 등) 직접 사용 0건, 모두 `import { PANEL_CHART_COLORS, ANOMALY_COLORS } from '@/utils/colorUtils'` |
| 헤더 신뢰도 배지 색상 | `ANOMALY_COLORS` 키 사용 — 리터럴 0건 |
| ML 바 차트 색상 | `ANOMALY_COLORS.high` / `PANEL_CHART_COLORS.mlMapNormalFill` 사용 |

### 8. 금지 사항 (v3 추가)

| 금지 사항 (v3 신규) | 이유 |
|-----------|------|
| 차트 컴포넌트 내 색상 리터럴 직접 사용 (`'#1f77b4'`, `'#9467bd'` 등) | `colorUtils.ts` SoT 정책 위반. fe-stream-chart v3 §4.1 일관성 (I6) |
| `PANEL_CHART_COLORS` 외에 본 feat가 별도 색상 객체 추가 | colorUtils.ts SoT 단일 객체 원칙. 신규 색상 필요 시 `PANEL_CHART_COLORS` 키 추가 |
