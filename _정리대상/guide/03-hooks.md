# 03 · 데이터 훅 (`HOOK-*`)

> `src/hooks/`의 `use*` 파일 16개. 전부 react-query(`useQuery`) 기반.
> 공통 패턴: `queryKey`(캐시 식별자) + `queryFn`(client.get 호출) + `enabled`(언제 실행) + `staleTime`(캐시 신선 기간). 에러는 전역 [[API-09]] handleQueryError가 처리하므로 훅은 데이터 가져오기만 한다.

훅 종류:
- **부트스트랩** (앱 시작 시 1회, 스토어에 저장): HOOK-01~06
- **메인 차트** (필터에 반응해 재요청): HOOK-07~11
- **패널** (이상 선택 시): HOOK-12~16

---

### HOOK-01 · useCommodities
- 위치: `src/hooks/useCommodities.ts`
- 무엇: `/commodities` 가져옴 → 스토어에 저장 + `primaryCommodityId`가 null이면 첫 품목 자동 선택 + 초기 viewport를 최근 3년(`periodPreset='3y'`)으로 설정.
- 왜: 전체 분석 기간(10~17년)을 첫 화면에 다 보이면 라인이 빽빽한 지그재그라 변동성이 과장됨 → 3년만.
- 연결: [[STORE-02]], [[STORE-03]].

### HOOK-02 · useEvents
- 위치: `src/hooks/useEvents.ts`
- 무엇: `/events`(외부 충격 목록) → 스토어 저장. **자동 활성 안 함**(클린 슬레이트 진입, 사용자가 FilterBar에서 켬).
- 왜: 의도 없이 음영이 깔리면 "이상이 이벤트 때문"이라는 인지 편향 유발.
- 연결: [[STORE-05]], [[LAYOUT-03]].

### HOOK-03 · useFreshness
- 위치: `src/hooks/useFreshness.ts`
- 무엇: `/freshness`(데이터 기준 시점·다음 갱신일) → 스토어 저장. staleTime 60초.
- 연결: [[STORE-05]], [[LAYOUT-06]] FreshnessChip.

### HOOK-04 · useAnalysisParams
- 위치: `src/hooks/useAnalysisParams.ts`
- 무엇: `/meta/analysis-params`(파라미터 기준값·패턴 설명) 가져옴. staleTime 1시간(분석 버전 바뀔 때만 변함).
- 연결: [[CHART-14]] MethodologyView.

### HOOK-05 · usePipelineData
- 위치: `src/hooks/usePipelineData.ts`
- 무엇: `/meta/pipeline`(파이프라인 노드·엣지) 가져옴. staleTime 1시간.
- 연결: [[CHART-13]] PipelineFlowDiagram, [[CHART-14]].

### HOOK-06 · useAnomaliesSummary
- 위치: `src/hooks/useAnomaliesSummary.ts`
- 무엇: `/anomalies/summary`(이달 이상 요약) 가져옴. staleTime 60초.
- 연결: [[LAYOUT-05]] Banner.

### HOOK-07 · useStreamData
- 위치: `src/hooks/useStreamData.ts`
- 무엇: 주 품목 스트림(전이율 시계열 + 이상 노드) 가져옴. 파라미터: granularity·segments·grade·patterns.
- 주의: **queryKey에 filterFrom/To 제외**. 백엔드는 전체 기간을 주고, 줌은 클라이언트가 xScale.domain만 잘라 표시 → 줌이 재요청을 유발하지 않음. queryFn에서도 from/to 전송 금지(좁은 응답 받으면 확장 시 빈 화면).
- 연결: [[CHART-01]] StreamChart, [[SVC-01]] buildStreamChartData.

### HOOK-08 · useSecondaryStreamData
- 위치: `src/hooks/useSecondaryStreamData.ts`
- 무엇: 보조(비교) 품목 스트림. `secondaryCommodityId` 있을 때만 실행. primary와 동일 정책.
- 연결: [[STORE-02]], [[CHART-01]].

### HOOK-09 · useScatterData
- 위치: `src/hooks/useScatterData.ts`
- 무엇: 산점도 데이터. 파라미터: segment(scatterSegment)·from·to·grade. **여기는 filterFrom/To를 전송**(서버가 범위 잘라 줌).
- 연결: [[CHART-03]] ScatterChart, [[STORE-04]] scatterSegment.

### HOOK-10 · useRawPricesData
- 위치: `src/hooks/useRawPricesData.ts`
- 무엇: 원시 가격 레이어. 파라미터: layout(layoutNumber)·granularity·from·to.
- 연결: [[CHART-04]] RawPricesChart, [[STORE-05]] layoutNumber.

### HOOK-11 · useMinimapData
- 위치: `src/hooks/useMinimapData.ts`
- 무엇: 미니맵 데이터. 인자 `variant`('stream'|'raw-prices')에 따라 다른 엔드포인트 호출. granularity 항상 yearly(전체 기간 압축).
- 연결: [[CHART-02]] Minimap.

### HOOK-12 · usePanelDetail
- 위치: `src/hooks/usePanelDetail.ts`
- 무엇: `/anomalies/{id}/detail`(패널 통합 응답: stat_metrics 30필드 + ml_summary + judgment_path). `anomalyId` 있을 때만.
- 연결: [[LAYOUT-04]] Panel, [[TYPE-03]] AnomalyDetail.

### HOOK-13 · useStatSeries
- 위치: `src/hooks/useStatSeries.ts`
- 무엇: `/stat-series?metric=`(transmission_rate/zscore/ect/breakpoints) 시계열. `enabled`로 펼침 시에만.
- 연결: [[LAYOUT-04]], [[CHART-07]]~[[CHART-10]].

### HOOK-14 · useStatSnapshot
- 위치: `src/hooks/useStatSnapshot.ts`
- 무엇: `/stat-snapshot?metric=`(iqr/asymmetry) 비시계열 스냅샷.
- 연결: [[CHART-11]] IQRBoxplot, [[CHART-12]] AsymmetryHistogram.

### HOOK-15 · useIRF
- 위치: `src/hooks/useIRF.ts`
- 무엇: `/irf`(충격반응함수, full + subperiod 곡선). `include_subperiods` 파라미터.
- 연결: [[CHART-06]] IRFChart.

### HOOK-16 · useMLMap
- 위치: `src/hooks/useMLMap.ts`
- 무엇: `/ml-map?model=&projection_method=`(2D 투영 ML 결과). model = isolation_forest/lof/ocsvm.
- 연결: [[CHART-05]] MLMapChart.

---

## staleTime 관례
- 패널/시계열: 5분(`5*60*1000`). 자주 안 변함.
- 요약/신선도: 60초. 비교적 자주.
- 메타(파이프라인·파라미터): 1시간. 분석 버전 바뀔 때만.
> 이 값들이 훅마다 흩어져 있는 건 [개선 후보]다(상수화 가능). 단 동작에는 영향 없음.
