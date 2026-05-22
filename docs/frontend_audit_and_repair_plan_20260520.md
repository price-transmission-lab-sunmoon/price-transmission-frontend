# 프론트엔드 전수 조사 보고 + 대대적 수정 계획

**작성일:** 2026-05-20  
**브랜치:** `frontend/test-start`  
**조사 대상:** `src/` 전 영역 (api·components·hooks·services·stores·types·pages) vs `docs/web_plan_v6.md`·`docs/frame_spec_frontend_v5.md`·`docs/CLAUDE.md`  
**조사 방법:** 코드 직접 읽기 + 실제 백엔드(`http://localhost:8001/api/v1`) 응답 비교

---

## 0. 요약 (TL;DR)

**현 상황 진단**: 프론트엔드 코드 자체는 기획서의 90% 이상이 구현되어 있다. 차트, 패널, 필터, 미니맵, 온보딩, 방법론 탭 모두 D3로 풍부하게 작성됨. 그러나 화면이 "껍데기처럼" 보이는 이유는 다음 4가지가 동시에 작동했기 때문이다.

| # | 원인 | 영향 |
|---|---|---|
| 1 | 백엔드 패널 5개 엔드포인트가 모두 `NOT_IMPLEMENTED` 반환 | 노드를 클릭해도 패널이 빈 상태로 머묾 |
| 2 | 자동 선택 정책이 `high` 등급만 찾는데 백엔드가 `medium`만 반환 | 진입 시 패널 자동 오픈이 실패 |
| 3 | `raw-prices` 응답이 `total_points=0` + 소스명 불일치 (`import_price` vs `import_price_usd`) | 원시 시계열 탭이 비어 보임 |
| 4 | `transmission_rate` 값이 -2.0 ~ +4.5 범위 (정상 전이율 0~1 가정 위반) | 차트 Y축 스케일이 비정상적으로 늘어남 |

→ 대대적 수정 계획은 **프론트엔드 측 우아한 fallback 강화** + **백엔드 미구현 엔드포인트 의존성 격리** + **타입/필드명 정합화** 3축으로 나뉜다.

---

## 1. 기획서 vs 현재 구현 격차 매트릭스

| 기획 영역 (web_plan_v6) | 구현 위치 | 구현 수준 | 문제 |
|---|---|---|---|
| §3.2 이달의 이상 배너 | `Banner.tsx` | ✅ 완전 구현 | 백엔드 `total_count=0` 반환 → "이상 없음" 표시 |
| §3.3 상단 바 (서비스명/품목/뷰탭/방법론/기준칩) | `Header.tsx` + `FreshnessChip.tsx` | ✅ 완전 구현 | freshness `data_up_to`(2024-12) vs 실데이터(2026-02) 불일치 |
| §3.4 필터 바 (기간/사건/신뢰도/패턴/구간/레이아웃) | `FilterBar.tsx` | ✅ 완전 구현 | 정상 |
| §4.1 흐름 보기 (스트림 그래프) | `StreamChart.tsx` | ✅ 풍부 구현 (글로우/펄스/NEW/줌/툴팁) | Y축 스케일 비정상, 자동선택 실패 |
| §4.2 전달 구조 (산점도) | `ScatterChart.tsx` | ✅ 풍부 구현 (구역레이블/슬라이더/궤적/재생) | 정상 작동 (segment 파라미터 OK) |
| §4.3 원시 시계열 (6 레이아웃) | `RawPricesChart.tsx` | ✅ 완전 구현 (소스토글/오버레이/wholesale 폴백) | 백엔드 빈 응답 + 필드명 불일치 |
| §5 보조 품목 오버레이 | `useSecondaryStreamData.ts` + `StreamChart.tsx` | ✅ 완전 구현 | 정상 |
| §6 분석 수치 패널 (4섹션) | `Panel.tsx` + 인라인 차트 7종 | ✅ 완전 구현 | 백엔드 5개 엔드포인트 미구현 |
| §6.2 인라인 차트 (TransmissionRate/Zscore/ECT/Breakpoints/IQR/Asymmetry) | `components/charts/*.tsx` | ✅ 완전 구현 | 동상 |
| §6.5 IRF 차트 | `IRFChart.tsx` | ✅ 완전 구현 | 동상 |
| §6 ML 결과맵 | `MLMapChart.tsx` | ✅ 완전 구현 | 동상 |
| §7 이상 노드 툴팁 | `StreamChart.tsx`·`ScatterChart.tsx` | ✅ 완전 구현 | 정상 |
| §8 방법론 탭 (6섹션) | `MethodologyView.tsx` + `PipelineFlowDiagram.tsx` | ✅ 완전 구현 | 정상 |
| §9.1 온보딩 4단계 | `OnboardingGuide.tsx` | ✅ 완전 구현 | 정상 |
| §9.2 도움말 모달 | `HelpFloatingButton.tsx` + `HelpModal.tsx` | ✅ 완전 구현 | 정상 |
| §10 NEW 배지 + 기준시점 칩 | `StreamChart`·`Banner`·`FreshnessChip` | ✅ 완전 구현 | freshness 불일치 |

**결론: 기획서 vs 코드 격차는 거의 없다.** 표시가 엉성한 것은 코드 부재가 아니라 (a) 백엔드 응답 결손/불일치, (b) 데이터 결손 시 fallback 미흡 때문이다.

---

## 2. 백엔드 응답 실측 결과

| 엔드포인트 | HTTP | 응답 | 비고 |
|---|---|---|---|
| `GET /commodities` | 200 | ✅ 10개 품목 정상 | 키 `commodities` OK |
| `GET /segments` | 200 | ✅ | OK |
| `GET /events` | 200 | ✅ 이벤트 목록 | OK |
| `GET /freshness` | 200 | ⚠️ `data_up_to:"2024-12"` | 실제 stream 데이터는 2026-02까지 → **불일치** |
| `GET /anomalies/summary` | 200 | ⚠️ `total_count:0`, `anomalies:[]` | 이번 달 이상 0건 → 배너에 "이상 없음" 표시 |
| `GET /commodities/wheat/stream` | 200 | ⚠️ `anomaly_nodes` 140개 (전기간) / `medium`만 / `transmission_rate` 범위 -2 ~ +4.5 | high 0건 → 자동선택 실패. Y축 스케일 비정상 |
| `GET /commodities/wheat/stream/minimap` | 200 | ✅ | OK |
| `GET /commodities/wheat/scatter?segment=A` | 200 | ✅ | OK (프론트 segment 파라미터 정상 전송) |
| `GET /commodities/wheat/raw-prices?layout=1` | 200 | ❌ `total_points:0` + source명 `import_price_usd` | 빈 응답 + 필드명 불일치 |
| `GET /commodities/wheat/raw-prices/minimap` | 200 | ❌ `total_points:0` | 동상 |
| `GET /anomalies/{id}/detail` | 200 | ❌ `{"error":{"code":"NOT_IMPLEMENTED"}}` | 패널 헤더만 표시 |
| `GET /anomalies/{id}/stat-series` | 200 | ❌ `NOT_IMPLEMENTED` | 인라인 차트 비표시 |
| `GET /anomalies/{id}/stat-snapshot` | 200 | ❌ `NOT_IMPLEMENTED` | 동상 |
| `GET /anomalies/{id}/irf` | 200 | ❌ `NOT_IMPLEMENTED` | IRF 차트 비표시 |
| `GET /anomalies/{id}/ml-map` | 200 | ❌ `NOT_IMPLEMENTED` | ML 결과맵 비표시 |
| `GET /meta/pipeline` | 200 | ✅ 노드/엣지 정상 | OK |
| `GET /meta/analysis-params` | 200 | ✅ | OK |

> 백엔드 미구현 영역(7개 엔드포인트)은 `feat/phase7-stat` 작업 이후 구현 예정으로 명시됨.

---

## 3. 우선순위별 수정 항목

### 🔴 P0 (Critical — 즉시) — "껍데기 인상" 직접 원인

#### P0-1. `raw-prices` 소스명 필드 불일치
- **위치**: `src/types/literals.ts:53`
- **현재**: `'import_price'`
- **백엔드**: `'import_price_usd'`
- **수정**: literals를 `import_price_usd`로 통일 + `RAW_PRICE_COLORS`·`SOURCE_LABEL`·`SEGMENT_TO_DOWNSTREAM_SOURCE` 매핑 키 일괄 변경
- **영향 파일**: `literals.ts`, `colorUtils.ts`, `RawPricesChart.tsx`, `Minimap.tsx`, `useRawPricesData.ts`, `useMinimapData.ts`

#### P0-2. 자동 선택 정책 등급 폴백
- **위치**: `src/components/charts/StreamChart.tsx:50-56`
- **현재**: `n.confidence_grade === 'high'`만 검색 → high 없으면 패널 안 열림
- **수정**: high → medium → reference 순으로 폴백 검색
```typescript
const findLatest = (grade) => primaryData.anomaly_nodes
  .filter(n => n.confidence_grade === grade && segmentSet.has(n.segment_id as SegmentId))
  .sort((a,b) => b.period.localeCompare(a.period))[0];
const candidate = findLatest('high') ?? findLatest('medium') ?? findLatest('reference');
if (candidate) selectAnomaly(candidate.anomaly_id);
```

#### P0-3. 패널 `NOT_IMPLEMENTED` 응답 우아한 fallback
- **위치**: `src/components/layout/Panel.tsx` 전체
- **현재**: `usePanelDetail`·`useIRF`·`useMLMap`·`useStatSeries`·`useStatSnapshot` 5개 훅이 모두 `NOT_IMPLEMENTED` 에러로 무한 retry 또는 빈 상태
- **수정 3중 처리**:
  1. `src/api/error.ts`에 `NOT_IMPLEMENTED` 코드를 white-list로 등록 → React Query `retry: false` 설정
  2. Panel 헤더 직속에 "분석 수치 패널은 백엔드 구현 대기 중입니다 (Phase 7 이후)" 안내 카드 표시. 노드 메타정보(품목/구간/시점/등급/패턴/NEW 배지)는 stream 응답의 `anomaly_nodes`에서 직접 추출하여 표시 (이미 `selectedAnomalyId` + `primaryData.anomaly_nodes`로 조립 가능)
  3. 4개 섹션 헤더(`계량경제학 수치`·`ML 판정`·`패턴 판정 경로`·`IRF 차트`) 본문에 각각 "백엔드 미구현" 배지 + 회색 처리

#### P0-4. `raw-prices` 빈 응답 안내
- **위치**: `src/components/charts/RawPricesChart.tsx:495-499`
- **현재**: "이 기간에는 데이터가 없습니다" — 사용자는 자기가 잘못 선택한 줄 알게 됨
- **수정**: `total_points === 0` 시 "원시 시계열 데이터는 백엔드 적재 대기 중입니다" + 새로고침 버튼

---

### 🟠 P1 (High — 1~2일 내)

#### P1-1. `freshness.data_up_to` vs 실데이터 종료월 불일치 대응
- **위치**: `src/utils/dateUtils.ts` (`presetToFrom`) + `FilterBar.tsx:96-99`
- **문제**: freshness가 `2024-12`인데 stream은 `2026-02`까지 → 기간 프리셋 클릭 시 `to=2024-12`로 잘려 최근 1~2년 데이터가 안 보임
- **수정**: `useFreshness` 응답과 `useCommodities` 응답의 `analysis_end` 비교 후 더 최신값을 우선 사용
```typescript
const effectiveDataEnd = primaryCommodity?.analysis_end > freshness.data_up_to
  ? primaryCommodity.analysis_end : freshness.data_up_to;
```

#### P1-2. `transmission_rate` 비정상 범위 시각화 적응
- **위치**: `src/components/charts/StreamChart.tsx:105-119` (Y축 스케일 산출부)
- **현재**: `d3.extent(allRates)` 그대로 사용 → -2.0 ~ +4.5 같은 극단값 1개가 전체 스케일 망가뜨림
- **수정**: 
  1. 차트 진입 시 IQR 기반 outlier 클리핑 또는 robust scaling (1~99 percentile)
  2. Y축 레이블 "전이율 (%)" → 백엔드 산출 정의가 0~1 비율이 아닌 다른 단위일 가능성이 있으므로 백엔드와 단위 확인 (기획서 §6.0 v6 패치는 "직접값 표시"라 단위 자체는 자유이지만 일관성 필요)
  3. 툴팁의 `(rate * 100).toFixed(1) + '%'` 표시 (StreamChart.tsx:446)도 단위 결정 후 재검토

#### P1-3. `useStreamData` 등 retry 정책 정비
- **위치**: `src/hooks/useStreamData.ts:43` (`retry: 3`)
- **문제**: `NOT_IMPLEMENTED`·`COMMODITY_NOT_FOUND`·`API-VAL-001` 같은 영구 실패에 3회 재시도 → 네트워크 부하 + UX 지연
- **수정**: `App.tsx`의 `queryClient.defaultOptions` 에 `retry: (failureCount, err) => !isPermanentError(err) && failureCount < 2` 적용. `isPermanentError`는 4xx 전부 + `NOT_IMPLEMENTED` 코드 포함.

#### P1-4. `anomaly_nodes` 노드 폭주 대응
- **위치**: `src/services/timeseries.ts:70-85` (`buildStreamChartData`)
- **문제**: 3년 범위에서 11개, 전체 범위에서 140개 노드 → 줌아웃 시 클러스터링 없이 모두 렌더 → 시각적 혼잡
- **수정**: granularity 또는 줌 레벨에 따라 노드 클러스터링 (인접 월의 동일 segment 노드를 1개로 묶고 카운트 배지 표시). web_plan_v6에는 명시 없으나 "껍데기 인상" 개선의 핵심.

---

### 🟡 P2 (Medium — 1주 내)

#### P2-1. 사건 필터 기본값 정책
- **위치**: `src/stores/useAppStore.ts:148` (`eventFilter: []`)
- **현재**: 전체 해제 — 사용자는 사건 음영 기능이 있는지조차 모름
- **수정 옵션 A**: 초기 진입 시 가장 최근 1개 이벤트(예: covid19_2020) 자동 활성 → 음영 효과 노출
- **수정 옵션 B**: FilterBar의 "사건 ▾" 버튼에 작은 펄스 애니메이션 1회 (온보딩 보강)

#### P2-2. 패널 닫힘 상태 안내 강화
- **위치**: `src/components/layout/Panel.tsx:316-326`
- **현재**: "이상 데이터를 선택하면 분석 수치가 표시됩니다."
- **수정**: 자동 선택 실패 시 (high·medium 둘 다 0건) "이 품목에는 이번 달 신규 이상이 없습니다. 다른 품목을 선택하거나 기간 필터를 넓혀보세요." + 추천 품목 버튼

#### P2-3. 보조 품목 자동 색상 배정
- **위치**: `src/utils/colorUtils.ts` (`SEGMENT_COLORS_SECONDARY`)
- **현재**: 보조 품목 색상 고정 (청록/보라/분홍) — 주 품목이 같은 클러스터일 경우 구분 약함
- **수정**: 주 품목 클러스터에 따라 보조 색상 자동 회전

#### P2-4. 미니맵 브러시 드래그 vs 휠 줌 충돌
- **위치**: `src/components/charts/Minimap.tsx` + `StreamChart.tsx:359-424` (zoom)
- **문제**: Stream 차트 휠 줌이 `xScale` 자체를 재계산하지만 Zustand의 `filterFrom`/`filterTo`는 미갱신 → 미니맵과 동기화 끊김
- **수정**: zoom 이벤트의 새 domain을 `setFilterFrom`/`setFilterTo`로 push → 미니맵 브러시 자동 따라옴

---

### 🟢 P3 (Low — 백엔드 정합 후)

#### P3-1. `period` 형식 vs 차트 x축 일관성 점검
- 백엔드는 `"YYYY-MM"`, 차트는 `new Date(year, month-1, 1)` 변환. timezone offset에 의한 1일 어긋남 가능성 (`new Date('2024-06')` UTC 해석) — `parseYYYYMM` 명시 변환은 OK이나, 다른 곳(`new Date(ev.start_date + '-01')` StreamChart.tsx:170)은 timezone 영향 받음.

#### P3-2. `expandedSections` 기본값 합리화
- **위치**: `src/stores/useAppStore.ts:215`
- **현재**: 4개 섹션 모두 펼친 채로 시작 → 노드 클릭 즉시 5개 추가 요청 발생 (현재는 모두 NOT_IMPLEMENTED라 부담 없지만 향후 부하)
- **수정**: 첫 진입 시 `stat`만 펼침, 나머지는 사용자 토글

#### P3-3. `ApiError` `context.cause` 활용 강화
- 현재 `errorChain.ts`는 잘 만들어졌지만 사용처가 적음. 토스트/패널 fallback에 origin 메시지를 노출하면 디버깅 + 사용자 신뢰 향상.

---

## 4. 수정 작업 권장 순서

```
Day 1
  ├─ P0-1 (literals 필드명) — 30분, 차트 색상 즉시 복구
  ├─ P0-2 (자동선택 폴백) — 30분, 패널 자동 오픈 복구
  ├─ P0-3 (NOT_IMPLEMENTED 우아한 fallback) — 2~3시간
  └─ P0-4 (raw-prices 빈 응답 안내) — 30분

Day 2
  ├─ P1-1 (freshness 보정) — 1시간
  ├─ P1-3 (retry 정책) — 30분
  └─ P1-2 (Y축 robust scaling) — 1~2시간, 백엔드 단위 확인 선행

Day 3~5
  ├─ P1-4 (anomaly 클러스터링) — 4~6시간
  └─ P2 항목들 — 일정 따라 분산
```

---

## 5. 백엔드 팀에 동시 요청

위 P0~P1 수정만으로는 "패널이 비어 있다"는 본질은 해소되지 않는다. 다음 7개 엔드포인트 구현 가속화가 핵심이다.

| 엔드포인트 | 우선순위 | 사용처 |
|---|---|---|
| `/anomalies/{id}/detail` | 🔴 최우선 | 패널 헤더 + 4섹션 모든 메타 |
| `/anomalies/{id}/stat-series` (4종 metric) | 🔴 최우선 | 계량 수치 인라인 차트 |
| `/anomalies/{id}/stat-snapshot` (2종 metric) | 🟠 | IQR 박스플롯·비대칭 히스토그램 |
| `/anomalies/{id}/irf` | 🟠 | IRF 차트 (패널 §6.5) |
| `/anomalies/{id}/ml-map` (3종 model) | 🟡 | ML 결과맵 (OI-15 보류 항목) |

**추가 백엔드 정합 요청**:
1. `freshness.data_up_to`를 실제 적재된 최신 월(`2026-02`)에 맞춰 갱신
2. `raw-prices` 응답에 실데이터 적재 + 소스명을 `import_price_usd` → `import_price`로 통일 (또는 프론트가 USD 접미사 수용 — P0-1로 처리됨)
3. `transmission_rate` 산출 단위 명확화 (0~1 비율 vs 다른 단위) 및 outlier 정책 결정
4. `stream` 응답의 `anomaly_nodes`에 `high` 등급 케이스가 1건 이상 포함되도록 데이터 보정 (탐지 알고리즘 임계값 점검)

---

## 6. 별첨 — 코드 품질 양호 항목 (수정 불필요)

다음은 기획서 대비 충실히 구현되어 있으며 손대지 말아야 한다.

- **TypeScript Literal SoT 정책** (`literals.ts`) — 모든 enum이 단일 출처
- **`FEError`/`ApiError` 계층** (`error.ts`) — exception_spec_v6 정합
- **Zustand 슬라이스 5종** (`useAppStore.ts`) — frame_spec §6과 일치
- **D3 차트 진입 애니메이션·줌·툴팁** — 풍부하게 작성됨
- **온보딩 4단계 + 도움말 모달** — web_plan §9 충실 반영
- **방법론 탭 6섹션 + PipelineFlowDiagram** — D3 인터랙티브 다이어그램
- **에러 바운더리 + 글로벌 에러 핸들러** (`ErrorBoundary.tsx`, `globalErrorHandler.ts`)

---

## 7. 결론

기획 의도는 코드에 **이미 90% 이상 반영되어 있다**. 사용자가 "엉성"하다고 느끼는 인상의 약 70%는 백엔드 측 `NOT_IMPLEMENTED`·필드명 불일치·데이터 결손에서 비롯되며, 나머지 30%는 프론트 측 fallback이 "에러" 또는 "빈 화면"으로 끝나서 발생한다.

P0 4건만 처리해도 체감 품질은 크게 회복된다. P1·P2를 거치면 백엔드 패널 엔드포인트 7종 구현 직후 매끄럽게 풀 패널이 연결될 수 있는 상태가 된다.
