# 08 · 유틸 (`UTIL-*`)

> `src/utils/` — 여러 곳에서 쓰는 순수 값/함수의 단일 출처(SoT). 색·테마·날짜·아이콘·z-index 등.
> "같은 값을 여러 파일에 흩지 말 것"이라는 규칙의 실현체. 차트/UI가 전부 여기서 가져온다.

---

### UTIL-01 · dateUtils
- 위치: `src/utils/dateUtils.ts`
- 무엇: YYYY-MM ↔ Date 변환 + 기간 계산. `parseYearMonth`(YYYY-MM→Date), `formatYearMonth`(역), `subtractMonths`/`subtractYears`, `presetToFrom`(기간 프리셋→filterFrom), `resolveEffectiveDataEnd`(stale freshness 보정), `formatYearMonthKr`/`formatDateKr`(한국어 표시).
- 왜: 날짜를 항상 문자열로 다루되, 파싱·표시는 한 곳에서. date-fns 사용 지점을 모음.
- 참고: 패널 인라인 차트들이 쓰던 로컬 `parseMonth` 중복은 Phase C에서 `parseYearMonth`로 통합 완료.
- 연결: [[CHART-01]], [[LAYOUT-03]], [[LAYOUT-06]].

### UTIL-02 · chartTheme
- 위치: `src/utils/chartTheme.ts`
- 무엇: `CHART_THEME` — 축선·축 글자·격자·warmup band·이벤트선·기준선·폰트 스타일 상수. 모든 D3 차트 공유. 같은 파일에 `CHART_MARGINS`(패널 표준 margin 프리셋)도 export.
- 왜: 차트 시각 톤을 한 객체로 통일.
- 연결: 거의 모든 [[CHART-01]]~[[CHART-13]].

### UTIL-03 · colorUtils
- 위치: `src/utils/colorUtils.ts`
- 무엇: 색 팔레트 SoT. `ANOMALY_COLORS`/`_BG`/`_BORDER`/`ANOMALY_RADII`(신뢰도 등급별 색·반지름), `SEGMENT_COLORS_PRIMARY`/`_SECONDARY`(구간별, 주=실선·보조=점선), `ML_MODEL_COLORS`(IF/LOF/SVM 모델 색), `RAW_PRICE_COLORS`(소스별), `PANEL_CHART_COLORS`(패널 8차트별).
- 왜: 색을 한 곳에서 — 등급 색이 차트 노드와 [[UI-05]] 뱃지에서 일치하도록. warm-white 캔버스 WCAG 대비 보정됨.
- 연결: [[CHART-01]]·[[CHART-03]]·[[CHART-04]]·[[CHART-05]] 등, [[UI-05]].

### UTIL-04 · chartTooltip
- 위치: `src/utils/chartTooltip.ts`
- 무엇: `createChartTooltip(id)` — document.body에 툴팁 div를 1회 생성/재사용(id 멱등). 밝은 테마 카드.
- 왜: 차트 툴팁을 SVG 밖 고정 div로(z-fighting·clipping 회피).
- 연결: [[CHART-01]], [[CHART-06]].

### UTIL-05 · chartHover
- 위치: `src/utils/chartHover.ts`
- 무엇: `attachHoverOverlay<T>(opts)` — 시계열 차트에 마우스 오버레이(수직 가이드선 + 점 + bisector 툴팁) 부착. `removeHoverTooltip(id)` 정리. 차트별로 데이터·값 추출만 콜백으로.
- 왜: 인라인 차트 5종이 hover 로직을 재사용.
- 연결: [[CHART-07]]~[[CHART-10]].

### UTIL-06 · zIndex
- 위치: `src/utils/zIndex.ts`
- 무엇: `Z_INDEX` — 레이어 우선순위 상수(HEADER 50 … CHART_TOOLTIP 1000 … MODAL 8000 … ONBOARDING 8500+ … TOAST 9000).
- 왜: 인라인 숫자 z-index 금지 → 레이어 충돌 방지.
- 연결: [[LAYOUT-07]]/[[LAYOUT-09]], [[UI-08]], [[UTIL-04]]/[[UTIL-05]].

### UTIL-07 · icons
- 위치: `src/utils/icons.ts`
- 무엇: `ICON_PATHS`(아이콘명→SVG path 24종) + `ICON_STROKE_WIDTH` + `IconName` 타입. stroke 기반(일부 filled).
- 왜: 외부 아이콘 라이브러리 없이 path만으로. [[UI-03]] Icon이 소비.
- 연결: [[UI-03]].
