# 05 · 차트 (`CHART-*`)

> `src/components/charts/` — 13개 D3 차트 + 1개 헬퍼 모듈.
> 전부 D3.js를 React `useEffect` 안에서 직접 조작한다(가상 DOM 밖에서 SVG를 그림). React는 컨테이너 div + svg 엘리먼트만 마운트하고, 실제 그림은 D3가 그린다.

## 공통 D3 패턴 (먼저 읽기)

거의 모든 차트가 공유하는 관용구:

1. **`useRef`(svgRef·containerRef) + `useEffect`**: 컨테이너 크기·데이터가 준비되면 effect 안에서 D3가 그림.
2. **`d3.select(svg).selectAll('*').remove()`**: 다시 그리기 전 기존 SVG 내용 전부 지움.
3. **width 0 가드 + ResizeObserver + rAF 폴링**: 마운트 직후 `getBoundingClientRect`가 0일 수 있고 ResizeObserver 첫 fire도 0 가능 → 둘 다 무시하면 차트가 영영 안 그려지는 회귀(FE-D3-003). requestAnimationFrame으로 첫 non-zero 크기를 확보한 뒤 observer 부착.
4. **컨테이너 always-mount (방어 패턴, docs/CLAUDE.md 박제)**: 컨테이너 div를 조건부로 마운트하지 않는다. loading/error/empty는 컨테이너 **안의 `position:absolute` 오버레이**로 처리. (조건부 마운트하면 ref가 null이 되어 위 resize effect가 영영 재발화 안 함.)
5. **`.defined(d => d.value !== null)` + `isFinite` 필터**: null·NaN에서 라인을 끊어 SVG path 오류 방지(PARSE-NUM-002).
6. **이상 노드 3-layer**: ① pulse halo(고신뢰만, CSS @keyframes) ② 흰 링(분리선) ③ 메인 점. NEW는 우상단 작은 점.
7. **공통 색/테마**: 색은 [[UTIL-03]] colorUtils, 축·격자·warmup 스타일은 [[UTIL-02]] chartTheme, 툴팁은 [[UTIL-04]]/[[UTIL-05]].

---

## 메인 차트 (탭별 큰 화면)

### CHART-01 · StreamChart
- 위치: `src/components/charts/StreamChart.tsx`
- 무엇: 흐름 보기 메인. 시간 축 전이율 라인(구간별) + 이상 노드 + warmup 배경 band + 이벤트 오버레이 + 기준선(y=0 역전, y=1 완전전달). 휠 줌, 보조 품목 비교 오버레이.
- 핵심 로직:
  - 줌(`applyTransform`): 휠 줌 → x도메인 변경 → viewport 기준 Y 도메인 동적 재계산([[CHART-15]] computeYDomain) → 라인·노드·기준선·band 재배치. 줌 끝나면 200ms debounce 후 `setFilterFrom/To`(스토어 push).
  - 외부 filter 동기화: 미니맵 등이 filterFrom/To를 바꾸면 zoom transform을 역산해 viewport 이동. `lastPushedRef`로 자기 push 되먹임 차단.
  - rev.6 줌 contract는 **변경 금지**(docs/CLAUDE.md 박제).
- 왜: 전이율 흐름과 이상 시점을 한눈에. always-mount + 동적 Y는 회귀 방지 박제.
- 연결: [[HOOK-07]]/[[HOOK-08]], [[SVC-01]], [[CHART-15]], [[CHART-02]] 미니맵, [[STORE-03]] 필터, [[STORE-04]] 선택.

### CHART-02 · Minimap
- 위치: `src/components/charts/Minimap.tsx`
- 무엇: StreamChart/RawPricesChart 아래 작은 전체 기간 막대. 연도별 이상 밀도 배경 + 곡선(opacity 0.3) + `d3.brushX` 뷰포트 박스. prop `variant`로 stream/raw-prices 재사용.
- 핵심: 브러시 드래그 → filterFrom/To 갱신. 외부에서 filterFrom/To 바뀌면 브러시 위치 동기화(`isProgrammaticRef`로 무한 루프 차단). 최소 브러시 폭 3개월 클램프.
- 연결: [[HOOK-11]], [[CHART-01]], [[STORE-03]].

### CHART-03 · ScatterChart
- 위치: `src/components/charts/ScatterChart.tsx`
- 무엇: 전달 구조. X=상류 변화율, Y=하류 변화율 산점도. 4사분면(깃털/과대/과소/역전 패턴) + y=x 대각 기준선 + 궤적선 + 시점 슬라이더 재생(처음→최신). 구간 탭(품목 has_wholesale에 따라 3 or 5탭).
- 핵심: `validPoints` 필터(NaN·enum 검증) → `sliderPosition` 이하만 표시 → 노드 3-layer 렌더. 슬라이더 재생은 `setTimeout` 체인.
- 연결: [[HOOK-09]], [[STORE-04]] scatterSegment, [[TYPE-04]] has_wholesale.

### CHART-04 · RawPricesChart
- 위치: `src/components/charts/RawPricesChart.tsx`
- 무엇: 원시 시계열. 5개 가격 소스(국제가/수입단가/PPI/도매가/CPI)를 2020=100 지수로 area gradient 라인. 레이아웃 1~6 토글(1은 소스 on/off, 2~6은 transmission overlay). 휠/더블클릭 줌. 이상 노드는 segment→하류 소스 곡선 위에 표시.
- 핵심: `render` useCallback이 전체 D3 그림 담당, 두 useEffect(데이터·resize)에서 호출. `WHOLESALE_NOT_AVAILABLE`/`INVALID_LAYOUT` 에러 시 레이아웃 1로 폴백 + 인라인 토스트.
- 주의: wheel/dblclick 리스너 cleanup이 resize effect 경로에서 누락 가능 [개선 후보]. 동작엔 큰 영향 없음.
- 연결: [[HOOK-10]], [[STORE-05]] layoutNumber.

---

## 패널 인라인 차트 (작은 차트, 패널 안)

> 공통: 작은 높이, `attachHoverOverlay`([[UTIL-05]]) 또는 자체 hover. 날짜 파싱은 [[UTIL-01]] `parseYearMonth` 공유(이전엔 각자 로컬 `parseMonth` 정의 → Phase C에서 통합). margin은 TransmissionRate·ZScore·Breakpoints 3종이 [[UTIL-02]] `CHART_MARGINS.panelStandard` 공유(ECT 등은 라벨 폭이 달라 자체 유지). 빈 데이터면 "데이터 없음" div 반환.

### CHART-05 · MLMapChart
- 위치: `src/components/charts/MLMapChart.tsx`
- 무엇: ML 결과 2D 산점도(PCA 투영). 모델별 색([[UTIL-03]] ML_MODEL_COLORS)으로 anomaly_score를 회색→모델색 그라데이션 인코딩. 선택 이상은 큰 점 + stroke 강조.
- 연결: [[HOOK-16]], [[LAYOUT-04]] MlBarRow.

### CHART-06 · IRFChart
- 위치: `src/components/charts/IRFChart.tsx`
- 무엇: 충격반응함수. full 곡선(CI band) + subperiod 곡선(얇은 회색) + peak horizon 마커. horizon(개월) 기반 hover crosshair.
- 주의: hover를 다른 차트와 달리 자체 구현([[UTIL-04]] createChartTooltip 직접) — [[UTIL-05]] attachHoverOverlay로 통일 가능 [개선 후보].
- 연결: [[HOOK-15]].

### CHART-07 · TransmissionRateChart
- 위치: `src/components/charts/TransmissionRateChart.tsx`
- 무엇: 월별 전이율 라인 + rolling mean(점선) + Q1~Q3 band + 이상 시점 수직선.
- 연결: [[HOOK-13]] metric=transmission_rate.

### CHART-08 · ZScoreChart
- 위치: `src/components/charts/ZScoreChart.tsx`
- 무엇: Z-score 시계열 + 주의(2.0)/경보(2.5) 임계 점선.
- 연결: [[HOOK-13]] metric=zscore.

### CHART-09 · ECTChart
- 위치: `src/components/charts/ECTChart.tsx`
- 무엇: 오차수정항(ECT) 또는 로그 스프레드 라인 + y=0 기준선. 우상단에 ect_type 라벨.
- 연결: [[HOOK-13]] metric=ect.

### CHART-10 · BreakpointsChart
- 위치: `src/components/charts/BreakpointsChart.tsx`
- 무엇: 전이율 라인 + Bai-Perron 구조변화점(bp_dates) 수직 점선.
- 연결: [[HOOK-13]] metric=breakpoints.

### CHART-11 · IQRBoxplot
- 위치: `src/components/charts/IQRBoxplot.tsx`
- 무엇: 박스플롯(Q1·중앙값·Q3·IQR 경계) + 현재값 마커. 시간 축 없는 단일 분포.
- 연결: [[HOOK-14]] metric=iqr.

### CHART-12 · AsymmetryHistogram
- 위치: `src/components/charts/AsymmetryHistogram.tsx`
- 무엇: 상방/하방 샘플 히스토그램 2종 겹침(20 bin). 로켓-깃털 비대칭 시각화.
- 연결: [[HOOK-14]] metric=asymmetry.

---

## 방법론 탭

### CHART-13 · PipelineFlowDiagram
- 위치: `src/components/charts/PipelineFlowDiagram.tsx`
- 무엇: 파이프라인 DAG. phase_number로 행 배치, Bezier 엣지 + 화살표, 노드 hover 틴트, 클릭 시 설명 팝오버. 우상단 버전 뱃지.
- 연결: [[HOOK-05]], [[CHART-14]] 안에서 사용.

### CHART-14 · MethodologyView
- 위치: `src/components/charts/MethodologyView.tsx`
- 무엇: 방법론 탭 본문. 6개 섹션(파이프라인 / 패턴 3종 / 계량경제 기법 8개 아코디언 / ML 모델 표 / 신뢰도 등급 / 데이터 소스). **D3 없음**(순수 React + [[CHART-13]] 임베드). 섹션 2는 unknown pattern_id/segment 들어오면 카드 스킵 + 경고 토스트(PARSE-ENUM-002).
- 연결: [[HOOK-04]], [[HOOK-05]].

---

## 헬퍼 모듈

### CHART-15 · streamChartHelpers
- 위치: `src/components/charts/streamChartHelpers.ts`
- 무엇: StreamChart 보조 순수 함수들.
  - `computeNodeBuckets`: 인접 노드 픽셀거리 ≤16px이면 한 bucket으로 묶어 spread(겹침 방지). 줌인하면 자연 해체.
  - `computeYDomain`: viewport 내 anomaly + series 전이율 통합 min/max + 10% 패딩. (anomaly만 기준 ±3 패딩은 폐기 — 변동성 과장 원인.)
  - `computeWarmupBands`: warmup 구간 합집합 → 연속 run을 [start,end] band로.
  - `pickXTickInterval`/`pickXTickFormat`: viewport 폭에 따라 X축 눈금 간격·포맷 선택(최대확대 시 1개월 보장).
  - `parseFilterYM`/`dateToYM`: YYYY-MM ↔ Date 변환.
- 왜: 차트 컴포넌트에서 분리해 viewport 사이징·축 로직을 단일 관리.
- 연결: [[CHART-01]].
