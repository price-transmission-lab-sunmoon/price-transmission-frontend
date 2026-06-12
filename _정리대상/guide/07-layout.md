# 07 · 레이아웃 + 페이지 + 부트스트랩 (`LAYOUT-*`)

> 화면 골격(`src/components/layout/`), 페이지(`src/pages/`), 앱 시동(`App.tsx`·`router`·`main.tsx`).

화면 골격 트리:
```
AppShell
├── Banner            이달 이상 요약 (최상단)
├── Header            로고 · 품목 드롭다운 · 탭 · FreshnessChip · 도움말
├── FilterBar         기간·사건·신뢰도·패턴·(레이아웃)·구간  (methodology 탭선 숨김)
├── main (children)   = 현재 페이지 (MainPage / MethodologyPage)
├── Panel             우측 분석 패널 (methodology 탭선 숨김)
├── OnboardingGuide   항상 마운트, 조건부 표시
└── HelpFloatingButton 우하단 FAB
```

---

### LAYOUT-01 · AppShell
- 위치: `src/components/layout/AppShell.tsx`
- 무엇: 전체 세로 레이아웃 골격. `activeTab==='methodology'`이면 FilterBar·Panel 숨김. skip-to-content 링크 포함.
- 연결: [[STORE-04]] activeTab.

### LAYOUT-02 · Header
- 위치: `src/components/layout/Header.tsx`
- 무엇: 로고 + 주/보조 품목 드롭다운(cluster별 그룹) + 4개 뷰 탭 + [[LAYOUT-06]] FreshnessChip + 도움말 버튼. 탭 클릭 시 라우트 이동 + activeTab 동기화(URL↔탭 단방향).
- 핵심: 외부 클릭·Escape로 드롭다운 닫기. 품목 점 색은 latest_anomaly_grade.
- 연결: [[HOOK-01]], [[STORE-02]], [[STORE-04]].

### LAYOUT-03 · FilterBar
- 위치: `src/components/layout/FilterBar.tsx`
- 무엇: 기간 프리셋(6종) + 사건 드롭다운(position:fixed로 clipping 회피) + 신뢰도(고신뢰만/고+중/전체) + 패턴(전체/1/2/3) + (raw-prices면 레이아웃 1~6) + 구간 on/off 스위치.
- 핵심: 프리셋 클릭 → [[UTIL-01]] presetToFrom으로 from 계산 후 `setFilterRange`. `resolveEffectiveDataEnd`로 stale freshness 보정.
- 연결: [[STORE-03]], [[HOOK-02]]·[[HOOK-03]], [[UI-06]] Switch.

### LAYOUT-04 · Panel
- 위치: `src/components/layout/Panel.tsx`
- 무엇: 우측 분석 패널(드래그 너비 조정). 이상 선택 시 4섹션: 분석 수치(+인라인 시계열 4 + 스냅샷 2) / ML 모델 점수(+결과맵) / 패턴 판정 경로(stepper) / IRF. 섹션·차트는 펼칠 때만 fetch([[STORE-06]]). 선택 없으면 빈 상태 + 추천 품목.
- 핵심: 백엔드 미구현(`NOT_IMPLEMENTED`) 시 stream anomaly_nodes에서 메타 폴백. 다수의 하위 컴포넌트(SectionHeader/InlineChartSection/MlBarRow/JudgmentStep 등) 포함.
- 연결: [[HOOK-12]]~[[HOOK-16]], [[CHART-05]]~[[CHART-12]], [[SVC-02]]/[[SVC-03]], [[UI-05]].

### LAYOUT-05 · Banner
- 위치: `src/components/layout/Banner.tsx`
- 무엇: 최상단 이달 이상 요약. 품목별 최고 신뢰도 1건 dedup해 뱃지로. 클릭 시 해당 품목+이상 선택. 전월 대비 증감 표시.
- 연결: [[HOOK-06]], [[STORE-02]]/[[STORE-04]].

### LAYOUT-06 · FreshnessChip
- 위치: `src/components/layout/FreshnessChip.tsx`
- 무엇: "YYYY년 M월 기준 · 다음 갱신 …예정" 칩. live 인디케이터 점.
- 연결: [[HOOK-03]], [[UTIL-01]] formatYearMonthKr/formatDateKr.

### LAYOUT-07 · HelpModal
- 위치: `src/components/layout/HelpModal.tsx`
- 무엇: 도움말 모달. 13개 아코디언 Q&A(서비스 설명·전이율·IRF·ML 등). Esc 닫기 + body scroll lock. 하단에 "온보딩 다시 보기"(hasSeenOnboardingThisSession=false로).
- 연결: [[STORE-05]], [[LAYOUT-08]]가 염.

### LAYOUT-08 · HelpFloatingButton
- 위치: `src/components/layout/HelpFloatingButton.tsx`
- 무엇: 우하단 고정 FAB. 클릭 시 [[LAYOUT-07]] HelpModal 토글.

### LAYOUT-09 · OnboardingGuide
- 위치: `src/components/layout/OnboardingGuide.tsx`
- 무엇: 첫 이상 선택 시 4단계 스포트라이트 투어(노드→분석수치→ML→방법론 탭). 타겟 요소를 `data-testid`/`data-anomaly-id`로 찾아 위치 계산, 못 찾으면 다음 step 자동 skip. localStorage가 아닌 세션 단위(hasSeenOnboardingThisSession).
- 핵심: 타겟 셀렉터는 `getSelector(step)`. 스포트라이트 z-index는 [[UTIL-06]] ONBOARDING_*.
- 연결: [[STORE-05]], [[STORE-04]].

---

## 페이지

### LAYOUT-13 · MainPage
- 위치: `src/pages/MainPage.tsx`
- 무엇: `activeTab`에 따라 stream(StreamChart+Minimap) / scatter(정사각 ScatterChart) / raw-prices(RawPricesChart+Minimap) 분기 렌더.
- 연결: [[STORE-04]], [[CHART-01]]~[[CHART-04]].

> `src/pages/MethodologyPage.tsx`는 [[CHART-14]] MethodologyView를 그대로 감싸기만 한다(마커 없음).

---

## 부트스트랩

### LAYOUT-10 · App (QueryClient + ErrorBoundary)
- 위치: `src/App.tsx`
- 무엇: 최상위. QueryClient 생성(전역 onError=[[API-09]], 재시도 정책=[[API-08]] isPermanentFailure로 영구실패 제외 최대 2회), [[UI-09]] ErrorBoundary로 감싸고 RouterProvider 렌더.
- 연결: [[API-08]]/[[API-09]], [[LAYOUT-11]].

### LAYOUT-11 · router
- 위치: `src/router/index.tsx`
- 무엇: React Router. `/` → AppShell(MainPage), `/methodology` → AppShell(MethodologyPage).
- 연결: [[LAYOUT-01]].

### LAYOUT-12 · main.tsx (진입점)
- 위치: `src/main.tsx`
- 무엇: 문서 타이틀 설정 + [[API-12]] registerGlobalErrorHandler() 1회 호출 + `<App>`을 StrictMode로 마운트.
- 연결: [[LAYOUT-10]], [[API-12]].
