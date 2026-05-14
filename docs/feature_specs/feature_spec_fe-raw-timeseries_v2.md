# Feature 명세서 — 원시 시계열 가격 단계 그래프

**문서 유형**: Feature 명세서
**브랜치명**: `feat/fe-raw-timeseries`
**담당자**: 하대수
**작성일**: 2026-05-06
**상태**: 초안

**변경 이력**
- v1 (2026-05-06): 최초 작성
- v2 (2026-05-10): `plan_feature_specs_alignment_v1.md` 감사 결과 반영
  - **P0 ①**: 헤더 `기능 번호: FE-RAW` 제거
  - **P0 ②**: `INVALID_LAYOUT` (API-LAY-001, 400) 예외 처리 §5.1 추가 — URL 직접 조작 시 무한 토스트 방지
  - **P1 ③**: 미니맵 컴포넌트 우선순위 반전 — `feature_dev_list_vN`이 명시한 "재사용" 1순위로 정정. `RawPricesMinimap.tsx` 신규 생성은 fallback
  - **P1 ④**: `feat/fe-layout-filter`의 `has_wholesale=false` disable 구현 verify 항목 §7 추가
  - **P1 ⑤**: `wholesale` vs `wholesale_price` 필드명 PM 별건 격상
  - **P1 ⑥**: 선행 조건에 `feat/fe-stream-chart` 명시 (feature_dev_list와 충돌 → PM 별건)
  - **P2 ⑦**: `feature_spec_FE-MINIMAP_v1.md` 참조 → `feature_spec_fe-minimap_vN.md` 정정
  - **공통 패턴**: 본문 `FE-LAY` 표현 → `feat/fe-layout-filter`로 정정, PR 템플릿 파일명 컨벤션

---

## ⚠️ 구현 시작 전 필수 확인

| 문서 | 버전 | 참조 목적 | 확인 |
|------|------|-----------|------|
| `api_spec_vN.md §/commodities/{id}/raw-prices, §/raw-prices/minimap, §API-LAY-001 INVALID_LAYOUT, §API-LAY-002 WHOLESALE_NOT_AVAILABLE` | 최신(`docs_manifest.md` 조회) | 엔드포인트·query params·응답 필드명·타입·레이아웃 폴백 정책·에러 코드 | ☐ |
| `exception_spec_vN.md §2.4 FE-*, §2.3 PARSE-*, §8 브랜치 매핑` | 최신(`docs_manifest.md` 조회) | 에러 코드·처리 방침 | ☐ |
| `frame_spec_frontend_vN.md §2, §6, §6.2, §8.6` | 최신(`docs_manifest.md` 조회) | 디렉토리·snake_case·Zustand 필드명 SoT·D3 컴포넌트 위치 | ☐ |
| `web_plan_vN.md §4.3` | 최신(`docs_manifest.md` 조회) | 원시 시계열 UX (레이아웃·소스 색상·Y축·오버레이·미니맵) | ☐ |
| `feature_dev_list_vN.md §feat/fe-raw-timeseries` | 최신(`docs_manifest.md` 조회) | 구현 범위·완료 기준·미니맵 재사용 정책 | ☐ |
| `feature_spec_fe-minimap_vN.md §3.3` | 최신(`docs_manifest.md` 조회) | 미니맵 컴포넌트 props·variant 인터페이스 (재사용 가능 여부 판단) | ☐ |

---

## ⚠️ PM 별건 — 결재 대기 항목

| # | 항목 | 충돌 내용 | 본 명세 잠정 채택 |
|---|------|----------|-------------------|
| 1 | 미니맵 컴포넌트 재사용 정책 | `feature_dev_list_vN §feat/fe-raw-timeseries`: "원시 시계열 미니맵도 동일 컴포넌트 재사용" 명시 / 본 명세 v1: 신규 `RawPricesMinimap.tsx` 1순위 | **재사용 1순위 채택** (feature_dev_list 정합). fe-minimap의 `Minimap.tsx`가 `variant="raw-prices"` props로 동작하도록 제네릭화. `feat/fe-minimap` 구현이 props 제네릭을 지원하지 못할 경우만 신규 컴포넌트 생성 |
| 2 | wholesale source 필드명 | `src/types/literals.ts`: `'wholesale_price'` / `api_spec_vN §/raw-prices` 표기: `"wholesale"` 약칭 | api_spec/BE 확정 후 통일. 본 명세는 `'wholesale_price'` 채택 (literals.ts SoT). 불일치 판명 시 literals.ts 수정 |
| 3 | 전이율 오버레이 Y축 표현 | web_plan §4.3: 보조 Y축 없음 (동일 지수 축) / 전이율(0.5~2.0)을 지수 스케일(0~200)에 표시하면 평탄화 | web_plan 원문 기준 단일 Y축 유지. 정규화(×100 등) 허용 여부 PM 결정 |
| 4 | 레이아웃 1 소스 토글 상태 위치 | 컴포넌트 로컬 상태 vs useAppStore FilterState | 로컬 상태 채택 (뷰 내부 표시 옵션) |
| 5 | 선행 조건 차이 | `feature_dev_list_vN`: `feat/fe-layout-filter`만 명시 / 본 명세 §1.4: `feat/fe-layout-filter` + `feat/fe-stream-chart`(colorUtils.ts) + `feat/fe-minimap` | **본 명세 SoT** — 본 feat가 미니맵 재사용·colorUtils 재사용 의존. PM 결재 후 feature_dev_list v5 bump |
| 6 | feature_dev_list 섹션 인용 오기 | `feature_dev_list_vN §feat/fe-raw-timeseries`가 `web_plan §5.3` 참조 / 실제는 `§4.3` | feature_dev_list v5 bump 시 정정 |
| 7 | fe-minimap props 제네릭화 게이트 | 본 feat 진입 전 fe-minimap의 `Minimap.tsx` props 인터페이스 제네릭화 가능 여부 검증 필요 | 진입 게이트로 명시. 불가 판명 시 신규 `RawPricesMinimap.tsx` 생성 (기본 위치는 미사용) |

---

## 1. 기능 개요

### 1.1 한 줄 요약

`feat/fe-layout-filter`로 확장된 `layoutNumber` 스토어 상태를 읽어, D3.js 기반 원시 시계열 가격 단계 그래프(6종 레이아웃·소스 곡선·전이율 오버레이·이상 노드·미니맵)를 `src/components/charts/RawPricesChart.tsx`로 구현한다. 미니맵은 `feat/fe-minimap`의 `Minimap.tsx`를 `variant="raw-prices"`로 재사용한다 (PM 별건 #1).

### 1.2 데이터 흐름

```
useAppStore (primaryCommodityId, filterFrom, filterTo, granularity,
             layoutNumber, confidenceFilter, patternFilter, eventFilter)
  → useRawPricesData(commodityId, { layout, from, to, granularity }) [React Query]
    → GET /commodities/{id}/raw-prices?layout=&from=&to=&granularity=
    → RawPricesResponse { layout, series[], transmission_overlay[], anomaly_nodes[] }

useAppStore (primaryCommodityId, layoutNumber)
  → useMinimapData(commodityId, { variant: 'raw-prices', layout }) [React Query, fe-minimap 훅 재사용]
    → GET /commodities/{id}/raw-prices/minimap?layout=
    → RawPricesMinimapResponse

RawPricesResponse
  → RawPricesChart.tsx (D3.js)
    → 소스별 곡선 (Y축: index_2020, 2020=100 지수)
    → [레이아웃 1] 소스 on/off 토글 버튼 (로컬 상태)
    → [레이아웃 2~6] 전이율 오버레이 곡선 (회색 점선, 동일 Y축)
    → 이상 노드 (신뢰도별 색상·크기·글로우·NEW 배지·호버·클릭)
    → 사건 오버레이 (eventFilter + useAppStore.events 기반)
    → 줌 (마우스 휠·더블클릭·기간 프리셋)

RawPricesMinimapResponse
  → Minimap.tsx variant="raw-prices" (D3.js, fe-minimap 컴포넌트 재사용)
    → 전체 기간 소스 곡선 (yearly 집계) + 이상 밀도 바
    → 브러시 뷰포트
    → 브러시 이동 → useAppStore filterFrom·filterTo 갱신

이상 노드 클릭
  → useAppStore.selectAnomaly(anomaly_id) → selectedAnomalyId + isPanelOpen=true 동반
```

### 1.3 프레임 내 위치

| 구분 | 경로 | 작업 내용 |
|------|------|-----------|
| 수정 | `src/pages/MainPage.tsx` | `activeTab === 'raw-prices'` 분기에 `<RawPricesChart />` + `<Minimap variant="raw-prices" />` 마운트 |
| 수정 | `src/api/client.ts` | mock 인터셉터에 raw-prices 및 raw-prices/minimap 동적 경로 정규식 추가 |
| 수정 | `src/components/charts/Minimap.tsx` (재사용 — PM 별건 #1) | `variant="raw-prices"` 케이스 본격 활성화 (fe-minimap이 props 정의만 해놓은 상태) |
| 수정 | `src/hooks/useMinimapData.ts` (재사용) | `variant: 'raw-prices'` 분기 활성화 |
| 신규 | `src/components/charts/RawPricesChart.tsx` | D3.js 다선 시계열 컴포넌트. 레이아웃별 소스 조합·전이율 오버레이·이상 노드·줌·사건 오버레이 |
| 신규 (조건부 — PM 별건 #1·#7) | `src/components/charts/RawPricesMinimap.tsx` | fe-minimap props 제네릭화 불가 판명 시에만 생성. **기본 채택은 Minimap.tsx 재사용** |
| 신규 | `src/hooks/useRawPricesData.ts` | `/raw-prices` React Query 훅. retry: 3 |
| 신규 | `src/fixtures/raw_prices.json` | GET `/commodities/wheat/raw-prices?layout=2` mock 응답 |
| 신규 | `src/fixtures/raw_prices_minimap.json` | GET `/commodities/wheat/raw-prices/minimap?layout=2` mock 응답 |
| 신규 | `src/fixtures/raw_prices_lay4_error.json` | 레이아웃 4 3구간 품목 오류 응답 (`WHOLESALE_NOT_AVAILABLE`) 검증용 |
| 신규 | `src/fixtures/raw_prices_invalid_layout.json` | 레이아웃 번호 범위 외(`layout=99` 등) 오류 응답 (`INVALID_LAYOUT`) 검증용 |

> **`endpoints.ts` 미수정**: `COMMODITY_RAW_PRICES`, `COMMODITY_RAW_PRICES_MINIMAP` 등이 frame 단계에서 이미 정의됨.

### 1.4 구현 범위 및 비구현 범위

| 구분 | 내용 |
|------|------|
| **구현** | D3.js RawPricesChart — 6종 레이아웃 전환(레이아웃 1 소스 토글 포함), 2020=100 지수 Y축, 소스별 색상 곡선, 전이율 오버레이(레이아웃 2~6), 이상 노드(3등급 색상·글로우·NEW 배지·호버·클릭), 사건 오버레이, 줌, 레이아웃 4 에러 핸들링 + 레이아웃 1 폴백, 레이아웃 5 3구간 품목 자동 폴백, INVALID_LAYOUT 처리, Minimap variant="raw-prices" 활성화, useRawPricesData 훅, fixture 4종 |
| **비구현** | 전이율 오버레이 보조 Y축 (PM 별건 #3), `baseline` 관련 UI (raw-prices 응답에 없음), 보조 품목 오버레이 |
| **선행 조건** | `frame/frontend` + `feat/fe-layout-filter` + `feat/fe-stream-chart` + `feat/fe-minimap` → `develop` 머지 완료 (PM 별건 #5·#7) |

---

## 2. 입력 데이터

### 2.1 API 응답 — `/raw-prices`

| 필드 | 타입 | 비고 |
|------|------|------|
| `commodity_id` | `string` | |
| `layout` | `number` | 1~6 (요청 레이아웃 번호 반환) |
| `requested_from` / `actual_from` | `string` | YYYY-MM |
| `requested_to` / `actual_to` | `string` | YYYY-MM |
| `granularity` | `'monthly' \| 'quarterly' \| 'yearly'` | |
| `total_points` | `number` | |
| `series[].source` | `RawPriceSource` | `'intl_price_krw' \| 'import_price' \| 'ppi' \| 'wholesale_price' \| 'cpi'` (PM 별건 #2) |
| `series[].label_kr` | `string` | 범례 표시용 한국어 레이블 |
| `series[].color_hint` | `string` | API 제공 색상 힌트. 본 명세는 §3.3 색상 상수 우선 적용 |
| `series[].data[].period` | `string` | YYYY-MM |
| `series[].data[].value` | `number \| null` | 원본값 (원/kg 등). 툴팁 표시용 |
| `series[].data[].index_2020` | `number \| null` | **Y축 직접값** (2020=100 기준 지수) |
| `series[].data[].has_anomaly` | `boolean` | |
| `series[].data[].anomaly_ids` | `number[]` | integer[] |
| `transmission_overlay[].segment_id` | `SegmentId` | |
| `transmission_overlay[].data[].period` | `string` | YYYY-MM |
| `transmission_overlay[].data[].transmission_rate` | `number \| null` | 오버레이 Y값 (무차원) |
| `transmission_overlay[].data[].has_anomaly` | `boolean` | |
| `transmission_overlay[].data[].anomaly_ids` | `number[]` | |
| `anomaly_nodes[].anomaly_id` | `number` | **integer** |
| `anomaly_nodes[].segment_id` | `SegmentId` | |
| `anomaly_nodes[].period` | `string` | YYYY-MM |
| `anomaly_nodes[].confidence_grade` | `ConfidenceGrade` | |
| `anomaly_nodes[].primary_pattern` | `PrimaryPattern` | |
| `anomaly_nodes[].is_new` | `boolean` | |

> **`transmission_overlay`**: 레이아웃 1은 빈 배열. 레이아웃 2~6은 해당 구간 전이율 데이터 포함.
> **`anomaly_nodes`**: 스트림 이상 노드와 달리 `transmission_rate`·`pattern_types` 필드 없음.

### 2.2 API 응답 — `/raw-prices/minimap`

| 필드 | 타입 | 비고 |
|------|------|------|
| `layout` | `number` | |
| `series[]` | `RawPriceSeriesItem[]` | `granularity=yearly` 고정 집계 |
| `anomaly_density[]` | `AnomalyDensityItem[]` | `{ period, high_count, medium_count, reference_count }` |
| 공통 envelope 필드 | `TimeseriesEnvelope` | `granularity: 'yearly'` 고정 |

### 2.3 useAppStore 읽기 상태 (fe-layout-filter v4 SoT 정합)

| 슬라이스 | 필드 | 용도 |
|---------|------|------|
| CommodityState | `primaryCommodityId: string \| null` | /raw-prices 요청 `{id}` 경로 변수 |
| FilterState | `filterFrom: string \| null` | 쿼리 파라미터 `from` |
| FilterState | `filterTo: string \| null` | 쿼리 파라미터 `to` |
| FilterState | `granularity: 'monthly' \| 'quarterly' \| 'yearly'` | 쿼리 파라미터 `granularity` |
| FilterState | `confidenceFilter: ConfidenceGrade[]` | 이상 노드 필터링 (클라이언트 필터) |
| FilterState | `eventFilter: string[]` | 사건 오버레이 배경 음영 필터 |
| OverlayState | `events: EventOverlay[]` | 사건 오버레이 색상·기간 SoT |
| OverlayState | `layoutNumber: number` | 쿼리 파라미터 `layout` (1~6) |
| CommodityState | `commodities: Commodity[]` | 현재 품목의 `has_wholesale` 참조용 |

### 2.4 타입 변환 규칙

| 변환 위치 | AS-IS | TO-BE | 규칙 |
|-----------|-------|-------|------|
| `index_2020: null` | `null` (이상값 또는 데이터 미비) | 해당 포인트 skip | `PARSE-NUM-002`. 콘솔 경고 |
| `index_2020: "NaN"` 문자열 | `"NaN"` string | NaN 필터링 | `PARSE-NUM-002` |
| `period` 파싱 | `"2023-04"` (string) | `Date` 객체 | `parse(s, 'yyyy-MM', new Date())`. 실패 → `PARSE-DATE-002` |
| `transmission_rate: null` | `null` (데이터 미비 또는 워밍업) | 해당 포인트 skip (오버레이 선 끊김) | 정상 케이스. `PARSE-NUM-002` 미적용 |

---

## 3. 출력 데이터

### 3.1 렌더링 출력

| 출력 | 내용 |
|------|------|
| `RawPricesChart.tsx` SVG | 레이아웃별 소스 곡선 + 전이율 오버레이 + 이상 노드 + 사건 오버레이 |
| `Minimap variant="raw-prices"` SVG | 전체 기간 개요 + 이상 밀도 바 + 브러시 뷰포트 |
| 빈 데이터 UI | `series[]` 모두 빈 배열 시 "이 기간에는 데이터가 없습니다." |

### 3.2 useAppStore 쓰기

| 액션/필드 | 트리거 | 효과 |
|-----------|--------|-----|
| `selectAnomaly(anomaly_id)` | 이상 노드 클릭 | `selectedAnomalyId`(integer) + `isPanelOpen=true` 동반 |
| `setFilterFrom` / `setFilterTo` | 미니맵 브러시 이동 | 새 범위로 갱신 |
| `setLayoutNumber(1)` | 레이아웃 4 WHOLESALE_NOT_AVAILABLE 수신 시 자동 폴백 | OverlayState `layoutNumber` ← 1 |

### 3.3 시각화 규격 (web_plan_vN §4.3 기준)

#### ① Y축 및 공통 규격

| 항목 | 규격 |
|------|------|
| Y축 | 2020년 평균 = 100 기준 지수 (`index_2020` 필드 직접 사용). 단일 Y축 (PM 별건 #3) |
| X축 | 월별 시간. 스트림 차트와 동일 기간 필터·줌 연동 |
| 그리드 | 회색 점선 수평·수직 (`opacity: 0.3`) |
| 기준선 | y=100 (2020년 기준) 강조 실선 (`opacity: 0.5`) |

#### ② 소스별 색상

| 소스 | `RawPriceSource` 값 | 색상 | 범례 레이블 |
|------|---------------------|------|-------------|
| 국제가 (원화 환산) | `intl_price_krw` | 보라 (`#a855f7`) | `series[].label_kr` |
| 수입단가 | `import_price` | 청색 (`#3b82f6`) | 동일 |
| PPI | `ppi` | 녹색 (`#22c55e`) | 동일 |
| 도매가 | `wholesale_price` (PM 별건 #2) | 주황 (`#f97316`) | 동일 |
| CPI | `cpi` | 빨강 (`#e24b4a`) | 동일 |

> 색상 상수는 `src/utils/colorUtils.ts`에 `RAW_PRICE_COLORS` 객체로 추가.

#### ③ 레이아웃별 렌더링 규칙

| 레이아웃 | 표시 소스 | 전이율 오버레이 구간 | 3구간 품목 동작 |
|----------|-----------|---------------------|-----------------|
| 1 | intl·import·ppi·wholesale·cpi (소스 on/off 토글) | 없음 | wholesale 비활성 (토글 회색, 클릭 불가) |
| 2 | intl·import | 구간 A | 정상 |
| 3 | import·ppi | 구간 B | 정상 |
| 4 | ppi·wholesale | 구간 C | **3구간 품목**: API `WHOLESALE_NOT_AVAILABLE` 수신 → FE_TOAST + layoutNumber 1로 복구 |
| 5 | wholesale·cpi (4구간 D) / ppi·cpi (3구간 D′) | 구간 D 또는 D′ | API 자동 폴백 (에러 없음) |
| 6 | intl·import·ppi·wholesale·cpi | 모든 구간 (품목에 따라 상이) | wholesale 포함 소스는 3구간 품목에서 API 반환 없음 |

> **레이아웃 4 폴백**: 에러 수신 → `setLayoutNumber(1)` → 자동 재조회. FE_TOAST: "이 품목은 도매가 데이터가 없어 레이아웃 1로 전환합니다."
> **레이아웃 1 소스 토글**: 로컬 상태 `enabledSources: RawPriceSource[]` (PM 별건 #4)

#### ④ 전이율 오버레이

- **레이아웃 1**: `transmission_overlay: []` — 오버레이 없음
- **레이아웃 2~6**: 해당 구간 데이터 렌더링
  - 색상: `#64748b` (slate-500, 회색 점선), `stroke-dasharray: 4,3`
  - Y값: `transmission_rate` API 응답값 그대로 (PM 별건 #3)
  - 범례: "전이율 (구간 X)" 레이블

#### ⑤ 이상 노드

| 신뢰도 | 색상 | 반지름 | 효과 |
|--------|------|--------|------|
| `high` | `#e24b4a` | 7px | CSS 글로우 + 펄스 |
| `medium` | `#ef9f27` | 5.5px | CSS 글로우 |
| `reference` | `#c8d850` (연두) | 4px | 없음 |

- `is_new: true` → "NEW" 텍스트 배지 (노드 상단)
- 이상 노드는 해당 `segment_id`의 하류 소스 곡선 위에 표시

#### ⑥ 이상 노드 호버 툴팁

| 필드 | 표시 형식 |
|------|-----------|
| `period` | `YYYY년 M월` |
| `confidence_grade` | "고신뢰" / "중신뢰" / "참고" |
| `primary_pattern` | "패턴1: 비대칭" / "패턴2: 과대" / "패턴3: 깃털" |
| (미표시) | `transmission_rate` — 응답에 없음 |

#### ⑦ 줌

| 방법 | 동작 |
|------|------|
| 마우스 휠 스크롤 | 포인터 X 기준 X축 확대/축소. 최소 3개월 |
| 더블클릭 | 클릭 위치 중심 2배 확대 |
| 기간 프리셋 버튼 | `filterFrom`·`filterTo` 스토어 상태 반영 |

#### ⑧ 사건 오버레이

스트림 차트와 동일 방식. `eventFilter[]` 기반 `useAppStore.events`의 `color_hex` 사용.

---

## 4. 파라미터 제약 조건

| 파라미터 | 관리 위치 | 기본값 |
|----------|-----------|--------|
| 소스별 색상 (`RAW_PRICE_COLORS`) | `src/utils/colorUtils.ts` | §3.3② 색상표 |
| 이상 노드 색상·반지름 | `src/utils/colorUtils.ts` | `feat/fe-stream-chart` 정의값 재사용 |
| 전이율 오버레이 색상 | `src/utils/colorUtils.ts` 또는 RawPricesChart 상수 | `#64748b` |
| `layoutNumber` 초기값 | `useAppStore.ts` OverlayState 초기 상태 | `1` |
| 레이아웃 4 FE_TOAST 메시지 | 상수 또는 i18n | "이 품목은 도매가 데이터가 없어 레이아웃 1로 전환합니다." |
| 레이아웃 INVALID FE_TOAST 메시지 | 상수 | "잘못된 레이아웃 번호입니다. 레이아웃 1로 전환합니다." |

---

## 5. 예외처리

### 5.1 적용 예외 코드

| 예외 코드 | 발생 조건 | 처리 방침 |
|-----------|-----------|-----------|
| `FE-API-001` | `/raw-prices` 또는 `/raw-prices/minimap` 네트워크 실패 | FE_TOAST + 재시도 버튼. retry: 3 |
| `FE-API-002` | `/raw-prices` 400. 특히 **레이아웃 4 + 3구간 품목 → `WHOLESALE_NOT_AVAILABLE`**, **잘못된 layout 번호 → `INVALID_LAYOUT` (API-LAY-001)** | WHOLESALE_NOT_AVAILABLE: FE_TOAST + `setLayoutNumber(1)`. INVALID_LAYOUT: FE_TOAST + `setLayoutNumber(1)` (URL 직접 조작 등 비정상 진입 차단). 일반 400은 FE_TOAST |
| `FE-API-003` | `/raw-prices` 404 (`COMMODITY_NOT_FOUND`) | FE_FALLBACK — 빈 상태 UI |
| `FE-API-004` | `/raw-prices` 500 | FE_BLOCK — RawPricesChart 에러 UI |
| `FE-API-005` | `/raw-prices` 타임아웃 | FE_TOAST + 재시도 |
| `FE-D3-001` | `series[]` 빈 배열 | FE_FALLBACK — "이 기간에는 데이터가 없습니다." |
| `FE-D3-002` | `index_2020` NaN 포함 D3 스케일 실패 | FE_FALLBACK — NaN 포인트 필터 후 재렌더링 |
| `FE-D3-003` | SVG 컨테이너 크기 0 | FE_FALLBACK — ResizeObserver 복구 |
| `PARSE-DATE-002` | `data[].period` YYYY-MM 파싱 실패 | FE_FALLBACK — 해당 포인트 skip |
| `PARSE-NUM-002` | `index_2020: null` (비정상) 또는 `"NaN"` 문자열 | FE_FALLBACK — 해당 포인트 skip |
| `PARSE-ARR-002` | `series[]` 또는 `anomaly_nodes[]` 배열 요소 필수 필드 누락 | FE_FALLBACK — 해당 배열 빈 처리 |
| `PARSE-ENUM-002` | `source`/`segment_id`/`confidence_grade`/`primary_pattern`/`granularity`가 literals.ts union 외 값 | FE_TOAST + 해당 항목 무시 |
| `PARSE-SCHEMA-001` | `/raw-prices` envelope 구조 불일치 (`series` 누락 등) | FE_BLOCK |
| `FE-MOCK-001` | `VITE_USE_MOCK !== 'false'`에서 `raw_prices.json` 없음 | FE_BLOCK (개발환경) |

### 5.2 레이아웃 무효 폴백 처리 흐름

```
[정상 경로 차단]
  → fe-layout-filter FilterBar: has_wholesale=false 품목에서 레이아웃 4 선택지 disable (verify §7)

[비정상 경로 1: WHOLESALE_NOT_AVAILABLE]
  → store.layoutNumber=4 비정상 세팅 (URL 파라미터·스토어 직접 조작)
  → useRawPricesData: GET /raw-prices?layout=4 요청
  → 400 WHOLESALE_NOT_AVAILABLE 수신
  → FE-API-002 처리: FE_TOAST + store.setLayoutNumber(1)
  → useRawPricesData 자동 재조회 (layout=1)

[비정상 경로 2: INVALID_LAYOUT]
  → store.layoutNumber=99 등 범위 외 값
  → 400 INVALID_LAYOUT (API-LAY-001) 수신
  → FE-API-002 처리: FE_TOAST + store.setLayoutNumber(1)
  → 무한 토스트 방지: 폴백 후 fixture/응답 정상이면 중단
```

### 5.3 신규 예외 코드 제안

해당 없음.

---

## 6. 목업 및 실제 데이터 전환 조건

| 항목 | 내용 |
|------|------|
| 테스트 품목 | `wheat` (3구간: A, B, D_prime) |
| 기본 레이아웃 | 레이아웃 2 (국제가·수입단가 + 구간 A 전이율 오버레이) |
| 테스트 기간 | `2023-04` ~ `2026-03` (36개월) |
| 특수 케이스 1 | 레이아웃 1 소스 토글 — 일부 소스 숨김 시 해당 곡선 즉시 hide 확인 |
| 특수 케이스 2 | 레이아웃 4 + `wheat` (3구간) → 400 WHOLESALE_NOT_AVAILABLE + 레이아웃 1 폴백 |
| 특수 케이스 3 | 이상 노드: `confidence_grade` 3등급 각 1개 이상 — 색상 확인 |
| 특수 케이스 4 | `index_2020: null` 포인트 1개 — `PARSE-NUM-002` skip 처리 확인 |
| 특수 케이스 5 | layout=99 등 범위 외 → INVALID_LAYOUT + 레이아웃 1 폴백 확인 |
| Fixture 경로 | `src/fixtures/raw_prices.json` (레이아웃 2), `src/fixtures/raw_prices_minimap.json`, `src/fixtures/raw_prices_lay4_error.json`, `src/fixtures/raw_prices_invalid_layout.json` |
| MOCK 분기 조건 | `import.meta.env.VITE_USE_MOCK !== 'false'` |
| 더미 → 실제 전환 트리거 | `VITE_USE_MOCK=false` + `feat/be-api-timeseries` dev 머지 완료 후 |

### 6.1 raw_prices.json fixture 최소 구조 (레이아웃 2)

```json
{
  "commodity_id": "wheat",
  "layout": 2,
  "requested_from": "2023-04",
  "requested_to":   "2026-03",
  "actual_from":    "2023-04",
  "actual_to":      "2026-03",
  "granularity":    "monthly",
  "total_points":   36,
  "series": [
    {
      "source": "intl_price_krw",
      "label_kr": "국제가 (원화 환산)",
      "color_hint": "purple",
      "data": [
        { "period": "2023-04", "value": 289.3, "index_2020": 137.5, "has_anomaly": false, "anomaly_ids": [] },
        { "period": "2026-03", "value": 310.2, "index_2020": 147.1, "has_anomaly": true, "anomaly_ids": [142] }
      ]
    },
    {
      "source": "import_price",
      "label_kr": "수입단가",
      "color_hint": "blue",
      "data": [
        { "period": "2023-04", "value": 520.1, "index_2020": 125.3, "has_anomaly": false, "anomaly_ids": [] }
      ]
    }
  ],
  "transmission_overlay": [
    {
      "segment_id": "A",
      "data": [
        { "period": "2023-04", "transmission_rate": 0.89, "has_anomaly": false, "anomaly_ids": [] },
        { "period": "2026-03", "transmission_rate": 1.43, "has_anomaly": true, "anomaly_ids": [142] }
      ]
    }
  ],
  "anomaly_nodes": [
    {
      "anomaly_id": 142,
      "segment_id": "A",
      "period": "2026-03",
      "confidence_grade": "high",
      "primary_pattern": "pattern2",
      "is_new": true
    }
  ]
}
```

### 6.2 raw_prices_minimap.json fixture 최소 구조

```json
{
  "commodity_id": "wheat",
  "layout": 2,
  "requested_from": "2010-01",
  "requested_to":   "2026-03",
  "actual_from":    "2010-01",
  "actual_to":      "2026-03",
  "granularity":    "yearly",
  "total_points":   16,
  "series": [
    {
      "source": "intl_price_krw",
      "label_kr": "국제가 (원화 환산)",
      "color_hint": "purple",
      "data": [
        { "period": "2010-01", "value": 210.0, "index_2020": 100.0, "has_anomaly": false, "anomaly_ids": [] },
        { "period": "2022-01", "value": 380.0, "index_2020": 180.9, "has_anomaly": true, "anomaly_ids": [142] }
      ]
    }
  ],
  "anomaly_density": [
    { "period": "2022-01", "high_count": 1, "medium_count": 0, "reference_count": 0 },
    { "period": "2021-01", "high_count": 0, "medium_count": 1, "reference_count": 1 }
  ]
}
```

### 6.3 raw_prices_lay4_error.json fixture (WHOLESALE_NOT_AVAILABLE)

```json
{
  "error_code": "WHOLESALE_NOT_AVAILABLE",
  "message": "이 품목은 도매가 데이터가 없습니다. 3구간 품목(국제가→수입단가→PPI→CPI 경로)입니다.",
  "commodity_id": "wheat",
  "layout_requested": 4
}
```

### 6.4 raw_prices_invalid_layout.json fixture (INVALID_LAYOUT)

```json
{
  "error_code": "INVALID_LAYOUT",
  "message": "지원하지 않는 레이아웃 번호입니다. 1~6만 허용됩니다.",
  "commodity_id": "wheat",
  "layout_requested": 99
}
```

> mock 인터셉터에서 위 fixture를 `{ response: { status: 400, data: fixture } }` 형태로 래핑하여 Axios 에러로 전달.

---

## 7. 완료 기준

| 항목 | 기준 |
|------|------|
| 레이아웃 2 기본 렌더링 | `wheat` + 레이아웃 2 기준, intl·import 소스 2개 곡선 SVG 렌더링 확인 |
| Y축 2020=100 | index_2020 값이 Y축에 직접 표시 (가공 없음) 확인 |
| 소스 색상 | 보라(intl)·청색(import)·녹색(ppi)·주황(wholesale)·빨강(cpi) 확인 |
| 전이율 오버레이 | 레이아웃 2 기준 구간 A 전이율 회색 점선 오버레이 렌더링 확인 |
| 레이아웃 1 전환 | 레이아웃 1 선택 시 소스 5개 렌더링, 전이율 오버레이 없음 확인 |
| 레이아웃 1 소스 토글 | 토글 클릭 시 해당 소스 곡선 즉시 hide/show 확인. 재조회 없음 (Network 탭) |
| 레이아웃 4 정상 차단 | **fe-layout-filter FilterBar에서 has_wholesale=false 품목 → 레이아웃 4 disable 확인** (PM 별건 #5 verify) |
| 레이아웃 4 비정상 진입 폴백 | URL 직접 조작·스토어 강제 세팅 시 → FE_TOAST + 레이아웃 1 자동 전환 확인 |
| INVALID_LAYOUT 폴백 | layout=99 등 범위 외 → FE_TOAST + 레이아웃 1 자동 전환 확인. 무한 토스트 없음 |
| 레이아웃 5 3구간 폴백 | `wheat` + 레이아웃 5 → ppi·cpi (D′) 소스 표시, 에러 없음 확인 |
| 이상 노드 렌더링 | 3등급 색상 각 1개 이상 확인 |
| 이상 노드 클릭 | 클릭 시 `selectAnomaly` 호출 → `selectedAnomalyId` + `isPanelOpen=true` 확인 |
| NEW 배지 | `is_new: true` 노드에 "NEW" 텍스트 표시 확인 |
| 사건 오버레이 | `eventFilter`에 이벤트 추가 시 `useAppStore.events.color_hex` 색상으로 음영 렌더링 |
| 마우스 휠 줌 | X축 확대/축소 확인. 최소 3개월 이하 불가 |
| 미니맵 컴포넌트 재사용 | `Minimap variant="raw-prices"` 마운트 확인. 신규 RawPricesMinimap.tsx 미사용 (PM 별건 #1) |
| 미니맵 브러시 | 브러시 이동 시 `filterFrom`·`filterTo` 스토어 갱신 + 메인 차트 즉시 반영 확인 |
| MOCK 분기 | `VITE_USE_MOCK !== 'false'` 시 fixture 반환 |
| activeTab 분기 | `activeTab === 'raw-prices'`일 때만 마운트, 탭 전환 시 unmount 확인 |
| 타입 일치 | `anomaly_id` 모두 `number` 타입 처리 확인 |

---

## 8. 금지 사항

| 금지 사항 | 이유 |
|-----------|------|
| `index_2020` 또는 `transmission_rate` 가공·재계산 | 백엔드 API 응답값 직접 사용 원칙 |
| D3.js 외 시각화 라이브러리 추가 | D3.js v7 단일 사용 원칙 |
| `has_wholesale: false` 품목에서 레이아웃 4·도매가 강제 표시 | 3구간 품목 도매가 UI 노출 금지 (CLAUDE.md §15-6) |
| 이벤트 오버레이를 시계열 응답에서 파싱 | `/events` 별도 호출 원칙 |
| INVALID_LAYOUT 수신 후 무한 토스트 발생 | 폴백 후 fixture/응답 정상이면 중단 처리 필수 |
| 신규 `RawPricesMinimap.tsx` 무조건 생성 | PM 별건 #1·#7에 따라 fe-minimap 재사용 우선. 제네릭화 불가 판명 시에만 생성 |
| 구 Zustand 필드명(`fromMonth`/`toMonth`/`selectedGrades`/`selectedPatterns`/`selectedEventKeys`) 신규 사용 | fe-layout-filter v4 SoT 정합 위반 |
| localStorage / sessionStorage 사용 | frame_spec_frontend_vN §8.10 |

---

## 9. PR 체크리스트

### Feature 명세
`docs/feature_spec_fe-raw-timeseries_vN.md` (최신 버전)

### 체크리스트
- [ ] TypeScript 컴파일 오류 없음
- [ ] ESLint 경고 없음
- [ ] vitest 스모크 테스트 통과
- [ ] `RAW_PRICE_COLORS` 색상 상수 `colorUtils.ts`에 추가 확인
- [ ] `raw_prices.json` fixture에 이상 노드 3등급 각 1개 이상 포함 확인
- [ ] `raw_prices_lay4_error.json` fixture 400 에러 래핑 확인
- [ ] `raw_prices_invalid_layout.json` fixture 400 에러 래핑 확인
- [ ] 레이아웃 4 에러 → 레이아웃 1 폴백 흐름 확인
- [ ] INVALID_LAYOUT 폴백 + 무한 토스트 방지 확인
- [ ] 레이아웃 1 소스 토글 시 Network 요청 없음 확인
- [ ] `anomaly_id` 모두 정수 리터럴 확인
- [ ] fe-layout-filter FilterBar에서 has_wholesale=false 품목 → 레이아웃 4 disable verify (P1 #4)
- [ ] 미니맵 컴포넌트 재사용 (Minimap.tsx variant="raw-prices") — RawPricesMinimap.tsx 미생성 확인
- [ ] 미니맵 브러시 이동 → 메인 차트 filterFrom/filterTo 동기화 확인

### PM 별건 처리 결과
- [ ] PM 별건 #1·#7 — 미니맵 재사용 채택 확인 (제네릭화 불가 판명 시만 신규 컴포넌트)
- [ ] PM 별건 #2 — wholesale source 필드명 SoT 결재 결과 반영
- [ ] PM 별건 #3 — 전이율 오버레이 Y축 정책 결재 결과 반영
- [ ] PM 별건 #4 — 레이아웃 1 소스 토글 상태 위치 결재
- [ ] PM 별건 #5 — 선행 조건 (`feat/fe-stream-chart`·`feat/fe-minimap` 의존) → feature_dev_list v5 bump
- [ ] PM 별건 #6 — feature_dev_list `§5.3 → §4.3` 정정

---

## 10. 참고 문서

| 문서 | 참조 섹션 | 참조 목적 |
|------|-----------|-----------|
| `api_spec_vN.md` | `§/commodities/{id}/raw-prices, §/raw-prices/minimap, §API-LAY-001, §API-LAY-002` | 레이아웃 폴백 정책·응답 필드·에러 코드 |
| `web_plan_vN.md` | `§4.3` | 원시 시계열 UX |
| `frame_spec_frontend_vN.md` | `§2, §6.1, §6.2, §8.6` | 디렉토리·snake_case·Zustand SoT·D3 위치 |
| `exception_spec_vN.md` | `§2.4 FE-*, §2.3 PARSE-*` | 에러 코드 |
| `feature_spec_fe-minimap_vN.md` | `§3.3, §5, §7` | 미니맵 브러시·store 동기화 패턴·variant props |
| `feature_spec_fe-layout-filter_vN.md` | `§3.1, §3.2 FilterBar 구간 토글` | Zustand SoT 필드·has_wholesale disable 정책 |
| `feature_spec_fe-stream-chart_vN.md` | `§4 colorUtils.ts` | 이상 노드 색상·반지름 상수 재사용 |
| `src/types/timeseries.ts` | `RawPricesResponse, RawPricesMinimapResponse, RawPriceAnomalyNode` | 타입 정의 |
| `src/types/literals.ts` | `RawPriceSource` | 소스 리터럴 값 (PM 별건 #2) |
