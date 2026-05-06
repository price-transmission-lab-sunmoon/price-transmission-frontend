# Feature 명세서 — 스트림 그래프

**문서 유형**: Feature 명세서
**기능 번호**: `FE-STREAM`
**브랜치명**: `feat/fe-stream-chart`
**담당자**: 하대수
**작성일**: 2026-05-04
**상태**: 초안

**변경 이력**
- v1 (2026-05-04): 최초 작성

---

## ⚠️ 구현 시작 전 필수 확인

> AI 및 구현 담당자는 아래 문서가 **모두 첨부 또는 열람 가능한 상태**인지 확인한 후 구현을 시작한다.
> 하나라도 누락된 경우 구현을 시작하지 않고 PM에게 문서 제공을 요청한다.

| 문서 | 버전 | 참조 목적 | 확인 |
|------|------|-----------|------|
| `api_spec_vN.md §/commodities/{id}/stream, §/commodities/{id}/stream/minimap` | 최신(`docs_manifest.md` 조회) | 엔드포인트·query params·response 필드명·타입 | ☐ |
| `exception_spec_vN.md §2.4 FE-*, §2.3 PARSE-*, §8 브랜치 매핑` | 최신(`docs_manifest.md` 조회) | 이 기능에 해당하는 에러 코드·처리 방침 | ☐ |
| `frame_spec_frontend_vN.md §2, §6, §8` | 최신(`docs_manifest.md` 조회) | 디렉토리 구조·snake_case 정책·절대 금지 사항 | ☐ |
| `web_plan_vN.md §4.1` | 최신(`docs_manifest.md` 조회) | 스트림 그래프 UX 상세 명세 (곡선·노드·줌·미니맵·애니메이션) | ☐ |
| `feature_dev_list_vN.md §feat/fe-stream-chart` | 최신(`docs_manifest.md` 조회) | 구현 범위·완료 기준 | ☐ |

> **버전 해석**: 문서명의 `vN`은 `docs/docs_manifest.md` SoT에서 해당 문서의 현재 최신 버전 번호를 조회한다. 파일명을 하드코딩하지 않는다.

---

## ⚠️ Action Items — 미결 불일치 항목

> 본 명세서 작성 기준일(2026-05-04) 확인된 문서 간 정합성 문제.

| 항목 | 현황 | 정답 | 근거 |
|------|------|------|------|
| 참고 등급 노드 색상 | `feature_dev_list_vN §feat/fe-stream-chart`: "회색 원" | `web_plan_vN §4.1` 이상 노드 표: `#c8d850` (연두) | 두 SoT 불일치. PM 확정 후 본 명세 §3.3 반영 및 구현 |
| 4구간 품목 C·D 곡선 색상 | §3.3 "별도 확정" 표기 — 미정 | PM/디자인팀 확정 필요 (주 품목·보조 품목 팔레트 모두) | `wheat` 외 4구간 품목(예: `pork`) 검증·구현 시 색상 결정 부재로 진행 불가. `web_plan_vN §4.1` 4구간 색상 미정 |
| 선행 조건 차이 | `feature_dev_list_vN §feat/fe-stream-chart`: `frame/frontend` 머지만 명시 | 본 명세 §1.4: `frame/frontend` + `feat/fe-layout-filter` 머지 | useAppStore의 `secondaryCommodityId`·`activeSegments`·`selectedEventKeys`·`selectedGrades`·`selectedPatterns`·`fromMonth/toMonth`·`periodPreset`이 FE-LAY에서 정의됨. PM 확정 후 `feature_dev_list_vN` 갱신 필요 |
| CLAUDE.md 스토어 구조 | CLAUDE.md §7·§3: 다중 스토어 (`commodityStore`, `filterStore`, `panelStore`, `viewStore`, `overlayStore`) | `frame_spec_frontend_vN §2`: 단일 `useAppStore.ts` | frame_spec 우선. CLAUDE.md는 `feat/fe-layout-filter` PR 병합 시 단독 커밋으로 정정 |
| CLAUDE.md 컴포넌트 경로 | CLAUDE.md §3 `src/views/StreamView/StreamChart.tsx` | `frame_spec_frontend_vN §2` `src/components/charts/` | frame_spec 우선. CLAUDE.md 정정은 §9 PR 기타 항목으로 처리 |

---

## 1. 기능 개요

### 1.1 한 줄 요약

`feat/fe-layout-filter`로 확장된 useAppStore 상태를 읽어, D3.js 기반 스트림 그래프(전이율 시계열 + 이상 노드)를 `src/components/charts/StreamChart.tsx`로 구현한다.

### 1.2 데이터 흐름

```
useAppStore (selectedCommodityId, fromMonth, toMonth, activeSegments,
             selectedGrades, selectedPatterns, selectedEventKeys,
             secondaryCommodityId)
  → useStreamData(commodityId, params) [React Query]
    → GET /commodities/{id}/stream?from=&to=&segments=&grade=&patterns=
    → StreamChartResponse { series[], anomaly_nodes[] }

StreamChartResponse
  → StreamChart.tsx (D3.js)
    → 구간별 전이율 곡선 (A 청색 / B 녹색 / D′ 주황; C·D 4구간 품목 추가)
    → 곡선 아래 그라디언트 채움
    → 이상 노드 (신뢰도별 색상·크기·글로우·NEW 배지)
    → 사건 오버레이 (selectedEventKeys + events.json 기반 배경 음영)
    → 보조 품목 오버레이 (secondaryCommodityId != null 시 별도 /stream 호출, 투명도 40%)
    → 줌 (마우스 휠·더블클릭·기간 프리셋 버튼)

이상 노드 클릭
  → useAppStore.setSelectedAnomalyId(anomaly_id) [integer]
  → 분석 수치 패널 슬라이드인 트리거 (패널 내부 구현은 feat/fe-panel)

자동 진입 동작 (첫 로드 및 품목 전환)
  → anomaly_nodes[] 중 confidence_grade === 'high', 최신 period 노드 자동 선택
  → setSelectedAnomalyId 자동 호출 → 패널 자동 오픈
```

### 1.3 프레임 내 위치

> 본 표는 `frame_spec_frontend_vN.md §2` 실제 frame 구조 기준으로 작성한다.
> CLAUDE.md §3 경로(`src/views/`, 다중 스토어)는 stale 상태이므로 **frame_spec 우선**.

| 구분 | 경로 | 작업 내용 |
|------|------|-----------|
| 수정 | `src/stores/useAppStore.ts` | ViewState에 `selectedAnomalyId: number \| null`, `isPanelOpen: boolean` 추가; `setSelectedAnomalyId`, `setPanelOpen` 액션 추가. **배치 사유**: 패널 표시 여부는 현재 뷰 상태의 일부이고 본 단계는 `panelStore` 분리 도입 전이므로 ViewState 단일 슬라이스 유지. `feat/fe-panel`에서 PanelState 분리 필요 시 마이그레이션 |
| 수정 | `src/api/client.ts` | mock 인터셉터 url 분기에 `/stream` 동적 경로 추가. 정적 경로(`url === '/x'`) 매칭이 아닌 정규식 매칭 사용: `url.match(/^\/commodities\/([^/]+)\/stream$/)`. **commodity_id별 fixture 매핑**: 매칭된 commodity_id가 `wheat`이면 `stream.json`, 보조 품목용 매핑은 fixture 추가에 따라 확장 (예: `corn` → `stream_corn.json`). 미정 commodity_id는 `stream.json` 반환 (개발 단계 폴백) |
| 수정 | `src/pages/MainPage.tsx` | `activeTab === 'stream'` 조건 분기에 `<StreamChart />` 마운트. 다른 탭 전환 시 unmount되어 D3 SVG 정리 |
| 수정 | `src/types/timeseries.ts` | `StreamSeriesItem`, `StreamDataPoint`, `AnomalyNodeItem`, `StreamChartResponse`, `MinimapAnomalyDensity` 타입 추가 (api_spec_vN 응답 구조 1:1) |
| 신규 | `src/components/charts/StreamChart.tsx` | D3.js 스트림 그래프 컴포넌트 (곡선·노드·줌·이벤트 오버레이·보조 품목 오버레이·애니메이션) |
| 신규 | `src/hooks/useStreamData.ts` | `/stream` React Query 훅. `selectedCommodityId` 변경 시 자동 재조회. retry: 3. **보조 품목 호출 방식**: `useStreamData(secondaryCommodityId)` 별도 호출 (동일 훅 2회 호출, 두 번째 호출은 `enabled: secondaryCommodityId !== null` 조건부) |
| 신규 | `src/utils/colorUtils.ts` | 구간·이상 노드·보조 품목 색상 팔레트 + 노드 반지름 상수. §4 파라미터 표 기준 |
| 신규 | `src/fixtures/stream.json` | GET `/commodities/wheat/stream` mock 응답 (wheat 3구간, 36개월, 이상 노드 3등급 포함, NEW 배지 1개, warmup 12개월) |
| 신규 | `src/fixtures/stream_empty.json` | 이상 없음 케이스 fixture (`anomaly_nodes: []` + 곡선 데이터 정상). `FE-D3-001` 이상 없음 UI 검증용 |

> **`endpoints.ts` 미수정**: `frame/frontend` 단계에서 `COMMODITY_STREAM: (id: string) => '/commodities/${id}/stream'` 함수 형태로 이미 정의됨. 본 브랜치는 import만.
> **`src/hooks/`, `src/utils/` 폴더**: `feat/fe-layout-filter`에서 신규 생성됨. 선행 조건 머지 후 이미 존재.

### 1.4 구현 범위 및 비구현 범위

| 구분 | 내용 |
|------|------|
| **구현** | D3.js StreamChart 컴포넌트 — 구간별 전이율 곡선·그라디언트 채움·진입 애니메이션, 이상 노드(3등급 색상·크기·효과·NEW 배지·호버 툴팁·클릭 액션·자동 선택), 구간 on/off(activeSegments 반영), 사건 오버레이(selectedEventKeys·events.json 기반), 보조 품목 오버레이(투명도 40%), 줌(마우스 휠·더블클릭·기간 프리셋), 이상 없음 상태 UI, useStreamData 훅, stream.json·stream_empty.json fixture, useAppStore `selectedAnomalyId`·`isPanelOpen` 확장 |
| **비구현** | `/stream/minimap` API 호출 및 StreamMinimap 컴포넌트 → `feat/fe-minimap`, 패널 슬라이드인 내부 콘텐츠 → `feat/fe-panel` (이 브랜치는 `selectedAnomalyId` 저장 + `isPanelOpen: true` 설정까지만), 미니맵 뷰포트 드래그 → `feat/fe-minimap` |
| **선행 조건** | `frame/frontend` → `develop` PR 머지 완료, `feat/fe-layout-filter` → `develop` PR 머지 완료 (useAppStore FilterState·ViewState 확장 및 `src/hooks/`·`src/utils/` 폴더 존재) |

> **구현 범위 출처**: `feature_dev_list_vN §feat/fe-stream-chart` 9개 핵심 항목 + `web_plan_vN §4.1` 기반 보강 6개 항목 (자동 진입 동작·진입 애니메이션·이상 없음 상태 UI·NEW 배지·보조 품목 오버레이·더블클릭 줌). web_plan은 UX 상세 명세이므로 누락 시 사용자 경험 결손 발생 — feature_dev_list 요약 표를 web_plan으로 보강함.

---

## 2. 입력 데이터

> 필드명·타입은 `api_spec_vN.md §/commodities/{id}/stream` 기준으로 정확히 명시한다.

### 2.1 API 응답 — `/stream`

| 출처 | 필드 | 타입 | 비고 |
|------|------|------|------|
| `GET /commodities/{id}/stream` | `commodity_id` | `string` | 요청 품목 ID 반환 |
| | `requested_from` / `requested_to` | `string` | YYYY-MM, 요청 범위 |
| | `actual_from` / `actual_to` | `string` | YYYY-MM, 실제 반환 범위 |
| | `granularity` | `'monthly' \| 'quarterly' \| 'yearly'` | 집계 단위 (기본 `monthly`) |
| | `total_points` | `number` | 전체 데이터 포인트 수 |
| | `series[].segment_id` | `SegmentId` | `'A' \| 'B' \| 'C' \| 'D' \| 'D_prime'` |
| | `series[].data[].period` | `string` | YYYY-MM |
| | `series[].data[].transmission_rate` | `number \| null` | Y축 직접값. `in_warmup_period: true`인 구간은 `null` 가능 |
| | `series[].data[].upstream_pct` | `number` | 상류 가격 변화율 (%) — 툴팁용 |
| | `series[].data[].downstream_pct` | `number` | 하류 가격 변화율 (%) — 툴팁용 |
| | `series[].data[].in_warmup_period` | `boolean` | `true` 구간은 곡선 점선 처리 또는 제외 |
| | `series[].data[].has_anomaly` | `boolean` | 해당 포인트에 이상 포함 여부 |
| | `series[].data[].anomaly_ids` | `number[]` | integer[], 포함된 이상 ID 목록 |
| | `anomaly_nodes[].anomaly_id` | `number` | **integer**. 패널 진입 키 — `/anomalies/{id}/detail` 호출용 |
| | `anomaly_nodes[].segment_id` | `SegmentId` | 이상 발생 구간 |
| | `anomaly_nodes[].period` | `string` | YYYY-MM. `granularity` 무관, 항상 원본 월 단위 |
| | `anomaly_nodes[].primary_pattern` | `PrimaryPattern` | `'pattern1' \| 'pattern2' \| 'pattern3'` |
| | `anomaly_nodes[].pattern_types` | `PrimaryPattern[]` | 복수 패턴 목록 |
| | `anomaly_nodes[].confidence_grade` | `ConfidenceGrade` | `'high' \| 'medium' \| 'reference'` |
| | `anomaly_nodes[].transmission_rate` | `number` | 툴팁·노드 크기 표시용 |
| | `anomaly_nodes[].is_new` | `boolean` | `true` 시 "NEW" 배지 표시 |

> **타입 주의**: `anomaly_id`는 `number` (integer). CLAUDE.md §6 `AnomalyNode.anomaly_id: string`은 오류. `api_spec_vN.md §/stream` 응답 예시 `"anomaly_id": 142` 기준.

### 2.2 useAppStore 읽기 상태

| 슬라이스 | 필드 | 용도 |
|---------|------|------|
| CommodityState | `selectedCommodityId: string` | /stream 요청 `{id}` 경로 변수 |
| CommodityState | `secondaryCommodityId: string \| null` | 보조 품목 오버레이 — null이 아닌 경우 /stream 2회 호출 |
| FilterState | `fromMonth: string \| null` | 쿼리 파라미터 `from`. `null` 전달 시 백엔드가 품목별 `analysis_start` 사용 (api_spec_vN 시계열 공통 envelope 기본값) |
| FilterState | `toMonth: string \| null` | 쿼리 파라미터 `to`. `null` 전달 시 백엔드가 최신 데이터 기준 월 사용 |
| FilterState | `activeSegments: SegmentId[]` | 쿼리 파라미터 `segments` (콤마 결합) + 곡선 on/off |
| FilterState | `selectedGrades: ConfidenceGrade[]` | 쿼리 파라미터 `grade` (콤마 결합) |
| FilterState | `selectedPatterns: PrimaryPattern[]` | 쿼리 파라미터 `patterns` (콤마 결합) |
| FilterState | `selectedEventKeys: string[]` | 사건 오버레이 배경 음영 필터 |

### 2.3 이벤트 오버레이 데이터

| 출처 | 필드 | 타입 | 비고 |
|------|------|------|------|
| `src/fixtures/events.json` (frame 단계 생성) | `event_key` | `string` | 5종 고정: `financial_crisis_2008`, `covid19_2020`, `brazil_frost_2021`, `ukraine_2022`, `indonesia_palmoil_2022` |
| | `start_date` / `end_date` | `string` | YYYY-MM-DD |
| | `shade_color` | `string` | HEX 색상코드 |

> 이벤트 데이터는 `/events` API 응답이 아닌 `events.json` fixture에서 읽는다. 시계열 API 응답에서 이벤트 정보 파싱 금지 (CLAUDE.md §15-5, frame_spec_frontend_vN §8.10).

### 2.4 타입 변환 규칙

| 변환 위치 | AS-IS | TO-BE | 규칙 |
|-----------|-------|-------|------|
| API `period` 파싱 (D3 x축) | `"2026-03"` (string) | `Date` 객체 | `parse(s, 'yyyy-MM', new Date())` via `date-fns`. 파싱 실패 → `PARSE-DATE-002` |
| `transmission_rate: null` + `in_warmup_period: true` | `null` (정상값) | 해당 포인트 skip | 정상 케이스. 곡선 끊어서 처리 (`d3.line().defined()` 활용). `PARSE-NUM-002` 미적용 |
| `transmission_rate: null` + `in_warmup_period: false` | `null` (비정상) | NaN 필터링 + 콘솔 경고 | `PARSE-NUM-002` 적용. 파이프라인 계산 오류로 간주, 해당 포인트 skip |
| `transmission_rate: "NaN"` 문자열 | `"NaN"` string | `NaN` 필터링 | `PARSE-NUM-002` 적용. NaN 포인트 skip 후 남은 데이터로 재렌더링 |
| `anomaly_ids[]` 필드 누락 | 배열 요소에 `anomaly_ids` 키 없음 | 배열 전체 빈 처리 | `PARSE-ARR-002`. 콘솔 경고 |

---

## 3. 출력 데이터

### 3.1 렌더링 출력

| 출력 | 내용 |
|------|------|
| `StreamChart.tsx` SVG | 품목별 구간 전이율 연속 곡선 + 그라디언트 채움 + 이상 노드 + 사건 오버레이 + 줌 |
| 이상 없음 UI | `anomaly_nodes[]` 빈 배열 시: "이 품목·기간에는 탐지된 이상이 없습니다" + 이상 있는 품목 추천 버튼 |

### 3.2 useAppStore 쓰기

| 필드 | 트리거 | 값 |
|------|--------|-----|
| `selectedAnomalyId: number \| null` | 이상 노드 클릭 / 자동 선택 진입 | 클릭된 `anomaly_id` (integer) |
| `isPanelOpen: boolean` | 이상 노드 클릭 / 자동 선택 진입 | `true` |

> `selectedAnomalyId` 저장 → `isPanelOpen: true` 설정만 수행. 패널 슬라이드인 애니메이션 및 내부 콘텐츠 렌더링은 `feat/fe-panel` 담당.

### 3.3 시각화 규격 (web_plan_vN §4.1 기준)

#### 곡선

| 구간 | 주 품목 색상 | 보조 품목 색상 |
|------|------------|----------------|
| A | 청색 (`#3b82f6`) | 청록 (`#06b6d4`) |
| B | 녹색 (`#22c55e`) | 보라 (`#a855f7`) |
| D′ | 주황 (`#f97316`) | 분홍 (`#ec4899`) |
| C (4구간) | 별도 확정 | 동일 팔레트 |
| D (4구간) | 별도 확정 | 동일 팔레트 |

- 보조 품목 곡선은 `opacity: 0.4` 적용
- `in_warmup_period: true` 구간은 점선(dashed) 처리
- 곡선 아래 그라디언트 채움 (`d3.area()`, y0=0 기준선)

#### 이상 노드

| 신뢰도 | 색상 | 반지름 | 효과 |
|--------|------|--------|------|
| `high` | `#e24b4a` | 7px | CSS 글로우 + 펄스 애니메이션 |
| `medium` | `#ef9f27` | 5.5px | CSS 글로우 |
| `reference` | `#c8d850` (연두) | 4px | 없음 |

> ⚠️ **Action Item**: `feature_dev_list_vN`은 참고 등급을 "회색"으로 기술. `web_plan_vN §4.1`은 `#c8d850`(연두). PM 확정 전까지 web_plan_vN 기준(`#c8d850`)으로 구현.

- `is_new: true` → "NEW" 텍스트 배지 (노드 상단)
- 보조 품목 이상 노드: 동일 색상 + `opacity: 0.4`, 마우스 클릭 가능

#### 호버 툴팁

`anomaly_nodes[]` 기준. 표시 필드:

| 필드 | 표시 형식 |
|------|-----------|
| `period` | `YYYY년 M월` (예: "2026년 3월") |
| `transmission_rate` | 소수점 2자리 (예: "1.43") |
| `confidence_grade` | "고신뢰" / "중신뢰" / "참고" |
| `is_new` | `true`이면 "NEW" 텍스트 추가 표시 |

#### 자동 진입 동작

1. `useStreamData` 첫 로드 성공 시 실행
2. `anomaly_nodes` 중 `confidence_grade === 'high'` AND `segment_id ∈ activeSegments`인 노드 필터
3. `period` 기준 내림차순 정렬 → 첫 번째 노드 선택
4. `setSelectedAnomalyId(node.anomaly_id)` + `setPanelOpen(true)` 호출
5. 필터 결과가 빈 배열이면 자동 선택 없음 (`selectedAnomalyId: null`, `isPanelOpen: false` 유지)

> 품목 전환(`selectedCommodityId` 변경) 시 동일 로직 재실행. `activeSegments` 변경 시는 재실행하지 않음 (사용자 의도적 토글이므로 패널 자동 오픈 부적절).

#### 줌

| 방법 | 동작 |
|------|------|
| 마우스 휠 스크롤 | 포인터 X 위치를 기준으로 X축 좌우 대칭 확대/축소. 최소 3개월, 최대 전체 기간. Y축은 확대/축소 대상 아님 |
| 더블클릭 | 클릭 위치 중심 X축 2배 확대 (마우스 휠 줌과 일관). Y축은 항상 자동 스케일 |
| 기간 프리셋 버튼 | `'3mo' \| '6mo' \| '1yr' \| '3yr' \| '5yr' \| 'all'` 즉시 전환 (기본: `'3yr'`) |

#### 진입 애니메이션

- 품목 최초 로드 및 `selectedCommodityId` 변경 시: 곡선이 왼쪽에서 오른쪽으로 흘러 들어오는 애니메이션 (`d3.transition` + stroke-dasharray 기법)

#### 사건 오버레이

- `selectedEventKeys[]`가 비어 있으면 배경 음영 없음
- 선택된 event_key의 `start_date`~`end_date` 범위 배경 반투명 rect 렌더링 (`events.json` 데이터 사용)
- 복수 선택 시 음영 누적 표시

---

## 4. 파라미터 제약 조건

> 이 기능의 시각화 상수는 코드에 직접 기재하지 않고 `src/utils/colorUtils.ts` (색상) 또는 컴포넌트 상수 파일로 분리한다.

| 파라미터 | 관리 위치 | 기본값 | 하드코딩 금지 이유 |
|----------|-----------|--------|-------------------|
| 구간 곡선 색상 팔레트 (주 품목) | `src/utils/colorUtils.ts` | A:`#3b82f6`, B:`#22c55e`, D′:`#f97316` | 디자인 변경 단일 관리 |
| 보조 품목 색상 팔레트 | `src/utils/colorUtils.ts` | 청록·보라·분홍 | 동일 |
| 이상 노드 색상 | `src/utils/colorUtils.ts` | high:`#e24b4a`, medium:`#ef9f27`, reference:`#c8d850` | 동일 |
| 이상 노드 반지름 | `src/utils/colorUtils.ts` 또는 상수 파일 | high:7, medium:5.5, reference:4 (px) | 동일 |
| 초기 줌 범위 | `useAppStore` `periodPreset` 초기값 (`'3yr'`) | 36개월 | `feat/fe-layout-filter`에서 이미 설정 |
| 최소 줌 범위 | 상수 파일 | 3개월 | 디자인 변경 대비 |
| VITE_USE_MOCK 분기 조건 | `src/api/client.ts` 인터셉터 | `import.meta.env.VITE_USE_MOCK !== 'false'` | 환경 변수 단일 제어 |

---

## 5. 예외처리

> - **`exception_spec_vN.md`**: 에러 코드 인덱스 및 처리 방침 확인 (반복 조회용)
> - **`exception_design_vN.md`**: 에러 체이닝 구현 패턴 (코드 구현용). 프론트엔드는 해당 없음 — FE 에러는 React Query onError + Toast/Fallback UI로 처리

### 5.1 적용 예외 코드

| 예외 코드 | 발생 조건 | 처리 방침 |
|-----------|-----------|-----------|
| `FE-API-001` | `/stream` 요청 중 네트워크 실패 (fetch error, CORS) | FE_TOAST ("데이터를 불러오지 못했습니다.") + 재시도 버튼. React Query `retry: 3` |
| `FE-API-002` | `/stream` 400 응답 (`INVALID_SEGMENT`, `INVALID_DATE_RANGE`, `INVALID_GRANULARITY` 등) | FE_TOAST (api_error_code에 따른 사용자 친화 메시지) |
| `FE-API-003` | `/stream` 404 응답 (`COMMODITY_NOT_FOUND`) | FE_FALLBACK — 빈 상태 UI ("데이터가 없습니다.") |
| `FE-API-004` | `/stream` 500 응답 (`PIPELINE_DATA_MISSING`, `INTERNAL_ERROR` 등) | FE_BLOCK — StreamChart 에러 UI 표시. ErrorBoundary로 전파 방지 |
| `FE-D3-001` | `series[]` 빈 배열 또는 `anomaly_nodes[]` 빈 배열 (데이터 없음 상태) | FE_FALLBACK — 이상 없음 상태 UI: "이 품목·기간에는 탐지된 이상이 없습니다" + 추천 버튼. **참고: 본 코드 정의(exception_spec_vN §2.4)는 모든 차트의 데이터 빈 배열 케이스를 포괄. 본 명세에서는 `series[]` 또는 `anomaly_nodes[]` 빈 배열로 해석. `anomaly_nodes[]`만 비어 있고 `series[]`는 정상이면 이상 없음 UI를 곡선 위에 오버레이로 표시** |
| `FE-D3-002` | `transmission_rate`에 NaN 포함 데이터로 D3 스케일 계산 실패 | FE_FALLBACK — NaN 포인트 필터링 후 재렌더링. 필터링 후에도 실패하면 빈 차트 |
| `FE-D3-003` | SVG 컨테이너 `getBoundingClientRect()` width 또는 height가 0 | FE_FALLBACK — `ResizeObserver`로 컨테이너 크기 복구 후 재렌더링 |
| `PARSE-DATE-002` | `series[].data[].period` 또는 `anomaly_nodes[].period`가 `YYYY-MM` 형식 아님 | FE_FALLBACK — 해당 포인트 skip, 콘솔 경고 |
| `PARSE-NUM-002` | `transmission_rate`가 `null` (단, `in_warmup_period: false` 케이스에 한함) 또는 `"NaN"` 문자열 | FE_FALLBACK — 해당 포인트 skip (차트에서 해당 월 제외). 필드값 `—` 표시. **`in_warmup_period: true` + `transmission_rate: null`은 정상 워밍업 케이스이므로 본 코드 미적용** (§2.4 변환 규칙 참조) |
| `PARSE-ARR-002` | `series[]` 또는 `anomaly_nodes[]` 배열 요소에서 필수 필드 누락 | FE_FALLBACK — 해당 배열 전체 빈 상태 처리, 콘솔 경고 |
| `FE-MOCK-001` | `VITE_USE_MOCK !== 'false'` 상태에서 `src/fixtures/stream.json` 없음 | FE_BLOCK (개발환경 전용) |

### 5.2 신규 예외 코드 제안

해당 없음.

---

## 6. 목업 및 실제 데이터 전환 조건

| 항목 | 내용 |
|------|------|
| 테스트 품목 | `wheat` (3구간: A, B, D_prime) |
| 테스트 기간 | `2023-04` ~ `2026-03` (36개월, 3yr 기본 프리셋) |
| 특수 케이스 1 | `in_warmup_period: true` 포인트: 처음 12개월(2023-04~2024-03) `transmission_rate: null` — 점선 처리 검증용 |
| 특수 케이스 2 | `anomaly_nodes[]` 빈 배열 fixture 별도 케이스 — `FE-D3-001` 이상 없음 UI 검증용 |
| 특수 케이스 3 | `in_warmup_period: false` + `transmission_rate: null` 포인트 1개 포함 — `PARSE-NUM-002` 비정상 null 처리 검증용 (워밍업 정상 null과 구분) |
| 특수 케이스 4 | `is_new: true` 노드 1개 포함 — NEW 배지 검증용 |
| 특수 케이스 5 | `confidence_grade: 'reference'` 노드 1개 포함 — 참고 등급 렌더링 검증용 |
| Fixture 경로 | `src/fixtures/stream.json` (주 케이스), `src/fixtures/stream_empty.json` (이상 없음 케이스) |
| MOCK 분기 조건 | `import.meta.env.VITE_USE_MOCK !== 'false'` (환경 변수 미설정 시 자동 활성) |
| 더미 → 실제 전환 트리거 | `VITE_USE_MOCK=false` 설정 + `feat/be-api-timeseries` dev 머지 완료 후 |

### 6.1 stream.json fixture 최소 구조

```json
{
  "commodity_id": "wheat",
  "requested_from": "2023-04",
  "requested_to": "2026-03",
  "actual_from": "2023-04",
  "actual_to": "2026-03",
  "granularity": "monthly",
  "total_points": 36,
  "series": [
    {
      "segment_id": "A",
      "data": [
        { "period": "2023-04", "transmission_rate": null, "upstream_pct": 0, "downstream_pct": 0, "in_warmup_period": true, "has_anomaly": false, "anomaly_ids": [] },
        { "period": "2026-03", "transmission_rate": 1.43, "upstream_pct": 18.2, "downstream_pct": 26.1, "in_warmup_period": false, "has_anomaly": true, "anomaly_ids": [142] }
      ]
    }
  ],
  "anomaly_nodes": [
    {
      "anomaly_id": 142,
      "segment_id": "A",
      "period": "2026-03",
      "primary_pattern": "pattern2",
      "pattern_types": ["pattern2"],
      "confidence_grade": "high",
      "transmission_rate": 1.43,
      "is_new": true
    }
  ]
}
```

> `anomaly_id`는 **정수**. `142`와 같이 숫자 리터럴로 기재. 문자열 `"142"` 금지.

> **주의**: 위 JSON은 **최소 구조** 예시 (data 포인트 2개, 노드 1개). 실제 `stream.json`은 §6 특수 케이스 5종 검증을 위해 36개월 풀 데이터 + reference·medium·high 등급 노드 각 1개 이상 + warmup 12개월(2023-04~2024-03) `transmission_rate: null` 포함 + NEW 배지 노드 1개 포함하여 작성.

### 6.2 stream_empty.json fixture 최소 구조

`anomaly_nodes[]`가 비어 있고 곡선 데이터는 정상인 케이스. `FE-D3-001` 이상 없음 UI 검증용.

```json
{
  "commodity_id": "wheat",
  "requested_from": "2023-04",
  "requested_to": "2026-03",
  "actual_from": "2023-04",
  "actual_to": "2026-03",
  "granularity": "monthly",
  "total_points": 36,
  "series": [
    {
      "segment_id": "A",
      "data": [
        { "period": "2023-04", "transmission_rate": 0.92, "upstream_pct": 5.1, "downstream_pct": 4.7, "in_warmup_period": false, "has_anomaly": false, "anomaly_ids": [] }
      ]
    }
  ],
  "anomaly_nodes": []
}
```

---

## 7. 완료 기준

> `feature_dev_list_vN §feat/fe-stream-chart` 완료 기준 기반. 주관적 판단 없이 수치·상태로 기술.

| 항목 | 기준 |
|------|------|
| 3구간 곡선 렌더링 | `wheat` 더미 데이터 기준 A·B·D′ 곡선 3개 SVG 렌더링 확인 (브라우저 시각 검증) |
| 이상 노드 3색 표시 | high(빨강)/medium(주황)/reference(연두 또는 확정 색상) 노드 각 1개 이상 렌더링 확인 |
| NEW 배지 | `is_new: true` 노드에 "NEW" 텍스트 표시 확인 |
| 노드 클릭 → 스토어 반영 | 이상 노드 클릭 시 `useAppStore.selectedAnomalyId`가 해당 `anomaly_id` (integer) 값으로 갱신 확인 |
| isPanelOpen 갱신 | 노드 클릭 시 `useAppStore.isPanelOpen: true` 확인 |
| 자동 진입 동작 (high 있음) | 첫 로드 시 `activeSegments` 내 가장 최근 high 노드 자동 선택 + `isPanelOpen: true` 확인 |
| 자동 진입 동작 (high 없음) | high 노드 부재 fixture에서 `selectedAnomalyId: null`, `isPanelOpen: false` 유지 확인 |
| 호버 툴팁 | 노드 hover 시 period·transmission_rate·confidence_grade 툴팁 표시 확인 |
| 구간 on/off | `activeSegments`에서 특정 구간 제거 시 해당 곡선 즉시 숨김 확인 |
| warmup 구간 처리 | `in_warmup_period: true` 포인트는 점선 또는 곡선 끊김으로 표시 확인 (실선 영역과 시각적 구분) |
| 진입 애니메이션 | 품목 전환 시 곡선 left→right 애니메이션 동작 확인 |
| 마우스 휠 줌 | 휠 스크롤로 X축 범위 확대/축소. 최소 3개월 이하 불가, 최대 전체 기간 초과 불가 확인 |
| 이상 없음 상태 | `stream_empty.json` 사용 시 "이 품목·기간에는 탐지된 이상이 없습니다" UI 표시 확인 |
| 사건 오버레이 | `selectedEventKeys`에 `ukraine_2022` 추가 시 해당 기간 배경 음영 렌더링 확인 |
| activeTab 마운트 분기 | `activeTab === 'stream'`일 때만 `StreamChart` 마운트, 다른 탭(`scatter`, `raw-prices`) 전환 시 unmount 확인 |
| MOCK 분기 | `VITE_USE_MOCK !== 'false'` 시 실제 HTTP 요청 없이 fixture 데이터 반환 확인 |
| 타입 일치 | `anomaly_id` 필드가 `number` 타입으로 처리됨 (`string` 캐스팅 없음) 확인 |
| 후속 선행 조건 | `feat/fe-minimap` 착수 가능 상태 (StreamChart가 렌더링되는 SVG 컨테이너 존재) |

---

## 8. 금지 사항

> `frame_spec_frontend_vN.md §8.10` 절대 금지 사항 + FE-STREAM 특화 추가

| 금지 사항 | 이유 |
|-----------|------|
| `localStorage`, `sessionStorage` 사용 | 세션 상태는 Zustand 메모리 기반 단일 관리 원칙 (frame_spec_frontend_vN §8.10) |
| API 응답 `snake_case` 필드명을 `camelCase`로 변환하는 인터셉터·유틸 작성 | §6.1 정책 위반, 3방향 필드명 일치 파괴 |
| D3.js 외 시각화 라이브러리 추가 (`Chart.js`, `Recharts`, `Nivo` 등) | D3.js v7 단일 사용 원칙 (CLAUDE.md §15-1) |
| `transmission_rate` 값 가공·재계산 후 Y축 표시 | 백엔드 API 응답값 직접 사용 원칙. 자체 연산 금지 (CLAUDE.md §15-2) |
| 이벤트 오버레이 데이터를 시계열 응답에서 파싱 | `/events` 별도 호출 원칙 (CLAUDE.md §15-5) |
| `has_wholesale: false` 품목(주 품목·보조 품목 무관)에 구간 C·D 곡선 표시 | 3구간 품목 도매가 UI 노출 금지 (CLAUDE.md §15-6). **혼합 케이스 정책**: 주 품목이 3구간이고 보조 품목이 4구간이면 보조 품목 곡선도 A·B·D′ 만 표시(C·D 곡선 생략). 역의 경우(주 4구간·보조 3구간)는 주 품목 C·D는 표시하되 보조 품목 C·D 곡선은 생략 — 보조 품목 자체의 `has_wholesale` 기준 |
| SVG 너비·높이 하드코딩 | `ResizeObserver` 기반 반응형 필수. FE-D3-003 방지 |
| `src/services/`에 StreamChart 비즈니스 로직 작성 | frame_spec_frontend_vN §8.7 Frame 단계 서비스 로직 금지 |
| `VITE_USE_MOCK` 관련 코드 하드코딩 | 환경 변수 단일 제어 원칙 (CLAUDE.md §15-7) |
| `anomaly_id`를 `string`으로 캐스팅·저장 | `number` (integer) 타입 필수. CLAUDE.md §6 오류 항목 (§0 Action Items 참조) |

---

## 9. Pull Request 템플릿

> `feat/fe-stream-chart` → `dev` PR 작성 시 아래 본문을 복사하여 채운다.

```markdown
## 개요
- **브랜치**: feat/fe-stream-chart
- **기능 번호**: FE-STREAM
- **Feature 명세**: `docs/feature_spec_FE-STREAM_vN.md`
- **담당자**: 하대수

## 구현 완료 항목
Feature 명세 §7 완료 기준 기준으로 체크한다.
- [ ] 3구간 곡선 렌더링 (wheat: A·B·D′ 3개 SVG 곡선)
- [ ] 이상 노드 3색·크기·효과 표시 (high/medium/reference)
- [ ] NEW 배지 (is_new: true 노드)
- [ ] 노드 클릭 → useAppStore.selectedAnomalyId 갱신 (integer)
- [ ] isPanelOpen: true 갱신
- [ ] 자동 진입 동작 (high 있음): activeSegments 내 최근 high 노드 자동 선택
- [ ] 자동 진입 동작 (high 없음): selectedAnomalyId null, isPanelOpen false 유지
- [ ] 호버 툴팁 (period·transmission_rate·confidence_grade)
- [ ] 구간 on/off (activeSegments 반영)
- [ ] warmup 구간 점선/곡선 끊김 처리
- [ ] 진입 애니메이션 (left→right)
- [ ] 마우스 휠 줌 + 더블클릭 X축 2배 줌 (최소 3mo, 최대 전체)
- [ ] 이상 없음 상태 UI (stream_empty.json)
- [ ] 사건 오버레이 (selectedEventKeys 반영)
- [ ] activeTab 마운트 분기 (`stream`만 마운트, 다른 탭 unmount)
- [ ] MOCK 분기 확인 (VITE_USE_MOCK !== 'false' 시 fixture 사용)
- [ ] 타입 일치: `anomaly_id` number (integer) 처리 — string 캐스팅 없음
- [ ] 후속 선행 조건: `feat/fe-minimap` 착수 가능 (StreamChart SVG 컨테이너 존재)

## 필드명 3방향 일치 확인
- [ ] `api_spec_vN.md §/stream` ↔ `src/types/timeseries.ts` 필드명 일치
- [ ] `anomaly_id` 타입 `number` (integer) 확인 — string 캐스팅 없음
- 불일치 항목: {없음 / 목록}

## 예외처리 범위
- 구현한 예외 코드: `FE-API-001~004`, `FE-D3-001~003`, `PARSE-DATE-002`, `PARSE-NUM-002`, `PARSE-ARR-002`, `FE-MOCK-001`
- 신규 제안 코드: 없음

## Action Items 처리 결과
- [ ] 참고 등급 노드 색상 PM 확정 반영 (§0 Action Items — `#c8d850` vs 회색)
- [ ] 4구간 품목 C·D 곡선 색상 PM·디자인팀 확정 반영 (§0 Action Items)
- [ ] 선행 조건 차이 PM 확정 — `feature_dev_list_vN` 갱신 또는 본 명세 우선 확인 (§0 Action Items)
- [ ] CLAUDE.md §3 컴포넌트 경로 정정 단독 커밋 포함 (`[CLAUDE.md] Fix StreamChart path and store structure`)

## 로컬 실행 증빙
{브라우저 스크린샷 또는 콘솔 출력 붙여넣기}

## 리뷰어 확인 요청 사항
- D3.js `d3.line().defined()` null 포인트 처리 방식 검토 요청 (warmup 구간 곡선 끊김)
- ResizeObserver 기반 SVG 크기 반응성 확인
- 보조 품목 오버레이 동시 호출 동작 확인 (`useStreamData` 2회 호출, `enabled: secondaryCommodityId !== null`)
- 자동 진입 동작 high 노드 부재 케이스 검증
- mock 인터셉터 동적 경로 정규식 매칭 안정성 검토

## 기타
- `feat/fe-minimap` 착수 가능 상태 (StreamChart SVG 컨테이너 존재)
- `feat/fe-panel` selectedAnomalyId 전달 연결 확인 필요
- ViewState에 `selectedAnomalyId`·`isPanelOpen` 배치 결정 — `feat/fe-panel`에서 PanelState 분리 시 마이그레이션 검토
```
