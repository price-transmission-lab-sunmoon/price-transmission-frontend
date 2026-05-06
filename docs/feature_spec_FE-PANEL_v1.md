# Feature 명세서 — FE-PANEL

**문서 유형**: Feature 명세서  
**기능 번호**: `FE-PANEL`  
**브랜치명**: `feat/fe-panel`  
**담당자**: 하대수  
**작성일**: 2026-05-05  
**상태**: 초안

**변경 이력**:
- v1 (2026-05-05): 최초 작성

---

## ⚠️ 구현 시작 전 필수 확인

| 문서 | 버전 | 참조 목적 | 확인 |
|------|------|-----------|------|
| `web_plan_vN.md §6` | vN | 패널 UX 요구사항 (4개 섹션, 슬라이드인, 너비 드래그, 인라인 그래프) | ☐ |
| `api_spec_vN.md §패널 엔드포인트` | vN | `/detail`, `/stat-series`, `/stat-snapshot`, `/irf`, `/ml-map` 5개 엔드포인트 | ☐ |
| `exception_spec_vN.md §8` | vN | feat/fe-panel 매핑 = `FE-API-001~004`, `FE-D3-001~003`, `PARSE-NUM-002`, `PARSE-ARR-002`, `FE-MOCK-001` | ☐ |
| `feature_dev_list_vN.md §feat/fe-panel` | vN | 11개 구현 범위·4개 완료 기준 | ☐ |
| `feature_spec_FE-STREAM_v1.md §3.2` | v1 | `selectedAnomalyId`, `isPanelOpen` 상태 정의 (선행 기능) | ☐ |
| `feature_spec_FE-LAY_v3.md §3.1` | v3 | useAppStore 구조 |  ☐ |

---

## ⚠️ Action Items — 미결 불일치 항목

| # | 출처 불일치 | 내용 | 영향 범위 |
|---|-------------|------|-----------|
| 1 | api_spec_vN `/ml-map` OI-15 보류 | `projection_method` 기본값 및 축 확정이 S4 스프린트 내 미정. 이 명세는 `pca` 기본값 + 모델별 다른 축 라벨 가정 | §3.3 ⑦ ML 결과맵 — 축 라벨이 응답 `x_label`/`y_label`을 그대로 사용하므로 백엔드 확정에 자동 반영 |
| 2 | 디렉토리 구조 frame_spec 정합 | (해소됨) frame 재정비(2026-05-06) 후 frame_spec_vN §2 정책 따름: D3 차트는 `components/charts/`, 패널 섹션은 `components/panel/`(신규 서브폴더), 패널 컨테이너는 기존 `components/layout/Panel.tsx`를 `AnalysisPanel.tsx`로 대체 | §1.3 |
| 3 | CLAUDE.md anomaly_id 타입 | CLAUDE.md §6 `AnomalyNode.anomaly_id: string`, api_spec_v5는 `integer`. FE-LAY action item에서 이미 플래그됨. 이 명세는 `number` 사용 | 모든 패널 API 호출 |
| 4 | 비대칭 히스토그램 표시 조건 | feature_dev_list는 "패턴 2 구간 A·B에서만 표시"로 명시. api_spec `stat_metrics.asymmetry_significant` 필드는 의미적으로 동일 — 본문 §3.3 ④에 조건부 렌더 명시 | §3.3 ④ |
| 5 | 패널 차트 추가 3종 | (해소됨) IQRBoxplot·AsymmetryHistogram·BreakpointsChart는 `src/components/charts/`에 추가. CLAUDE.md §3은 frame 재정비 후 components/charts/를 단일 D3 위치로 명시 | §1.3 |

---

## 1. 기능 개요

### 1.1 한 줄 요약

이상 노드 클릭 시 우측에서 슬라이드인하는 분석 수치 패널. `/detail` 단일 호출로 4개 섹션(계량경제학·ML·판정 경로·IRF 요약)을 초기 렌더링하고, 지표·결과맵·IRF는 클릭 시 lazy-load.

### 1.2 데이터 흐름

```
[StreamChart 노드 클릭] → useAppStore.setSelectedAnomalyId(id) + setIsPanelOpen(true)
  → AnalysisPanel 슬라이드인
  → useAnomalyDetail(selectedAnomalyId) → GET /anomalies/{id}/detail
      → stat_metrics, ml_summary, judgment_path, segment_id 등 단일 응답
      → 4개 섹션(StatSection·MLSection·JudgmentPathSection·IRFSection) 렌더링

[지표 클릭] → expandedInlineCharts에 metric 추가
  → useStatSeries(anomalyId, metric) → GET /anomalies/{id}/stat-series?metric=X
  또는 useStatSnapshot(anomalyId, metric) → GET /anomalies/{id}/stat-snapshot?metric=X
  → 인라인 차트(TransmissionRateChart 등) 렌더링

[ML 모델 행 클릭] → expandedMLMaps에 model 추가
  → useMLMap(anomalyId, model) → GET /anomalies/{id}/ml-map?model=X
  → MLMapChart 인라인 확장

[IRF 섹션 펼침] → useIRF(anomalyId) → GET /anomalies/{id}/irf
  → IRFChart 렌더링 (전체 + 하위 기간 오버레이)

[× 버튼 클릭] → useAppStore.setIsPanelOpen(false), setSelectedAnomalyId(null)
  → 패널 슬라이드아웃 + expandedInlineCharts/MLMaps 초기화

에러 경로:
  - `/detail` 실패 (FE-API-004 등): 패널 전체를 에러 UI로 대체 (헤더·4개 섹션 모두 표시 불가)
  - lazy 엔드포인트 실패 (`/stat-series`·`/stat-snapshot`·`/irf`·`/ml-map`): 해당 섹션·차트만 FE_FALLBACK. 다른 섹션은 정상 동작
```

### 1.3 프레임 내 위치

| 구분 | 경로 | 작업 내용 |
|------|------|-----------|
| 수정 | `src/stores/useAppStore.ts` | PanelState 추가: `panelWidth`, `expandedSections: Set<SectionId>`, `expandedInlineCharts: Set<MetricId>`, `expandedMLMaps: Set<ModelId>` + 토글 액션 |
| 수정 | `src/pages/MainPage.tsx` | `<AnalysisPanel />` 마운트 (isPanelOpen 조건부) |
| 수정 | `src/api/client.ts` | regex 인터셉터 5종 추가: `/detail`, `/stat-series`, `/stat-snapshot`, `/irf`, `/ml-map` |
| 수정 | `src/types/anomaly.ts` | `AnomalyDetail`, `StatMetrics`, `MLSummary`, `JudgmentPathStep` 타입 |
| 수정 | `src/types/timeseries.ts` | `StatSeriesResponse`, `StatSnapshotResponse`, `IRFResponse`, `MLMapResponse` 타입 |
| 수정 | `src/components/layout/Panel.tsx` → `AnalysisPanel.tsx`로 대체 | frame 자리표시자 Panel.tsx를 본 기능의 컨테이너로 교체 — 슬라이드인 애니메이션, 너비 드래그, × 버튼, 헤더 |
| 신규 | `src/components/panel/StatSection.tsx` | 계량경제학 수치 섹션 — 그리드 + 항목 클릭 인라인 토글 (panel/ 서브폴더 신규 생성) |
| 신규 | `src/components/panel/MLSection.tsx` | ML 판정 섹션 — ml_vote, 모델별 바 차트, 행 클릭 결과맵 토글 |
| 신규 | `src/components/panel/JudgmentPathSection.tsx` | 판정 경로 섹션 — Step-by-step 텍스트 |
| 신규 | `src/components/panel/IRFSection.tsx` | IRF 차트 섹션 — IRFChart wrapper |
| 신규 | `src/components/charts/TransmissionRateChart.tsx` | 전이율 시계열 + 롤링평균 + Q1~Q3 밴드 + 탐지시점 수직선 |
| 신규 | `src/components/charts/ZScoreChart.tsx` | Z-score 시계열 + 2.0/2.5 임계선 |
| 신규 | `src/components/charts/ECTChart.tsx` | ECT 시계열 + 0 기준선 |
| 신규 | `src/components/charts/IRFChart.tsx` | IRF 곡선 + CI 밴드 + 피크 마커 |
| 신규 | `src/components/charts/MLMapChart.tsx` | 2D 산점도 + 현재 이상 노드 하이라이트 |
| 신규 | `src/components/charts/IQRBoxplot.tsx` | 박스플롯 + 현재값 마커 (롤링 48개월) |
| 신규 | `src/components/charts/AsymmetryHistogram.tsx` | 상승/하락 분포 겹친 히스토그램 |
| 신규 | `src/components/charts/BreakpointsChart.tsx` | 전이율 시계열 + 구조 변화 시점 수직선 |
| 신규 | `src/hooks/useAnomalyDetail.ts` | `/detail` 훅. enabled: `selectedAnomalyId !== null && isPanelOpen`. queryKey: `['anomaly-detail', selectedAnomalyId]`. staleTime 5분 |
| 신규 | `src/hooks/useStatSeries.ts` | `/stat-series` 훅. enabled: `selectedAnomalyId !== null && expandedInlineCharts.has(metric)`. queryKey: `['stat-series', selectedAnomalyId, metric, filterFrom, filterTo, granularity]` |
| 신규 | `src/hooks/useStatSnapshot.ts` | `/stat-snapshot` 훅. enabled: `selectedAnomalyId !== null && expandedInlineCharts.has(metric)` (metric ∈ `iqr`·`asymmetry`). queryKey: `['stat-snapshot', selectedAnomalyId, metric]` |
| 신규 | `src/hooks/useIRF.ts` | `/irf` 훅. enabled: `selectedAnomalyId !== null && expandedSections.has('irf')`. queryKey: `['irf', selectedAnomalyId]` |
| 신규 | `src/hooks/useMLMap.ts` | `/ml-map` 훅. enabled: `selectedAnomalyId !== null && expandedMLMaps.has(model)`. queryKey: `['ml-map', selectedAnomalyId, model]` |
| 신규 | `src/fixtures/anomaly_detail.json` | wheat anomaly_id 142 detail mock |
| 신규 | `src/fixtures/stat_series_transmission_rate.json` | 전이율 시계열 mock |
| 신규 | `src/fixtures/stat_series_zscore.json` | Z-score 시계열 mock |
| 신규 | `src/fixtures/stat_series_ect.json` | ECT 시계열 mock |
| 신규 | `src/fixtures/stat_snapshot_iqr.json` | IQR 스냅샷 mock |
| 신규 | `src/fixtures/stat_snapshot_asymmetry.json` | 비대칭 스냅샷 mock |
| 신규 | `src/fixtures/irf.json` | IRF 데이터 mock (full + subperiod) |
| 신규 | `src/fixtures/ml_map_isolation_forest.json` | IF 결과맵 mock |
| 신규 | `src/fixtures/ml_map_lof.json` | LOF 결과맵 mock |
| 신규 | `src/fixtures/ml_map_ocsvm.json` | OCSVM 결과맵 mock |

> **NOTE**: `endpoints.ts` 미수정 — frame/frontend 에 `ANOMALY_DETAIL`, `ANOMALY_STAT_SERIES`, `ANOMALY_STAT_SNAPSHOT`, `ANOMALY_IRF`, `ANOMALY_ML_MAP` 5종 모두 정의됨.

### 1.4 구현 범위 및 비구현 범위

| 구분 | 내용 |
|------|------|
| **구현** | 패널 슬라이드인 애니메이션 (300ms ease-out) |
| **구현** | 패널 너비 드래그 (280px~520px) — 좌측 경계 |
| **구현** | × 버튼으로 패널 닫기 + 인라인 펼침 상태 초기화 |
| **구현** | 헤더: 품목명·구간 라벨·시점·신뢰도 배지·패턴명·NEW 배지 |
| **구현** | 계량경제학 수치 그리드 — 8개 항목 (전이율/Z-score/IQR/IRF피크시차/ECT/TECMα/Bai-Perron/모형유형) |
| **구현** | 지표 클릭 → 인라인 차트 펼침 (다중 동시) — 7종 차트 |
| **구현** | ML 판정 섹션 — ml_vote, 모델별 anomaly score 바 차트 |
| **구현** | ML 모델 행 클릭 → 결과맵 인라인 확장 (다중 동시) — 3종 |
| **구현** | 판정 경로 섹션 — judgment_path 단계별 텍스트 (✓/✗ 표시) |
| **구현** | IRF 차트 — 전체 + 하위 기간 오버레이 + CI 밴드 + 피크 마커 |
| **구현** | 비대칭 히스토그램 조건부 렌더 (패턴 2 구간 A·B만) |
| **구현** | mock fixture 전체 (anomaly 142 기준 11개 파일) |
| **구현** | 4개 섹션 독립 접기/펼치기 |
| **비구현** | 보조 품목 패널 — 동일 anomaly에 보조 품목 비교 패널은 향후 |
| **비구현** | 헤더 "주/보조 배지" — web_plan §6.1에 명시되어 있으나 보조 품목 패널 미구현이므로 단일 품목 헤더만 렌더 |
| **비구현** | 패널 가로 모드 (1차 출시 데스크탑 전용) |
| **비구현** | 패널 내용 PNG/PDF 익스포트 |
| **비구현** | 패널 영구 표시 모드 (항상 슬라이드인 트리거 필요) |

---

## 2. 입력 데이터

### 2.1 API 응답 — `/anomalies/{anomaly_id}/detail`

**필수 파라미터**: `anomaly_id` (path)

**응답 필드 (api_spec_vN §패널 엔드포인트)**

| 그룹 | 필드 | 타입 | 설명 |
|------|------|------|------|
| 식별 | `anomaly_id` | number | 패널 키 |
| 식별 | `commodity_id` | string | 품목 ID |
| 식별 | `commodity_name_kr` | string | 품목명 (헤더 표시) |
| 식별 | `segment_id` | SegmentId | 구간 ID |
| 식별 | `segment_label_kr` | string | 구간 라벨 (헤더 표시) |
| 식별 | `period` | YYYY-MM | 시점 |
| 식별 | `primary_pattern` | `"pattern1"` \| `"pattern2"` \| `"pattern3"` | 주 패턴 |
| 식별 | `pattern_types` | string[] | 복수 패턴 배열 |
| 식별 | `confidence_grade` | `"high"` \| `"medium"` \| `"reference"` | 신뢰도 |
| 식별 | `is_new` | boolean | NEW 배지 |
| 통계 | `stat_metrics` | object | 30개 필드 — §2.1.1 |
| ML | `ml_summary` | object | 11개 필드 — §2.1.2 |
| 판정경로 | `judgment_path` | array | 6개 step — `step`, `label`, `value`, `passed` |

#### 2.1.1 `stat_metrics` 적용 구간

| 필드 그룹 | 필드 | 적용 구간 |
|-----------|------|-----------|
| 패턴 2 | `transmission_rate`, `rolling_mean`, `zscore`, `zscore_warning`, `zscore_alert`, `zscore_threshold_warning`, `zscore_threshold_alert`, `q1`, `q3`, `iqr_lower`, `iqr_upper`, `iqr_outlier`, `over_transmission`, `under_transmission` | A·B |
| 패턴 1 | `normal_lag`, `actual_lag`, `direction_reversal`, `lag_deviation`, `pattern1_flag_type` | 전 구간 |
| ECT | `ect_or_spread`, `ect_type` | 전 구간 |
| 패턴 3 | `spread_n3` | B만 |
| 비대칭 | `alpha_plus`, `alpha_minus`, `wald_pvalue`, `asymmetry_significant`, `rocket_feather_direction` | A·B |
| 모형 | `model_type`, `cointegrated` | 전 구간 |
| 구조변화 | `subperiod_index`, `bp_dates` | 전 구간 |

> 적용 구간 외 필드는 응답에 `null` 또는 미포함. 렌더 시 표시 생략 + "해당 없음" 텍스트.

#### 2.1.2 `ml_summary`

`ml_vote` (0~3), `ml_detected`, 모델 3종(IF/LOF/SVM) × {`*_anomaly`, `*_score`, `*_percentile`}.

### 2.2 API 응답 — 지연 로드 5종

| 엔드포인트 | 트리거 | 응답 핵심 필드 |
|-----------|--------|---------------|
| `/stat-series?metric=transmission_rate` | 전이율 항목 클릭 | envelope + `data[]: { period, transmission_rate, rolling_mean, q1, q3, in_warmup_period, is_breakpoint }` + `highlight_period` |
| `/stat-series?metric=zscore` | Z-score 항목 클릭 | envelope + `data[]: { period, zscore, in_warmup_period }` |
| `/stat-series?metric=ect` | ECT 항목 클릭 | envelope + `data[]: { period, ect_or_spread, ect_type }` |
| `/stat-series?metric=breakpoints` | Bai-Perron 항목 클릭 | transmission_rate와 동일 구조 + `bp_dates: string[]` |
| `/stat-snapshot?metric=iqr` | IQR 판정 항목 클릭 | `period, q1, median, q3, iqr_lower, iqr_upper, current_value, window_months` |
| `/stat-snapshot?metric=asymmetry` | TECM α 항목 클릭 | `up_samples[], down_samples[], alpha_plus, alpha_minus, wald_pvalue, asymmetry_significant, model_type` |
| `/irf` | IRF 섹션 펼침 | `irfs[]: { scope, label, peak_horizon, peak_magnitude, data[]: { horizon, irf_downstream, irf_lower_ci, irf_upper_ci } }` |
| `/ml-map?model=isolation_forest\|lof\|ocsvm` | ML 모델 행 클릭 | `x_label, y_label, points[]: { period, x_value, y_value, anomaly_score, is_anomaly, is_highlight }` |

### 2.3 useAppStore 읽기 상태

| 필드 | 타입 | 출처 | 용도 |
|------|------|------|------|
| `selectedAnomalyId` | number \| null | FE-STREAM | API 호출 트리거 |
| `isPanelOpen` | boolean | FE-STREAM | 패널 마운트 조건 |
| `panelWidth` | number | FE-PANEL 신규 | 패널 너비 (기본 360px) |
| `expandedSections` | Set<`"stat"`\|`"ml"`\|`"path"`\|`"irf"`> | FE-PANEL 신규 | 섹션 펼침 상태 (기본: 4개 모두) |
| `expandedInlineCharts` | Set<MetricId> | FE-PANEL 신규 | 지표 인라인 펼침 |
| `expandedMLMaps` | Set<`"isolation_forest"`\|`"lof"`\|`"ocsvm"`> | FE-PANEL 신규 | 결과맵 펼침 |

### 2.4 타입 변환 규칙

| AS-IS | TO-BE | 적용 규칙 |
|-------|-------|-----------|
| `actual_lag: null` | "관측 안됨" 텍스트 표시 | 패턴 1 미탐지 시 정상 케이스 (PARSE-NUM-002 아님) |
| `pattern1_flag_type: null` | 패턴 1 행 비활성 회색 | 정상 케이스 |
| `transmission_rate: null` + `in_warmup_period: true` | skip | d3.line().defined() — 정상 (FE-STREAM과 동일) |
| `transmission_rate: null` + `in_warmup_period: false` | skip + console.warn | PARSE-NUM-002 |
| `bp_dates` 누락 | `[]` 대체 | PARSE-ARR-002 |
| `up_samples`/`down_samples` 누락 | 히스토그램 미표시 + "데이터 없음" | PARSE-ARR-002 |
| `irfs[]` 빈 배열 | "해당 시점 IRF 산출 불가" 메시지 | FE-D3-001 |

---

## 3. 출력 데이터

### 3.1 렌더링 출력

`isPanelOpen=true` 조건으로 `<AnalysisPanel />` 마운트. 패널 내부에 4개 섹션 + 헤더.

### 3.2 useAppStore 쓰기

| 액션 | 트리거 | 갱신 필드 |
|------|--------|-----------|
| 너비 드래그 | 좌측 경계 mousemove | `panelWidth` (280~520 클램프) |
| 섹션 토글 | 섹션 헤더 클릭 | `expandedSections` add/remove |
| 인라인 차트 토글 | 지표 행 클릭 | `expandedInlineCharts` add/remove |
| 결과맵 토글 | ML 모델 행 클릭 | `expandedMLMaps` add/remove |
| 패널 닫기 | × 버튼 / Esc 키 | `isPanelOpen=false`, `selectedAnomalyId=null`, `expandedInlineCharts.clear()`, `expandedMLMaps.clear()` |

### 3.3 시각화 규격

#### ① 패널 컨테이너

| 항목 | 값 |
|------|-----|
| 위치 | 우측 고정 (position: fixed, right: 0, top: filter-bar bottom) |
| 너비 | `panelWidth`px (기본 360, 280~520 드래그 클램프) |
| 슬라이드인 | `transform: translateX(0)` ↔ `translateX(100%)`, transition 300ms ease-out |
| 좌측 경계 핸들 | 4px 너비 invisible 영역, `cursor: col-resize`, mousedown으로 드래그 시작 |
| 닫기 | × 버튼(헤더 우상단) + Esc 키 핸들러 (window keydown listener) |
| 배경 | white, 좌측 box-shadow `-2px 0 8px rgba(0,0,0,0.1)` |

#### ② 헤더

```
[품목명] [구간 라벨] [시점]                     [×]
[신뢰도 배지] [패턴명]  [NEW 배지(is_new=true)]
```

| 요소 | 내용 |
|------|------|
| 품목명 | `commodity_name_kr` (예: "밀") |
| 구간 라벨 | `segment_label_kr` (예: "구간 A (국제가→수입단가)") |
| 시점 | `period` (YYYY.MM 포맷) |
| 신뢰도 배지 | high(빨강 #e24b4a) / medium(주황 #ef9f27) / reference(연두 #c8d850) |
| 패턴명 | `primary_pattern` 한글 변환 (아래 매핑) — 복수면 `pattern_types` 순서대로 "패턴 1·2" |
| NEW 배지 | `is_new===true` 일 때만 — 작은 빨강 칩 |

**패턴명 한글 매핑 표** (응답 → 헤더 표시):

| 응답값 | 짧은 표시 (헤더) | 긴 표시 (툴팁/방법론) |
|--------|------------------|------------------------|
| `pattern1` | 패턴 1 | 패턴 1: 방향 역전 및 시차 이탈 |
| `pattern2` | 패턴 2 | 패턴 2: 전이율 크기 이탈 및 비대칭 전달 |
| `pattern3` | 패턴 3 | 패턴 3: 안정기 스프레드 누적 확대 |

> 헤더는 짧은 표시 사용. 긴 표시는 패턴명 hover 시 툴팁으로 노출 (선택 사항 — 1차 출시는 짧은 표시만 필수).

#### ③ 계량경제학 수치 섹션 (StatSection)

8개 행 그리드. 각 행은 클릭 가능 (모형 유형 제외).

| 행 | 표시 내용 (수치) | 클릭 시 인라인 차트 |
|----|------------------|---------------------|
| 전이율 | `transmission_rate.toFixed(2)`, 롤링평균, 정상 범위 [Q1, Q3] | `TransmissionRateChart` (stat-series transmission_rate) |
| Z-score | `zscore.toFixed(2)`, 임계 위치 (warning/alert 텍스트) | `ZScoreChart` (stat-series zscore) |
| IQR 판정 | Q1, Q3, 상한, 현재값 위치 | `IQRBoxplot` (stat-snapshot iqr) |
| IRF 피크 시차 | `normal_lag`개월 vs `actual_lag`개월 | `IRFChart` (irf 응답, IRF 섹션과 공유) |
| ECT 수준 | `ect_or_spread.toFixed(3)`, ect_type | `ECTChart` (stat-series ect) |
| TECM α⁺/α⁻ | `alpha_plus`, `alpha_minus`, p값 (조건부 — A·B만, asymmetry_significant=false 시 회색) | `AsymmetryHistogram` (stat-snapshot asymmetry) |
| Bai-Perron | `subperiod_index`, `bp_dates.length` | `BreakpointsChart` (stat-series breakpoints) |
| 모형 유형 | `model_type` (VAR/VECM), `cointegrated` 표시 | (클릭 비활성, 그래프 없음) |

> **조건부 표시**: 적용 구간 외 필드(예: 구간 D에서 `alpha_plus`)는 행 자체를 비활성 회색 + "해당 없음" 텍스트.

#### ④ 차트 규격

**인라인 차트 공통 레이아웃**

| 차트 | 높이 (펼침 시) | 사용처 |
|------|---------------|--------|
| TransmissionRateChart | 200px | 전이율 항목 인라인 |
| ZScoreChart | 200px | Z-score 항목 인라인 |
| ECTChart | 200px | ECT 수준 항목 인라인 |
| BreakpointsChart | 200px | Bai-Perron 항목 인라인 |
| IQRBoxplot | 180px | IQR 판정 항목 인라인 |
| AsymmetryHistogram | 180px | TECM α 항목 인라인 |
| IRFChart | 240px | IRF 섹션 + IRF 피크 시차 항목 |
| MLMapChart | 240px | ML 모델 결과맵 펼침 |

> 너비는 모두 패널 내부 contentWidth 100% (마진 16px 좌우). 패널 너비 드래그 시 ResizeObserver 통해 모든 차트 재렌더링.

**TransmissionRateChart**
- X축: period (YYYY-MM, d3.timeParse "%Y-%m"), 왼쪽 마진 40px
- Y축: transmission_rate
- 곡선: stroke `#1f77b4`, width 1.5
- 롤링평균: stroke `#666`, dash 4-2
- Q1~Q3 밴드: fill `#aaaaaa`, opacity 0.15
- 탐지시점 수직선: stroke `#e24b4a`, width 2 (period === highlight_period)
- 워밍업 구간: 곡선 미표시

**ZScoreChart**
- 곡선: stroke `#9467bd`
- 주의 임계선: y=2.0, stroke `#ef9f27`, dash 2-2
- 경보 임계선: y=2.5, stroke `#e24b4a`, dash 2-2

**IQRBoxplot** (단일 박스 + 마커)
- 박스: Q1~Q3, median 가로선
- whiskers: iqr_lower, iqr_upper
- 현재값 마커: stroke `#e24b4a`, fill 동색

**IRFChart**
- 곡선: scope=`full` 흑색 굵은선, scope=`subperiod` 회색 얇은선들
- CI 밴드: scope=`full`만 fill `#1f77b4` opacity 0.2
- 피크 마커: peak_horizon 위치 dot + 텍스트 라벨

**MLMapChart**
- 산점도: 모든 points circle (r=3, fill anomaly_score 그라데이션)
- 현재 포인트: `is_highlight=true` → stroke `#e24b4a` 2px, r=6
- 축 라벨: 응답 `x_label`/`y_label` 그대로 사용

**AsymmetryHistogram**
- 두 시리즈 겹친 히스토그램 (up=주황, down=청록 / opacity 0.6)
- bin 개수: 20개 고정
- 통계 표시: alpha_plus/alpha_minus/p-value 텍스트

**BreakpointsChart**
- 전이율 곡선 (TransmissionRateChart와 동일 스타일)
- bp_dates 각 시점 수직선: stroke `#e24b4a` dash 4-2

**ECTChart**
- 곡선: stroke `#2ca02c`
- y=0 기준선: stroke `#000` width 0.5
- 차트 헤더 라벨: 응답 `ect_type` 값 그대로 ("ECT" 또는 "spread") 좌측 상단 텍스트 표시
- Y축 라벨: `ect_type === "ECT"` 면 "균형 이탈 수준", `"spread"` 면 "로그 수준 스프레드"

#### ⑤ ML 판정 섹션 (MLSection)

| 영역 | 내용 |
|------|------|
| 요약 행 | `ml_vote: 2` + "3개 중 2개 탐지" + 탐지한 모델명 배지 |
| Isolation Forest 행 | `if_score` 바 차트, `if_percentile` 텍스트 — 클릭 시 결과맵 |
| LOF 행 | `lof_score` 바 차트, `lof_percentile` 텍스트 |
| One-Class SVM 행 | `svm_score` 바 차트, `svm_percentile` 텍스트 |

바 차트: 가로 막대 (width=percentile/100 * 200px), 색상은 `*_anomaly=true` 시 빨강 #e24b4a, false 시 회색.

결과맵 펼침 시 MLMapChart 인라인 표시 (높이 240px).

#### ⑥ 판정 경로 섹션 (JudgmentPathSection)

`judgment_path[]` 6개 step 순차 렌더:
```
Step 1. {label}: {value} ✓
Step 2. {label}: {value} ✓
...
```
`passed=true` → ✓ 녹색, `passed=false` → ✗ 회색.

#### ⑦ IRF 섹션 (IRFSection)

펼침 시 `useIRF()` 호출 → IRFChart 렌더링. 섹션 자체는 항상 표시되나 데이터는 lazy.

---

## 4. 파라미터 제약 조건

| 파라미터 | 제약 | 출처 |
|---------|------|------|
| `anomaly_id` | number, 양수 | api_spec_vN |
| `panelWidth` | 280 ≤ width ≤ 520 | web_plan_vN §6.6 |
| `metric` (stat-series) | `"transmission_rate"\|"zscore"\|"ect"\|"breakpoints"` | api_spec_vN |
| `metric` (stat-snapshot) | `"iqr"\|"asymmetry"` | api_spec_vN |
| `model` (ml-map) | `"isolation_forest"\|"lof"\|"ocsvm"` | api_spec_vN |
| `include_subperiods` | boolean (기본 true) | api_spec_vN |
| 비대칭 히스토그램 표시 | `segment_id ∈ {A, B}` AND `pattern_types.includes("pattern2")` | feature_dev_list_vN |

---

## 5. 예외처리

### 5.1 적용 예외 코드

exception_spec_vN §8 `feat/fe-panel`: `FE-API-001~004`, `FE-D3-001~003`, `PARSE-NUM-002`, `PARSE-ARR-002`, `FE-MOCK-001`

| 코드 | 발생 위치 | 처리 |
|------|-----------|------|
| `FE-API-001` | useAnomalyDetail/StatSeries/Snapshot/IRF/MLMap 네트워크 실패 | FE_TOAST + 재시도 버튼 (해당 섹션만) |
| `FE-API-002` | 400 (잘못된 metric 등) | FE_TOAST |
| `FE-API-003` | 404 (anomaly_id 없음 / 추가 데이터 없음) | FE_FALLBACK — 해당 섹션 빈 상태 |
| `FE-API-004` | 500 | FE_BLOCK — 패널 전체 에러 UI ('detail' 호출 시) / 섹션 에러 (lazy 호출 시) |
| `FE-D3-001` | `data[]` / `points[]` / `irfs[]` 빈 배열 | FE_FALLBACK — 해당 차트 자리에 "데이터 없음" |
| `FE-D3-002` | NaN 포함 (스케일 계산 오류) | FE_FALLBACK |
| `FE-D3-003` | 패널 슬라이드 애니메이션 도중 SVG 크기 0 | ResizeObserver로 복구 후 재렌더링 |
| `PARSE-NUM-002` | `transmission_rate`/`zscore`/`ect_or_spread` null + warmup=false | console.warn + 해당 포인트 skip |
| `PARSE-ARR-002` | `bp_dates`/`up_samples`/`down_samples`/`anomaly_ids` 누락 | `[]` 대체 + degraded UI |
| `FE-MOCK-001` | mock 모드에서 fixture 누락 | FE_BLOCK (개발환경) |

> **섹션 격리 원칙**: lazy-load 엔드포인트(/stat-series, /stat-snapshot, /irf, /ml-map) 에러는 해당 섹션·차트만 fallback 처리. 패널 전체 또는 다른 섹션에 영향 주지 않음. `/detail` 에러만 패널 전체 에러로 격상.

### 5.2 신규 예외 코드 제안

해당 없음.

---

## 6. 목업 및 실제 데이터 전환 조건

`VITE_USE_MOCK=true` 시 client.ts 인터셉터가 fixture 반환.

**client.ts 인터셉터 패턴** (5종 추가, 평가 순서: 더 구체적인 path 먼저):

```typescript
// 1. /detail (가장 구체적 prefix가 아니므로 먼저)
const detailMatch = url.match(/^\/anomalies\/(\d+)\/detail$/);
if (detailMatch) {
  const anomalyId = Number(detailMatch[1]);
  data = anomalyDetailFixture; // anomaly_id 142만 지원, 그 외는 동일 반환
}

// 2. /stat-series?metric=X
const statSeriesMatch = url.match(/^\/anomalies\/(\d+)\/stat-series/);
if (statSeriesMatch) {
  const metric = new URLSearchParams(url.split('?')[1] ?? '').get('metric');
  const fixtureMap = {
    transmission_rate: statSeriesTransmissionRateFixture,
    zscore: statSeriesZscoreFixture,
    ect: statSeriesEctFixture,
    breakpoints: statSeriesTransmissionRateFixture, // 동일 구조 + bp_dates
  };
  data = fixtureMap[metric];
}

// 3. /stat-snapshot?metric=X
const statSnapshotMatch = url.match(/^\/anomalies\/(\d+)\/stat-snapshot/);
if (statSnapshotMatch) {
  const metric = new URLSearchParams(url.split('?')[1] ?? '').get('metric');
  data = metric === 'iqr' ? iqrFixture : asymmetryFixture;
}

// 4. /irf
const irfMatch = url.match(/^\/anomalies\/(\d+)\/irf$/);
if (irfMatch) data = irfFixture;

// 5. /ml-map?model=X
const mlMapMatch = url.match(/^\/anomalies\/(\d+)\/ml-map/);
if (mlMapMatch) {
  const model = new URLSearchParams(url.split('?')[1] ?? '').get('model');
  data = { isolation_forest: ifFixture, lof: lofFixture, ocsvm: ocsvmFixture }[model];
}
```

> **fixture 정책**: 모든 fixture는 `anomaly_id=142` (wheat 구간 A 패턴 2 기준)으로 작성. 다른 anomaly_id로 호출되어도 동일 fixture 반환 (mock 전용).

**주요 fixture 최소 구조 (anomaly_detail.json)**:

```json
{
  "anomaly_id": 142,
  "commodity_id": "wheat",
  "commodity_name_kr": "밀",
  "segment_id": "A",
  "segment_label_kr": "구간 A (국제가→수입단가)",
  "period": "2026-03",
  "primary_pattern": "pattern2",
  "pattern_types": ["pattern2"],
  "confidence_grade": "high",
  "is_new": true,
  "stat_metrics": {
    "transmission_rate": 1.43, "rolling_mean": 0.81,
    "zscore": 2.71, "zscore_warning": true, "zscore_alert": true,
    "zscore_threshold_warning": 2.0, "zscore_threshold_alert": 2.5,
    "q1": 0.52, "q3": 1.09, "iqr_lower": 0.35, "iqr_upper": 1.26, "iqr_outlier": true,
    "over_transmission": true, "under_transmission": false,
    "normal_lag": 2, "actual_lag": null,
    "direction_reversal": false, "lag_deviation": false, "pattern1_flag_type": null,
    "ect_or_spread": 0.043, "ect_type": "ECT", "spread_n3": null,
    "alpha_plus": -0.31, "alpha_minus": -0.09, "wald_pvalue": 0.003,
    "asymmetry_significant": true, "rocket_feather_direction": "upward_stronger",
    "model_type": "VECM", "cointegrated": true,
    "subperiod_index": 2, "bp_dates": ["2008-09", "2022-03"]
  },
  "ml_summary": {
    "ml_vote": 2, "ml_detected": true,
    "if_anomaly": true, "if_score": -0.142, "if_percentile": 96.3,
    "lof_anomaly": true, "lof_score": 2.81, "lof_percentile": 94.1,
    "svm_anomaly": false, "svm_score": 0.034, "svm_percentile": 62.0
  },
  "judgment_path": [
    { "step": 1, "label": "전이율 산출",       "value": "해당 월 전이율 = 1.43",      "passed": true },
    { "step": 2, "label": "롤링 Z-score",      "value": "2.71 → 경보(2.5) 초과",     "passed": true },
    { "step": 3, "label": "IQR 판정",          "value": "Q3+1.5×IQR(1.26) 초과",    "passed": true },
    { "step": 4, "label": "두 기준 동시 충족", "value": "통계 경보 확정",             "passed": true },
    { "step": 5, "label": "ML 탐지",           "value": "IF ✓ / LOF ✓ / SVM ✗",     "passed": true },
    { "step": 6, "label": "신뢰도 등급 확정",  "value": "통계 O + ML 동시 → 고신뢰", "passed": true }
  ]
}
```

> stat-series/snapshot/irf/ml-map fixture는 응답 예시 구조 그대로 작성. 데이터 분포는 패널이 정상 렌더링되는 정도면 충분 (각 30~50개 포인트).

---

## 7. 완료 기준

feature_dev_list_vN 4개 + web_plan_vN §6 보강:

1. **(필수)** mock 데이터 기반 패널 전 섹션 렌더링 — 4개 섹션 모두 정상 표시
2. **(필수)** 슬라이드인 애니메이션 동작 — 노드 클릭 시 우측에서 300ms 진입
3. **(필수)** 지표 클릭 → 인라인 시계열 펼침 — 7종 차트 (전이율·Z-score·IQR·IRF피크시차·ECT·TECMα·Bai-Perron) 정상 동작
4. **(필수)** ML 모델 탭(행) 전환 → 결과맵 교체 (다중 동시 펼침 가능)
5. 패널 너비 좌측 경계 드래그 — 280~520px 범위 클램프
6. × 버튼 + Esc 키로 패널 닫기 — 인라인 펼침 상태 초기화
7. 헤더 정보 정확 표시 — 품목·구간·시점·신뢰도·패턴·NEW 배지
8. 4개 섹션 독립 접기/펼치기 — `expandedSections` 정상 갱신
9. 비대칭 히스토그램 조건부 표시 — 패턴 2 구간 A·B에서만, 그 외 회색 비활성
10. IRF 차트: 전체 + 하위 기간 곡선 오버레이 + CI 밴드 + 피크 마커 표시
11. IQR 박스플롯: 롤링 48개월 분포 + 현재값 마커 표시
12. 판정 경로 6개 step 텍스트 표시 + ✓/✗ 표식
13. ml_vote 요약 + 모델별 anomaly score 바 차트
14. 적용 구간 외 필드 (예: D 구간에서 alpha_plus) → "해당 없음" 텍스트
15. FE-API-001~004 발생 시 해당 섹션만 fallback (다른 섹션 영향 없음)
16. FE-D3-001 (data 빈 배열) → 차트 자리에 "데이터 없음"
17. FE-D3-003 (슬라이드 도중 크기 0) → ResizeObserver 복구 후 재렌더링
18. PARSE-NUM-002 (warmup=false인 null) → console.warn + 해당 포인트 skip
19. VITE_USE_MOCK=true 환경에서 11개 fixture 정상 로드

---

## 8. 금지 사항

1. **D3.js 외 시각화 라이브러리 사용 금지** — 모든 패널 차트는 D3.js v7
2. **API 응답값 자체 가공 금지** — `transmission_rate`, `zscore`, `if_score` 등 모두 응답값 그대로 표시
3. **미등록 예외 코드 생성 금지** — exception_spec_vN에 없는 코드 임의 생성 금지
4. **패널 외부 store 임의 수정 금지** — 미니맵의 filterFrom/filterTo, 스트림차트의 selectedAnomalyId(이미 설정된 값을 panel 내부에서 변경) 등 패널 영역 외 상태 건드리지 않음
5. **detail 호출 없이 lazy endpoint 호출 금지** — `/detail` 응답에서 `segment_id` 등을 알아야 적용 구간 판단 가능. detail 미응답 시 다른 호출 트리거 비활성
6. **Esc 키 이벤트 전역 등록 후 cleanup 누락 금지** — 패널 unmount 시 keydown listener 제거 필수
7. **panelWidth localStorage 영구 저장 금지 (이 스프린트)** — 세션 내 메모리만 유지. localStorage는 향후 확장
8. **하나의 anomaly_id로 다중 동시 호출 금지** — React Query staleTime 5분, 같은 키 중복 호출 방지
9. **결과맵 transitions 중첩 허용 금지** — 모델별 결과맵은 독립 마운트, 모델 사이 인라인 트랜지션 공유 안함

---

## 9. PR 템플릿

```markdown
## feat/fe-panel PR

### 구현 내용
- [ ] AnalysisPanel.tsx — 슬라이드인, 너비 드래그, × 버튼, Esc 키
- [ ] StatSection.tsx — 8개 항목 그리드 + 인라인 토글
- [ ] MLSection.tsx — ml_vote, 3개 모델 바 차트, 결과맵 토글
- [ ] JudgmentPathSection.tsx — 6 step 텍스트
- [ ] IRFSection.tsx — IRFChart wrapper
- [ ] panel/charts/ 7종 차트 컴포넌트
- [ ] 5개 hooks (useAnomalyDetail, useStatSeries, useStatSnapshot, useIRF, useMLMap)
- [ ] useAppStore PanelState 확장 (panelWidth, expandedSections 등)
- [ ] client.ts 5종 regex 인터셉터 추가
- [ ] 11개 fixture (anomaly_detail + stat-series 4 + stat-snapshot 2 + irf 1 + ml-map 3)

### 완료 기준 체크
- [ ] mock 데이터 기반 패널 전 섹션 렌더링 (§7-1)
- [ ] 슬라이드인 애니메이션 동작 (§7-2)
- [ ] 지표 클릭 → 인라인 시계열 (§7-3)
- [ ] ML 모델 행 클릭 → 결과맵 교체 (§7-4)
- [ ] 너비 드래그·닫기·헤더 (§7-5,6,7)
- [ ] 4개 섹션 독립 접기/펼치기 (§7-8)
- [ ] 비대칭 히스토그램 조건부 표시 (§7-9)
- [ ] IRF·IQR 박스플롯 차트 (§7-10,11)
- [ ] 판정 경로 6 step (§7-12)
- [ ] FE-API/FE-D3/PARSE 예외 처리 (§7-15~18)

### Action Items (미결, PM 확인 필요)
- [ ] [Action Item 1] OI-15 ML 결과맵 projection_method·축 확정 대기
- [ ] [Action Item 3] CLAUDE.md anomaly_id 타입 string→number 정정

### 리뷰어 확인 사항
- [ ] 각 섹션 격리 동작 — lazy 엔드포인트 에러가 다른 섹션에 영향 주지 않는지
- [ ] panel/charts/ 차트 7종 모두 D3.js v7만 사용하는지
- [ ] React Query queryKey가 anomaly_id + metric/model 조합으로 정확히 캐시되는지
- [ ] window keydown listener cleanup 정확성 (Esc 키)
- [ ] expandedInlineCharts/MLMaps Set의 useAppStore 갱신 — Zustand immer/replace 패턴 정확성
```
