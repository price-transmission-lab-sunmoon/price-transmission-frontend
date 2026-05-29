# 02 · 전역 상태 (`STORE-*`)

> `src/stores/useAppStore.ts` 단일 파일. Zustand 스토어 하나에 5개 슬라이스를 결합했다.
> 사용자가 고른 품목·기간·필터·열린 패널 등 "앱 전체가 공유하는 상태"가 전부 여기 있다.
> 컴포넌트는 `useAppStore((s) => s.원하는값)`으로 필요한 조각만 구독한다.

핵심 패턴 — **store-driven cascade**: 사용자가 헤더/필터바에서 값을 바꾸면 → 스토어가 갱신 → 그 값을 구독한 훅이 재요청 → 차트가 다시 그려진다. 한 방향.

---

### STORE-01 · useAppStore 생성
- 위치: `src/stores/useAppStore.ts` (`create<AppStore>`)
- 무엇: 5개 슬라이스(Commodity/Filter/View/Overlay/Panel)를 하나로 합친 스토어. 상태값 + 그 값을 바꾸는 액션 함수가 함께 들어있다.
- 왜: 슬라이스를 분리하되 단일 스토어로 두어 cross-slice 갱신(품목 바뀌면 segment 초기화 등)을 쉽게.

### STORE-02 · CommodityState (주·보조 품목)
- 위치: `src/stores/useAppStore.ts` (`interface CommodityState` / 구현부 `setCommodities`~)
- 상태: `commodities`(목록), `primaryCommodityId`, `secondaryCommodityId`.
- 액션: `setPrimaryCommodity(id)` — 품목 전환 시 `activeSegments`를 새 품목 구간 전체로 초기화. `setSecondaryCommodity(id)` — 비교용 보조 품목.
- 왜: 화면 전체가 "현재 품목" 기준으로 데이터를 가져오므로 최상위 상태.
- 연결: [[HOOK-01]] useCommodities(자동 선택), [[LAYOUT-02]] Header 드롭다운.

### STORE-03 · FilterState (기간·구간·등급·패턴·사건)
- 위치: `src/stores/useAppStore.ts` (`interface FilterState`)
- 상태: `filterFrom`/`filterTo`(YYYY-MM), `granularity`, `periodPreset`(6종 또는 null=커스텀), `confidenceFilter`(다중), `patternFilter`(다중, 빈=전체), `eventFilter`(event_key 토글), `activeSegments`.
- 액션: `setFilterRange(from,to)` 통합 / `setFilterFrom`·`setFilterTo` 개별(미니맵 브러시·줌이 개별로 씀), `setPeriodPreset`, `toggleEvent`, `toggleSegment` 등.
- 왜: 차트가 무엇을 그릴지 결정하는 필터 묶음. 개별 from/to 액션은 줌↔미니맵 양방향 동기화 때문에 필요.
- 연결: [[LAYOUT-03]] FilterBar, [[CHART-01]] 줌→setFilterFrom/To, [[CHART-02]] 브러시.

### STORE-04 · ViewState (탭·선택 노드·패널)
- 위치: `src/stores/useAppStore.ts` (`interface ViewState`)
- 상태: `activeTab`(stream/scatter/raw-prices/methodology), `selectedAnomalyId`, `isPanelOpen`, `scatterSegment`(기본 'A').
- 액션: `setActiveTab` — methodology 진입 시 패널 자동 닫힘. `selectAnomaly(id)` — id 있으면 패널 열림. `closePanel` — 인라인 차트 펼침 상태 초기화. `setScatterSegment`.
- 왜: "지금 어느 화면을 보고, 어느 이상을 선택했는가"를 추적.
- 연결: [[LAYOUT-04]] Panel, [[LAYOUT-02]] 탭, [[CHART-03]] scatterSegment.

### STORE-05 · OverlayState (이벤트·신선도·레이아웃·온보딩)
- 위치: `src/stores/useAppStore.ts` (`interface OverlayState`)
- 상태: `events`(외부 충격 목록), `freshness`(데이터 기준 시점), `layoutNumber`(1~6, 원시 시계열 전용), `isOnboardingVisible`, `hasSeenOnboardingThisSession`(세션 단위 온보딩 노출 제어).
- 왜: 차트 위에 겹쳐 표시하는 오버레이성 데이터 + 온보딩 상태.
- 연결: [[HOOK-02]] useEvents, [[HOOK-03]] useFreshness, [[LAYOUT-09]] OnboardingGuide.

### STORE-06 · PanelState (패널 너비·섹션/차트 토글)
- 위치: `src/stores/useAppStore.ts` (`interface PanelState`)
- 상태: `panelWidth`(280~520, 드래그 클램프), `expandedSections`(Set, 진입 시 'stat'만 열림), `expandedInlineCharts`(Set), `expandedMLMaps`(Set).
- 왜: 패널은 섹션을 펼칠 때만 해당 데이터를 fetch(요청 부담 감소) → 펼침 상태를 스토어가 기억.
- 연결: [[LAYOUT-04]] Panel, [[HOOK-13]]~[[HOOK-16]] (펼침 시 enabled).

---

## 액션 이름 규칙 (혼동 주의)
- 품목: `setPrimaryCommodity` / `setSecondaryCommodity` (구 `selectPrimary/Secondary` 금지).
- 범위: `setFilterRange`(통합) vs `setFilterFrom`/`setFilterTo`(개별, 미니맵·줌용).
- 기간 프리셋 클릭 시 from/to 자동 계산은 [[LAYOUT-03]] FilterBar가 담당(스토어는 preset 값만 저장).
