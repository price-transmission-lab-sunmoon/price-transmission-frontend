# 04 · 서비스 + 타입 (`SVC-*`, `TYPE-*`)

> **services** = API 응답을 화면용 형태로 변환·포맷하는 순수 함수. **types** = 백엔드 응답 구조를 TypeScript로 적은 데이터 모델(snake_case 그대로).

---

## 서비스 (`src/services/`)

### SVC-01 · buildStreamChartData
- 위치: `src/services/timeseries.ts` (`buildStreamChartData`)
- 무엇: 스트림 API 응답 → 차트용 형태로 변환. `period` 문자열을 `Date`로 파싱, `activeSegments`·`confidenceFilter`로 series·anomaly 필터, 전체 도메인(domainFrom/To) 계산.
- 왜: D3가 바로 그릴 수 있는 형태(Date + 필터 적용)로 가공. 시간 기반 클러스터링은 폐기 — 노드 묶음은 렌더 레이어 픽셀 bucket이 단독 담당([[CHART-15]]).
- 연결: [[HOOK-07]], [[CHART-01]].

### SVC-02 · 숫자 포맷터
- 위치: `src/services/anomaly.ts` (`formatNum`, `formatPct`, `formatRatio`, `ratioRegimeLabel`, `safeNum`)
- 무엇: null/NaN 안전 숫자 표시. `formatRatio`는 전이율 전용(dimensionless ratio — ×100·'%' 변환 금지). `ratioRegimeLabel`: 음수='역전', >1='과잉', [0,1]='정상'.
- 왜: 백엔드 수치가 null일 수 있어 '—' 폴백 필요(PARSE-NUM-002). 전이율은 비율이라 % 아님.
- 연결: [[LAYOUT-04]] Panel.

### SVC-03 · 라벨 함수
- 위치: `src/services/anomaly.ts` (`confidenceLabel`, `patternLabel`, `mlModelLabel`)
- 무엇: 코드값 → 한국어/표시명. high→'고신뢰', pattern1→'패턴 1', isolation_forest→'Isolation Forest' 등.
- 왜: enum 코드를 사용자 표시용으로 변환하는 단일 출처.
- 참고: 신뢰도 라벨(고신뢰/중신뢰/참고)은 이 `confidenceLabel`이 단일 출처. Phase C에서 ScatterChart·RawPricesChart·[[LAYOUT-05]] Banner의 로컬 중복 맵을 이 함수로 통합했다. ([[UI-05]] ConfidenceBadge와 [[CHART-01]] StreamChart 툴팁(rev.6 박제)은 자체 라벨 유지.) 패턴 라벨은 화면마다 표현이 달라(예: '비대칭 전달' vs '패턴1: 비대칭') 통합하지 않음.

---

## 타입 (`src/types/`)

### TYPE-01 · literals (enum 단일 출처)
- 위치: `src/types/literals.ts`
- 무엇: 모든 enum-like 문자열의 SoT. `ConfidenceGrade`(high/medium/reference), `PrimaryPattern`(pattern1~3), `SegmentId`(A/B/C/D/D_prime), `Granularity`, `ViewTab`, `PeriodPreset`, `MlModel`, `StatSeriesMetric`, `StatSnapshotMetric`, `RawPriceSource`, `Cluster` 등. 각각 `as const` 배열 + 파생 타입.
- 왜: 코드값을 한 곳에서 정의 → 타입 안전 + 런타임 검증(배열로 `.includes` 체크) 양쪽 가능.
- 연결: 거의 모든 파일이 여기서 타입 import.

### TYPE-02 · 시계열 타입
- 위치: `src/types/timeseries.ts`
- 무엇: `TimeseriesEnvelope`(공통 from/to/granularity/total_points) + 화면별 응답: `StreamResponse`(series + anomaly_nodes), `StreamMinimapResponse`(anomaly_density), `ScatterResponse`(points + baseline), `RawPricesResponse`(다중 소스 레이어 + transmission_overlay).
- 왜: 시계열 4종 API 응답을 1:1로 표현.
- 연결: [[HOOK-07]]~[[HOOK-11]].

### TYPE-03 · 이상/패널 타입
- 위치: `src/types/anomaly.ts`
- 무엇: `AnomalySummaryResponse`(배너), `AnomalyDetail`(패널 통합 — `StatMetrics` 30필드 + `MlSummary` 11필드 + `JudgmentPathStep[]`), `StatSeriesResponse`(metric별 유니온), `StatSnapshotResponse`(iqr|asymmetry), `IrfResponse`, `MlMapResponse`.
- 왜: 패널·요약 API 응답 모델.
- 연결: [[HOOK-06]], [[HOOK-12]]~[[HOOK-16]], [[LAYOUT-04]].

### TYPE-04 · 품목 타입
- 위치: `src/types/commodity.ts`
- 무엇: `Commodity`(commodity_id, name_kr, cluster, has_wholesale, route_type, segments, analysis_start/end, has_anomaly_this_month, latest_anomaly_grade), `SegmentMeta`, `CommodityDetail`, `Segment`.
- 왜: 품목 목록·상세 모델. `has_wholesale`이 3구간/4구간을 가른다.
- 연결: [[STORE-02]], [[CHART-03]] 탭 분기.

### TYPE-05 · 메타·이벤트·에러 타입
- 위치: `src/types/meta.ts`, `src/types/event.ts`, `src/types/error.ts`
- 무엇: `Freshness`, `PipelineNode`/`PipelineEdge`/`PipelineMetaResponse`, `AnalysisParams`/`PatternDescription`(meta.ts) · `ExternalEvent`(event.ts) · `ApiErrorBody`/`ApiErrorResponse`(error.ts).
- 연결: [[HOOK-03]]·[[HOOK-04]]·[[HOOK-05]], [[API-07]].

> `src/types/index.ts`는 위 전부를 re-export(barrel). `import { X } from '@/types'`로 한 번에 가져올 수 있다.
