# Feature 명세서 — 원시 시계열 가격 단계 그래프

**문서 유형**: Feature 명세서  
**기능 번호**: `FE-RAW`  
**브랜치명**: `feat/fe-raw-timeseries`  
**담당자**: 하대수  
**작성일**: 2026-05-06  
**상태**: 초안  

**변경 이력**
- v1 (2026-05-06): 최초 작성

---

## ⚠️ 구현 시작 전 필수 확인

| 문서 | 버전 | 참조 목적 | 확인 |
|------|------|-----------|------|
| `api_spec_vN.md §/commodities/{id}/raw-prices, §/raw-prices/minimap` | 최신(`docs_manifest.md` 조회) | 엔드포인트·query params·response 필드명·타입·레이아웃 폴백 정책 | ☐ |
| `exception_spec_vN.md §2.4 FE-*, §2.3 PARSE-*, §8 브랜치 매핑` | 최신(`docs_manifest.md` 조회) | 에러 코드·처리 방침 | ☐ |
| `frame_spec_frontend_vN.md §2, §6, §8` | 최신(`docs_manifest.md` 조회) | 디렉토리 구조·snake_case·절대 금지 사항 | ☐ |
| `web_plan_vN.md §4.3` | 최신(`docs_manifest.md` 조회) | 원시 시계열 UX 상세 명세 (레이아웃·소스 색상·Y축·오버레이·미니맵) | ☐ |
| `feature_dev_list_vN.md §feat/fe-raw-timeseries` | 최신(`docs_manifest.md` 조회) | 구현 범위·완료 기준 | ☐ |

> **버전 해석**: 문서명의 `vN`은 `docs/docs_manifest.md` SoT에서 해당 문서의 현재 최신 버전 번호를 조회한다.

---

## ⚠️ Action Items — 미결 불일치 항목

| 항목 | 현황 | 정답 | 근거 |
|------|------|------|------|
| `wholesale` vs `wholesale_price` source 필드명 | `src/types/literals.ts`: `'wholesale_price'` | `api_spec_vN §/raw-prices` 응답 레이아웃 표: "wholesale" 약칭 사용, 실제 JSON source 필드값 불명확 | `api_spec_vN` 응답 JSON 예시는 `"intl_price_krw"`만 명시. `wholesale` 계열 소스의 실제 JSON 필드값(`"wholesale"` vs `"wholesale_price"`) PM·백엔드 확인 필요. 본 명세는 `src/types/literals.ts`의 `'wholesale_price'` 기준으로 작성. 불일치 시 `literals.ts` 수정 필요 |
| 전이율 오버레이 Y축 표현 방식 | `web_plan_vN §4.3`: "전이율 곡선을 보조 Y축(우측) 없이 동일 지수 축에 표시" | 전이율은 단위가 무차원(소수) — 2020=100 지수 스케일(0~200 내외)과 상이함 | 전이율(0.5~2.0 범위)을 2020=100 지수 스케일 Y축에 직접 표시하면 시각적으로 거의 평탄한 선이 됨. web_plan이 이 상태를 의도한 것인지, 정규화(×100 등) 허용인지 PM 확인 필요. 본 명세는 web_plan 원문 기준(별도 Y축 없음, API 응답값 그대로) 구현으로 명세 |
| 미니맵 컴포넌트 재사용 여부 | `web_plan_vN §4.3`: "흐름 보기와 동일한 미니맵 컴포넌트 재사용" | 스트림 미니맵(`Minimap.tsx`)은 `StreamMinimapResponse` 타입을 받음; raw-prices 미니맵은 `RawPricesMinimapResponse` (구조는 유사하나 `series` 타입 상이) | 재사용 가능하면 `Minimap.tsx` props 인터페이스를 제네릭으로 확장. 불가하면 `RawPricesMinimap.tsx` 신규 생성. `feat/fe-minimap` 구현 완료 후 Minimap 컴포넌트 props 확인 후 결정. 본 명세는 신규 `RawPricesMinimap.tsx`로 명세하고, 재사용 가능 판명 시 대체 |
| 레이아웃 1 소스 on/off 토글 상태 관리 | 현 스토어에 소스별 on/off 상태 없음 | 로컬 컴포넌트 상태 vs useAppStore FilterState 추가 | 레이아웃 1 소스 토글은 뷰 내부 표시 옵션이므로 컴포넌트 로컬 상태로 관리. 다른 뷰 전환·재진입 시 리셋 허용. PM 이견 없으면 로컬 상태 방식 채택 |

---

## 1. 기능 개요

### 1.1 한 줄 요약

`feat/fe-layout-filter`로 확장된 `layoutNumber` 스토어 상태를 읽어, D3.js 기반 원시 시계열 가격 단계 그래프(6종 레이아웃·소스 곡선·전이율 오버레이·이상 노드·미니맵)를 `src/components/charts/RawPricesChart.tsx`로 구현한다.

### 1.2 데이터 흐름

```
useAppStore (primaryCommodityId, filterFrom, filterTo, granularity,
             layoutNumber, confidenceFilter, patternFilter, eventFilter)
  → useRawPricesData(commodityId, { layout, from, to, granularity }) [React Query]
    → GET /commodities/{id}/raw-prices?layout=&from=&to=&granularity=
    → RawPricesResponse { layout, series[], transmission_overlay[], anomaly_nodes[] }

useAppStore (primaryCommodityId, layoutNumber)
  → useRawPricesMinimapData(commodityId, { layout }) [React Query]
    → GET /commodities/{id}/raw-prices/minimap?layout=
    → RawPricesMinimapResponse { layout, series[], anomaly_density[] }

RawPricesResponse
  → RawPricesChart.tsx (D3.js)
    → 소스별 곡선 (Y축: index_2020, 2020=100 지수)
    → [레이아웃 1] 소스 on/off 토글 버튼
    → [레이아웃 2~6] 전이율 오버레이 곡선 (회색 계열 점선, 동일 Y축)
    → 이상 노드 (신뢰도별 색상·크기·글로우·NEW 배지·호버·클릭)
    → 사건 오버레이 (eventFilter 기반 배경 음영)
    → 줌 (마우스 휠·더블클릭·기간 프리셋, 스트림 차트와 동일 방식)

RawPricesMinimapResponse
  → RawPricesMinimap.tsx (D3.js)
    → 전체 기간 소스 곡선 (yearly 집계) + 이상 밀도 바
    → 브러시 뷰포트 (스트림 미니맵과 동일 방식)
    → 브러시 이동 → useAppStore filterFrom·filterTo 갱신

이상 노드 클릭
  → useAppStore.setSelectedAnomalyId(anomaly_id) [integer]
  → useAppStore.setPanelOpen(true)
```

### 1.3 프레임 내 위치

| 구분 | 경로 | 작업 내용 |
|------|------|-----------|
| 수정 | `src/pages/MainPage.tsx` | `activeTab === 'raw-prices'` 분기에 `<RawPricesChart />` + `<RawPricesMinimap />` 마운트 |
| 수정 | `src/api/client.ts` | `MOCK_ROUTES` 배열에 raw-prices 및 raw-prices/minimap 동적 경로 추가 |
| 신규 | `src/components/charts/RawPricesChart.tsx` | D3.js 다선 시계열 컴포넌트. 레이아웃별 소스 조합·전이율 오버레이·이상 노드·줌·사건 오버레이 포함 |
| 신규 | `src/components/charts/RawPricesMinimap.tsx` | D3.js 원시 시계열 미니맵. `RawPricesMinimapResponse` 기반 (재사용 가능 판명 시 `Minimap.tsx`로 대체) |
| 신규 | `src/hooks/useRawPricesData.ts` | `/raw-prices` React Query 훅. `layoutNumber`·`primaryCommodityId`·`filterFrom`·`filterTo`·`granularity` 변경 시 자동 재조회. retry: 3 |
| 신규 | `src/hooks/useRawPricesMinimapData.ts` | `/raw-prices/minimap` React Query 훅. `layoutNumber`·`primaryCommodityId` 변경 시 재조회. retry: 3 |
| 신규 | `src/fixtures/raw_prices.json` | GET `/commodities/wheat/raw-prices?layout=2` mock 응답 (wheat, 3구간 품목, 레이아웃 2) |
| 신규 | `src/fixtures/raw_prices_minimap.json` | GET `/commodities/wheat/raw-prices/minimap?layout=2` mock 응답 |
| 신규 | `src/fixtures/raw_prices_lay4_error.json` | 레이아웃 4 3구간 품목 오류 응답 (`WHOLESALE_NOT_AVAILABLE`) 검증용 |

> **`endpoints.ts` 미수정**: `COMMODITY_RAW_PRICES: (id: string) => '/commodities/${id}/raw-prices'` 등이 frame 단계에서 이미 정의됨.  
> **`src/hooks/` 폴더**: `feat/fe-layout-filter`에서 신규 생성됨. 선행 조건 머지 후 존재.

### 1.4 구현 범위 및 비구현 범위

| 구분 | 내용 |
|------|------|
| **구현** | D3.js RawPricesChart — 6종 레이아웃 전환(레이아웃 1 소스 토글 포함), 2020=100 지수 Y축, 소스별 색상 곡선, 전이율 오버레이(레이아웃 2~6), 이상 노드(3등급 색상·글로우·NEW 배지·호버·클릭), 사건 오버레이, 줌(마우스 휠·더블클릭·기간 프리셋), 레이아웃 4 에러 핸들링 + 레이아웃 1 폴백, 레이아웃 5 3구간 품목 자동 폴백 표시, RawPricesMinimap, useRawPricesData·useRawPricesMinimapData 훅, fixture 3종 |
| **비구현** | 전이율 오버레이 보조 Y축 (Action Item 미확정), `baseline` 관련 UI (raw-prices 응답에 없음), 보조 품목 오버레이 없음 (raw-prices 뷰는 단일 품목 집중 분석) |
| **선행 조건** | `frame/frontend` + `feat/fe-layout-filter` + `feat/fe-stream-chart` + `feat/fe-minimap` → `develop` PR 머지 완료 (`src/hooks/`·`src/utils/colorUtils.ts`·`Minimap.tsx` 패턴 참조) |

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
| `series[].source` | `RawPriceSource` | `'intl_price_krw' \| 'import_price' \| 'ppi' \| 'wholesale_price' \| 'cpi'` |
| `series[].label_kr` | `string` | 범례 표시용 한국어 레이블 |
| `series[].color_hint` | `string` | API 제공 색상 힌트. 본 명세는 §3.3 색상 상수 우선 적용, `color_hint`는 참고용 |
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
| `anomaly_nodes[].period` | `string` | YYYY-MM, 항상 원본 월 단위 |
| `anomaly_nodes[].confidence_grade` | `ConfidenceGrade` | |
| `anomaly_nodes[].primary_pattern` | `PrimaryPattern` | |
| `anomaly_nodes[].is_new` | `boolean` | |

> **`transmission_overlay`**: 레이아웃 1은 빈 배열 `[]`. 레이아웃 2~6은 해당 구간 전이율 데이터 포함.  
> **`anomaly_nodes`**: `RawPriceAnomalyNode` 타입. 스트림 이상 노드와 달리 `transmission_rate`·`pattern_types` 필드 없음.

### 2.2 API 응답 — `/raw-prices/minimap`

| 필드 | 타입 | 비고 |
|------|------|------|
| `layout` | `number` | |
| `series[]` | `RawPriceSeriesItem[]` | `granularity=yearly` 고정 집계 |
| `anomaly_density[]` | `AnomalyDensityItem[]` | `{ period, high_count, medium_count, reference_count }` |
| 공통 envelope 필드 | `TimeseriesEnvelope` | `granularity: 'yearly'` 고정 |

### 2.3 useAppStore 읽기 상태

| 슬라이스 | 필드 | 용도 |
|---------|------|------|
| CommodityState | `primaryCommodityId: string \| null` | /raw-prices 요청 `{id}` 경로 변수 |
| FilterState | `filterFrom: string \| null` | 쿼리 파라미터 `from` |
| FilterState | `filterTo: string \| null` | 쿼리 파라미터 `to` |
| FilterState | `granularity: 'monthly' \| 'quarterly' \| 'yearly'` | 쿼리 파라미터 `granularity` |
| FilterState | `confidenceFilter: ConfidenceGrade[]` | 이상 노드 필터링 (클라이언트 필터. 쿼리 파라미터 미전달) |
| FilterState | `eventFilter: string[]` | 사건 오버레이 배경 음영 필터 |
| OverlayState | `layoutNumber: number` | 쿼리 파라미터 `layout` (1~6) |
| CommodityState | `commodities: Commodity[]` | 현재 품목의 `has_wholesale` 참조용 |

### 2.4 타입 변환 규칙

| 변환 위치 | AS-IS | TO-BE | 규칙 |
|-----------|-------|-------|------|
| `index_2020: null` | `null` (이상값 또는 데이터 미비) | 해당 포인트 skip | `PARSE-NUM-002`. 콘솔 경고 |
| `index_2020: "NaN"` 문자열 | `"NaN"` string | NaN 필터링 | `PARSE-NUM-002`. skip 후 재렌더링 |
| `period` 파싱 | `"2023-04"` (string) | `Date` 객체 | `parse(s, 'yyyy-MM', new Date())`. 실패 → `PARSE-DATE-002` |
| `transmission_rate: null` | `null` (데이터 미비 또는 워밍업) | 해당 포인트 skip (오버레이 선 끊김) | 오버레이는 정상 케이스로 처리. `PARSE-NUM-002` 미적용 |

---

## 3. 출력 데이터

### 3.1 렌더링 출력

| 출력 | 내용 |
|------|------|
| `RawPricesChart.tsx` SVG | 레이아웃별 소스 곡선 + 전이율 오버레이 + 이상 노드 + 사건 오버레이 |
| `RawPricesMinimap.tsx` SVG | 전체 기간 개요 + 이상 밀도 바 + 브러시 뷰포트 |
| 빈 데이터 UI | `series[]` 모두 빈 배열 시 "이 기간에는 데이터가 없습니다." |

### 3.2 useAppStore 쓰기

| 필드 | 트리거 | 값 |
|------|--------|-----|
| `selectedAnomalyId: number \| null` | 이상 노드 클릭 | 클릭된 `anomaly_id` (integer) |
| `isPanelOpen: boolean` | 이상 노드 클릭 | `true` |
| `filterFrom: string` | 미니맵 브러시 이동 | 브러시 시작 YYYY-MM |
| `filterTo: string` | 미니맵 브러시 이동 | 브러시 끝 YYYY-MM |

### 3.3 시각화 규격 (web_plan_vN §4.3 기준)

#### ① Y축 및 공통 규격

| 항목 | 규격 |
|------|------|
| Y축 | 2020년 평균 = 100 기준 지수 (`index_2020` 필드 직접 사용). 단일 Y축 |
| X축 | 월별 시간. 스트림 차트와 동일 기간 필터·줌 연동 |
| 그리드 | 회색 점선 수평·수직 (`opacity: 0.3`) |
| 기준선 | y=100 (2020년 기준) 강조 실선 (`opacity: 0.5`) |

#### ② 소스별 색상

| 소스 | `RawPriceSource` 값 | 색상 | 범례 레이블 |
|------|---------------------|------|-------------|
| 국제가 (원화 환산) | `intl_price_krw` | 보라 (`#a855f7`) | `series[].label_kr` 값 사용 |
| 수입단가 | `import_price` | 청색 (`#3b82f6`) | 동일 |
| PPI | `ppi` | 녹색 (`#22c55e`) | 동일 |
| 도매가 | `wholesale_price` | 주황 (`#f97316`) | 동일 |
| CPI | `cpi` | 빨강 (`#e24b4a`) | 동일 |

> 색상 상수는 `src/utils/colorUtils.ts`에 `RAW_PRICE_COLORS` 객체로 추가. 컴포넌트 내 하드코딩 금지.

#### ③ 레이아웃별 렌더링 규칙

| 레이아웃 | 표시 소스 | 전이율 오버레이 구간 | 3구간 품목 동작 |
|----------|-----------|---------------------|-----------------|
| 1 | intl·import·ppi·wholesale·cpi (소스 on/off 토글 가능) | 없음 | wholesale 비활성 (토글 회색, 클릭 불가) |
| 2 | intl·import | 구간 A | 정상 |
| 3 | import·ppi | 구간 B | 정상 |
| 4 | ppi·wholesale | 구간 C | **3구간 품목**: API `WHOLESALE_NOT_AVAILABLE` (400) 수신 → FE_TOAST + layoutNumber 1로 복구 |
| 5 | wholesale·cpi (4구간 D) / ppi·cpi (3구간 D′) | 구간 D 또는 D′ | 3구간 품목: API 자동 폴백 (에러 없음). 반환된 series 그대로 렌더링 |
| 6 | intl·import·ppi·wholesale·cpi | 모든 구간 (품목에 따라 상이) | wholesale 포함 소스는 3구간 품목에서 API 반환 없음. 반환된 series 그대로 렌더링 |

> **레이아웃 4 폴백**: 에러 수신 → `useAppStore.setLayoutNumber(1)` 호출 → useRawPricesData 자동 재조회. FE_TOAST: "이 품목은 도매가 데이터가 없어 레이아웃 1로 전환합니다."  
> **레이아웃 1 소스 토글**: 로컬 상태 `enabledSources: RawPriceSource[]` (초기: API 반환된 `series[].source` 전체). 토글 클릭 시 해당 소스 곡선 즉시 show/hide (재조회 없음)

#### ④ 전이율 오버레이

- **레이아웃 1**: `transmission_overlay: []` — 오버레이 없음
- **레이아웃 2~6**: 해당 구간 `transmission_overlay[0].data` 렌더링
  - 색상: `#64748b` (slate-500, 회색 점선)
  - `stroke-dasharray: 4,3`
  - Y값: `transmission_rate` API 응답값 그대로 (Action Item: 스케일 불일치 PM 확인 전까지 원값 표시)
  - 범례: "전이율 (구간 X)" 레이블

#### ⑤ 이상 노드

| 신뢰도 | 색상 | 반지름 | 효과 |
|--------|------|--------|------|
| `high` | `#e24b4a` | 7px | CSS 글로우 + 펄스 |
| `medium` | `#ef9f27` | 5.5px | CSS 글로우 |
| `reference` | `#c8d850` (연두) | 4px | 없음 |

- `is_new: true` → "NEW" 텍스트 배지 (노드 상단)
- 이상 노드는 해당 `segment_id`의 소스 곡선 위에 표시 (어떤 소스 곡선에 표시할지: 해당 구간 하류 소스 곡선)
- `RawPriceAnomalyNode`는 `transmission_rate`·`pattern_types` 없음 → 툴팁 표시 제한

#### ⑥ 이상 노드 호버 툴팁 (raw-prices 한정)

| 필드 | 표시 형식 |
|------|-----------|
| `period` | `YYYY년 M월` |
| `confidence_grade` | "고신뢰" / "중신뢰" / "참고" |
| `primary_pattern` | "패턴1: 비대칭" / "패턴2: 과대" / "패턴3: 깃털" |
| (미표시) | `transmission_rate` — 이 응답에 없음 |

#### ⑦ 줌

| 방법 | 동작 |
|------|------|
| 마우스 휠 스크롤 | 포인터 X 기준 X축 확대/축소. 최소 3개월, 최대 전체 기간 |
| 더블클릭 | 클릭 위치 중심 2배 확대 |
| 기간 프리셋 버튼 | `filterFrom`·`filterTo` 스토어 상태 반영 (스트림 차트와 동기화) |

#### ⑧ 사건 오버레이

스트림 차트와 동일 방식. `eventFilter[]` 기반 `/events` fixture 배경 음영.

---

## 4. 파라미터 제약 조건

| 파라미터 | 관리 위치 | 기본값 |
|----------|-----------|--------|
| 소스별 색상 (`RAW_PRICE_COLORS`) | `src/utils/colorUtils.ts` | §3.3② 색상표 |
| 이상 노드 색상·반지름 | `src/utils/colorUtils.ts` | `feat/fe-stream-chart` 정의값 재사용 |
| 전이율 오버레이 색상 | `src/utils/colorUtils.ts` 또는 RawPricesChart 상수 | `#64748b` |
| `layoutNumber` 초기값 | `useAppStore.ts` OverlayState 초기 상태 | `1` |
| 레이아웃 4 FE_TOAST 메시지 | 상수 또는 i18n | "이 품목은 도매가 데이터가 없어 레이아웃 1로 전환합니다." |

---

## 5. 예외처리

### 5.1 적용 예외 코드

| 예외 코드 | 발생 조건 | 처리 방침 |
|-----------|-----------|-----------|
| `FE-API-001` | `/raw-prices` 또는 `/raw-prices/minimap` 네트워크 실패 | FE_TOAST + 재시도 버튼. retry: 3 |
| `FE-API-002` | `/raw-prices` 400 응답. **특히 레이아웃 4 + 3구간 품목 → `WHOLESALE_NOT_AVAILABLE`** | FE_TOAST ("이 품목은 도매가 데이터가 없어 레이아웃 1로 전환합니다.") + `setLayoutNumber(1)` 호출. 일반 400은 FE_TOAST (api_error_code 기반 메시지) |
| `FE-API-003` | `/raw-prices` 404 (`COMMODITY_NOT_FOUND`) | FE_FALLBACK — 빈 상태 UI |
| `FE-API-004` | `/raw-prices` 500 | FE_BLOCK — RawPricesChart 에러 UI. ErrorBoundary 전파 방지 |
| `FE-D3-001` | `series[]` 빈 배열 | FE_FALLBACK — "이 기간에는 데이터가 없습니다." |
| `FE-D3-002` | `index_2020` NaN 포함 D3 스케일 실패 | FE_FALLBACK — NaN 포인트 필터 후 재렌더링 |
| `FE-D3-003` | SVG 컨테이너 크기 0 | FE_FALLBACK — ResizeObserver 복구 후 재렌더링 |
| `PARSE-DATE-002` | `data[].period` YYYY-MM 파싱 실패 | FE_FALLBACK — 해당 포인트 skip, 콘솔 경고 |
| `PARSE-NUM-002` | `index_2020: null` (비정상) 또는 `"NaN"` 문자열 | FE_FALLBACK — 해당 포인트 skip |
| `PARSE-ARR-002` | `series[]` 또는 `anomaly_nodes[]` 배열 요소 필수 필드 누락 | FE_FALLBACK — 해당 배열 전체 빈 처리, 콘솔 경고 |
| `FE-MOCK-001` | `VITE_USE_MOCK !== 'false'`에서 `raw_prices.json` 없음 | FE_BLOCK (개발환경 전용) |

### 5.2 레이아웃 4 에러 처리 흐름

```
사용자: 레이아웃 4 선택 (has_wholesale: false 품목)
  → FilterBar: 레이아웃 4 선택지 그레이아웃 (FE-LAY 구현) → 정상 경로 차단
  → [예외] store.layoutNumber가 4로 세팅된 경우 (URL 파라미터·스토어 직접 조작 등)
    → useRawPricesData: GET /raw-prices?layout=4 요청
    → 400 WHOLESALE_NOT_AVAILABLE 수신
    → FE_API_002 처리: FE_TOAST + store.setLayoutNumber(1)
    → useRawPricesData 자동 재조회 (layout=1)
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
| 특수 케이스 2 | 레이아웃 4 + `wheat` (3구간) → 400 WHOLESALE_NOT_AVAILABLE 수신 + 레이아웃 1 폴백 확인 |
| 특수 케이스 3 | 이상 노드: `confidence_grade` 3등급 각 1개 이상 포함 — 색상 렌더링 확인 |
| 특수 케이스 4 | `index_2020: null` 포인트 1개 포함 — `PARSE-NUM-002` skip 처리 확인 |
| Fixture 경로 | `src/fixtures/raw_prices.json` (레이아웃 2), `src/fixtures/raw_prices_minimap.json`, `src/fixtures/raw_prices_lay4_error.json` |
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

> `anomaly_id`는 정수(number 리터럴). `transmission_overlay`는 레이아웃 2이므로 구간 A 데이터 포함.

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

### 6.3 raw_prices_lay4_error.json fixture (레이아웃 4 에러)

`FE-API-002 WHOLESALE_NOT_AVAILABLE` 에러 응답 fixture. Axios mock 인터셉터에서 400 상태코드로 래핑 필요.

```json
{
  "error_code": "WHOLESALE_NOT_AVAILABLE",
  "message": "이 품목은 도매가 데이터가 없습니다. 3구간 품목(국제가→수입단가→PPI→CPI 경로)입니다.",
  "commodity_id": "wheat",
  "layout_requested": 4
}
```

> mock 인터셉터에서 이 fixture를 `{ response: { status: 400, data: fixture } }` 형태로 래핑하여 Axios 에러로 전달.

---

## 7. 완료 기준

| 항목 | 기준 |
|------|------|
| 레이아웃 2 기본 렌더링 | `wheat` + 레이아웃 2 기준, intl·import 소스 2개 곡선 SVG 렌더링 확인 (브라우저) |
| Y축 2020=100 | index_2020 값이 Y축에 직접 표시 (가공 없음) 확인 |
| 소스 색상 | 보라(intl)·청색(import)·녹색(ppi)·주황(wholesale)·빨강(cpi) 확인 |
| 전이율 오버레이 | 레이아웃 2 기준 구간 A 전이율 회색 점선 오버레이 렌더링 확인 |
| 레이아웃 1 전환 | 레이아웃 1 선택 시 소스 5개 렌더링, 전이율 오버레이 없음 확인 |
| 레이아웃 1 소스 토글 | 토글 클릭 시 해당 소스 곡선 즉시 hide/show 확인. 재조회 없음 확인 (Network 탭) |
| 레이아웃 4 에러 폴백 | `wheat` + 레이아웃 4 → FE_TOAST 표시 + 레이아웃 1 자동 전환 확인 |
| 레이아웃 5 3구간 폴백 | `wheat` + 레이아웃 5 → ppi·cpi (D′) 소스 표시, 에러 없음 확인 |
| 이상 노드 렌더링 | 3등급 색상 각 1개 이상 확인 |
| 이상 노드 클릭 | 클릭 시 `selectedAnomalyId` 갱신 + `isPanelOpen: true` 확인 |
| NEW 배지 | `is_new: true` 노드에 "NEW" 텍스트 표시 확인 |
| 사건 오버레이 | `eventFilter`에 이벤트 추가 시 배경 음영 렌더링 확인 |
| 마우스 휠 줌 | X축 확대/축소 확인. 최소 3개월 이하 불가 |
| 미니맵 렌더링 | 전체 기간 소스 곡선 + 이상 밀도 바 + 브러시 SVG 렌더링 확인 |
| 미니맵 브러시 | 브러시 이동 시 `filterFrom`·`filterTo` 스토어 갱신 + 메인 차트 즉시 반영 확인 |
| MOCK 분기 | `VITE_USE_MOCK !== 'false'` 시 fixture 반환, HTTP 요청 없음 확인 |
| activeTab 분기 | `activeTab === 'raw-prices'`일 때만 마운트, 탭 전환 시 unmount 확인 |
| 타입 일치 | `anomaly_id` 모두 `number` 타입 처리 확인 |

---

## 8. 금지 사항

| 금지 사항 | 이유 |
|-----------|------|
| `index_2020` 또는 `transmission_rate` 가공·재계산 | 백엔드 API 응답값 직접 사용 원칙 |
| D3.js 외 시각화 라이브러리 추가 | D3.js v7 단일 사용 원칙 |
| `has_wholesale: false` 품목에서 레이아웃 4·소스 도매가 강제 표시 | 3구간 품목 도매가 UI 노출 금지 |
| 이벤트 오버레이를 시계열 응답에서 파싱 | `/events` 별도 호출 원칙 |
| 레이아웃 전환 시마다 전체 fixture 재설계 없이 layout 파라미터만 변경 | 각 레이아웃에 맞는 fixture를 사용하거나, mock 라우터에서 `layout` 파라미터를 분기 처리 |

---

## 9. PR 체크리스트

- [ ] TypeScript 컴파일 오류 없음
- [ ] ESLint 경고 없음
- [ ] vitest 스모크 테스트 통과
- [ ] `RAW_PRICE_COLORS` 색상 상수 `colorUtils.ts`에 추가 확인
- [ ] `raw_prices.json` fixture에 이상 노드 3등급 각 1개 이상 포함 확인
- [ ] `raw_prices_lay4_error.json` fixture 400 에러 래핑 확인
- [ ] 레이아웃 4 에러 → 레이아웃 1 폴백 흐름 확인
- [ ] 레이아웃 1 소스 토글 시 Network 요청 없음 확인
- [ ] `anomaly_id` 모두 정수 리터럴 확인
- [ ] 3구간 품목 레이아웃 4 선택 → FE_TOAST 표시 확인
- [ ] 미니맵 브러시 이동 → 메인 차트 filterFrom/filterTo 동기화 확인

---

## 10. 참고 문서

| 문서 | 참조 섹션 | 참조 목적 |
|------|-----------|-----------|
| `api_spec_vN.md` | `§/commodities/{id}/raw-prices, §/raw-prices/minimap` | 레이아웃 폴백 정책·응답 필드 최종 확인 |
| `web_plan_vN.md` | `§4.3` | 원시 시계열 UX (레이아웃별 소스·색상·Y축·오버레이) |
| `frame_spec_frontend_vN.md` | `§2, §6.1, §8.6` | 디렉토리·snake_case·D3 위치 |
| `exception_spec_vN.md` | `§2.4 FE-*, §2.3 PARSE-*` | 에러 코드 |
| `feature_spec_FE-MINIMAP_v1.md` | `§3.3, §5, §7` | 미니맵 브러시·store 동기화 패턴 참조 |
| `src/types/timeseries.ts` | `RawPricesResponse, RawPricesMinimapResponse, RawPriceAnomalyNode` | 타입 정의 최종 확인 |
| `src/types/literals.ts` | `RawPriceSource` | 소스 리터럴 값 확인 |
