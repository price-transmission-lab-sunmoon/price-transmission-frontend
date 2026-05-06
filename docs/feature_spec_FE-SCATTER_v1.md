# Feature 명세서 — 전달 구조 연결 산점도

**문서 유형**: Feature 명세서  
**기능 번호**: `FE-SCATTER`  
**브랜치명**: `feat/fe-scatter-chart`  
**담당자**: 하대수  
**작성일**: 2026-05-06  
**상태**: 초안  

**변경 이력**
- v1 (2026-05-06): 최초 작성

---

## ⚠️ 구현 시작 전 필수 확인

> AI 및 구현 담당자는 아래 문서가 **모두 첨부 또는 열람 가능한 상태**인지 확인한 후 구현을 시작한다.
> 하나라도 누락된 경우 구현을 시작하지 않고 PM에게 문서 제공을 요청한다.

| 문서 | 버전 | 참조 목적 | 확인 |
|------|------|-----------|------|
| `api_spec_vN.md §/commodities/{id}/scatter` | 최신(`docs_manifest.md` 조회) | 엔드포인트·query params·response 필드명·타입 | ☐ |
| `exception_spec_vN.md §2.4 FE-*, §2.3 PARSE-*, §8 브랜치 매핑` | 최신(`docs_manifest.md` 조회) | 이 기능에 해당하는 에러 코드·처리 방침 | ☐ |
| `frame_spec_frontend_vN.md §2, §6, §8` | 최신(`docs_manifest.md` 조회) | 디렉토리 구조·snake_case 정책·절대 금지 사항 | ☐ |
| `web_plan_vN.md §4.2` | 최신(`docs_manifest.md` 조회) | 전달 구조 뷰 UX 상세 명세 (산점도·구역 레이블·슬라이더·접이식 패널) | ☐ |
| `feature_dev_list_vN.md §feat/fe-scatter-chart` | 최신(`docs_manifest.md` 조회) | 구현 범위·완료 기준 | ☐ |

> **버전 해석**: 문서명의 `vN`은 `docs/docs_manifest.md` SoT에서 해당 문서의 현재 최신 버전 번호를 조회한다. 파일명을 하드코딩하지 않는다.

---

## ⚠️ Action Items — 미결 불일치 항목

> 본 명세서 작성 기준일(2026-05-06) 확인된 문서 간 정합성 문제.

| 항목 | 현황 | 정답 | 근거 |
|------|------|------|------|
| 기준선 기울기 | `web_plan_vN §4.2`: "전이율 = 1.0인 정상 전달 기준선 (파란 점선)" → y = x (slope 1) | `api_spec_vN §/scatter` 응답: `baseline.transmission_elasticity: 0.72` — 실측 탄성치 필드가 존재하나 차트 기준선 용도 불명확 | `web_plan_vN`은 y=x 고정선을 명시. `baseline.transmission_elasticity`의 차트 표현 방식(회귀선 별도 추가 여부)은 PM 확정 필요. 본 명세는 web_plan 기준 y=x 기준선만 구현하며, 탄성치 기반 회귀선은 비구현으로 처리 |
| `baseline.normal_transmission_lag` 표현 방식 | `api_spec_vN §/scatter` 응답에 `baseline.normal_transmission_lag: 2` 필드 존재 | `web_plan_vN §4.2`에 시차 시각화 명세 없음 | 구간 정상 전달 시차(2개월)를 산점도 UI에서 표현하는 방법 미정. 툴팁에 "정상 전달 시차: 2개월" 텍스트 표시 방안을 제안하나 PM 확정 필요. 본 명세는 비구현 처리 |
| 슬라이더 `until` 파라미터 처리 방식 | `api_spec_vN §/scatter` 파라미터: `until: YYYY-MM — 슬라이더 재생 시 궤적 표시 상한` | `web_plan_vN §4.2` 슬라이더: 이전 시점까지 관측치를 선으로 연결 | API `until` 파라미터로 서버 재조회 vs. 최초 전체 데이터 로드 후 클라이언트 필터링 2가지 구현 방안이 모두 가능. 본 명세는 **클라이언트 필터링 방식**으로 명세 (슬라이더 이동마다 HTTP 요청 없음, 초기 전체 데이터 로드 후 `points[].period ≤ sliderPosition` 필터). `until` API 파라미터는 초기 진입 시 슬라이더 초기값 동기화 용도로만 사용. PM 확정 전까지 이 방식으로 구현 |
| `scatterSegment` 스토어 배치 | `feature_spec_FE-LAY_vN`이 정의한 `activeSegments: SegmentId[]`는 스트림 차트 구간 on/off 용도 (다중 선택) | 산점도 단일 구간 탭 선택(`scatterSegment: SegmentId`)은 별도 ViewState 필드가 필요 | 본 명세는 `useAppStore.ts ViewState`에 `scatterSegment` 추가. `feat/fe-layout-filter` 이후 브랜치이므로 FE-LAY 선행 조건 완료 후 적용 |

---

## 1. 기능 개요

### 1.1 한 줄 요약

`feat/fe-layout-filter` · `feat/fe-stream-chart`로 확장된 useAppStore 상태를 읽어, D3.js 기반 전달 구조 연결 산점도(구간 선택 탭 + 접이식 설명 패널 + 시점 슬라이더)를 `src/components/charts/ScatterChart.tsx`로 구현한다.

### 1.2 데이터 흐름

```
useAppStore (primaryCommodityId, filterFrom, filterTo,
             confidenceFilter, scatterSegment)
  → useScatterData(commodityId, { segment, from, to, grade }) [React Query]
    → GET /commodities/{id}/scatter?segment=&from=&to=&grade=
    → ScatterResponse { baseline, points[] }

ScatterResponse
  → ScatterChart.tsx (D3.js)
    → 산점도 캔버스 (X축: upstream_pct, Y축: downstream_pct)
    → 대각선 기준선 (y=x, 전이율=1.0, 파란 점선) + 진입 시 말풍선 2초
    → 4개 구역 레이블 (우상단·좌하단·우하단·좌상단 + 1줄 설명)
    → 일반 관측치 (연회색 원) + 이상 관측치 (신뢰도별 색상·호버·클릭)
    → 시점 슬라이더 (슬라이더 위치 이하 period만 렌더링 + 궤적선 연결)
    → 구간 전환 탭 (A / B / D' / [4구간 품목: + C / D])
    → 접이식 설명 패널 (기본 펼침 상태)

이상 관측치 클릭
  → useAppStore.setSelectedAnomalyId(anomaly_id) [integer]
  → useAppStore.setPanelOpen(true)
  → 분석 수치 패널 슬라이드인 트리거 (패널 내부 구현은 feat/fe-panel)

구간 탭 전환
  → useAppStore.setScatterSegment(segmentId)
  → useScatterData 재조회 (queryKey 변경)
```

### 1.3 프레임 내 위치

> 본 표는 `frame_spec_frontend_vN.md §2` 실제 frame 구조 기준으로 작성한다.

| 구분 | 경로 | 작업 내용 |
|------|------|-----------|
| 수정 | `src/stores/useAppStore.ts` | ViewState에 `scatterSegment: SegmentId` 추가; `setScatterSegment(segment: SegmentId)` 액션 추가. 초기값: `'A'`. **배치 사유**: 구간 탭 선택은 전달 구조 뷰 전용 상태이며, 품목 전환 후에도 직전 구간 선택값을 유지하기 위해 ViewState에 배치 |
| 수정 | `src/api/client.ts` | mock 인터셉터 `MOCK_ROUTES` 배열에 scatter 동적 경로 추가: `{ test: (u) => /^\/commodities\/[^/]+\/scatter$/.test(u.split('?')[0]), data: scatterFixture }` |
| 수정 | `src/pages/MainPage.tsx` | `activeTab === 'scatter'` 조건 분기에 `<ScatterChart />` 마운트. 다른 탭 전환 시 unmount되어 D3 SVG 정리 |
| 신규 | `src/components/charts/ScatterChart.tsx` | D3.js 산점도 컴포넌트. 구간 탭·접이식 설명 패널·시점 슬라이더·기준선·구역 레이블·이상 노드·클릭·호버 포함 |
| 신규 | `src/hooks/useScatterData.ts` | `/scatter` React Query 훅. `scatterSegment` 또는 `primaryCommodityId` 변경 시 자동 재조회. retry: 3 |
| 신규 | `src/fixtures/scatter.json` | GET `/commodities/wheat/scatter?segment=A` mock 응답 (wheat 3구간 segment A, 36개월, 이상 관측치 3등급 포함) |
| 신규 | `src/fixtures/scatter_empty.json` | 이상 없음 케이스 fixture (`points` 전체 `is_anomaly: false`). `FE-D3-001` 이상 없음 UI 검증용 |

> **`endpoints.ts` 미수정**: `frame/frontend` 단계에서 `COMMODITY_SCATTER: (id: string) => '/commodities/${id}/scatter'` 함수 형태로 이미 정의됨. 본 브랜치는 import만.  
> **`src/hooks/` 폴더**: `feat/fe-layout-filter`에서 신규 생성됨. 선행 조건 머지 후 이미 존재.

### 1.4 구현 범위 및 비구현 범위

| 구분 | 내용 |
|------|------|
| **구현** | D3.js ScatterChart — 산점도 캔버스(X/Y축·그리드), 대각선 기준선(y=x·파란 점선·진입 2초 말풍선), 4개 구역 레이블 + 설명, 일반 관측치(연회색 원), 이상 관측치(3등급 색상·크기·글로우·호버 툴팁·클릭 액션), 구간 선택 탭(3/4구간 대응), 접이식 설명 패널(기본 펼침), 시점 슬라이더(재생·일시정지·궤적선 클라이언트 필터링), `scatterSegment` ViewState 추가, scatter.json·scatter_empty.json fixture, useScatterData 훅 |
| **비구현** | `baseline.transmission_elasticity` 기반 회귀선 (Action Item 미확정), `baseline.normal_transmission_lag` 시차 UI (Action Item 미확정), 보조 품목 오버레이 (scatter 뷰는 단일 품목·단일 구간 단면 분석이므로 보조 품목 오버레이 없음), 미니맵 없음 (scatter 뷰는 시간축 고정) |
| **선행 조건** | `frame/frontend` → `develop` PR 머지 완료, `feat/fe-layout-filter` → `develop` PR 머지 완료 (useAppStore FilterState·ViewState 확장 및 `src/hooks/` 폴더 존재), `feat/fe-stream-chart` → `develop` PR 머지 완료 (`src/utils/colorUtils.ts` 생성, anomaly 색상 상수 존재) |

---

## 2. 입력 데이터

> 필드명·타입은 `api_spec_vN.md §/commodities/{id}/scatter` 기준으로 정확히 명시한다.

### 2.1 API 응답 — `/scatter`

| 출처 | 필드 | 타입 | 비고 |
|------|------|------|------|
| `GET /commodities/{id}/scatter` | `commodity_id` | `string` | 요청 품목 ID 반환 |
| | `segment_id` | `SegmentId` | 요청 구간 반환 |
| | `upstream_label` | `string` | X축 레이블 (예: "국제가 (원화 환산)") |
| | `downstream_label` | `string` | Y축 레이블 (예: "수입단가") |
| | `requested_from` / `requested_to` | `string` | YYYY-MM |
| | `actual_from` / `actual_to` | `string` | YYYY-MM |
| | `granularity` | `'monthly'` | scatter는 항상 `monthly` (api_spec 고정) |
| | `total_points` | `number` | 전체 관측치 수 |
| | `until` | `string \| null` | YYYY-MM. 슬라이더 초기값 동기화용. 요청 시 미전달이면 `null` |
| | `baseline.transmission_elasticity` | `number` | 구간 전달 탄성치. 기준선 시각화 방식 미확정 (Action Item) |
| | `baseline.normal_transmission_lag` | `number` | 정상 전달 시차(개월). UI 표현 미확정 (Action Item) |
| | `points[].period` | `string` | YYYY-MM. 시점 슬라이더 필터링 기준 |
| | `points[].upstream_pct` | `number` | X축값: 상류 가격 변화율 (%) |
| | `points[].downstream_pct` | `number` | Y축값: 하류 가격 변화율 (%) |
| | `points[].is_anomaly` | `boolean` | 이상 관측치 여부 |
| | `points[].anomaly_id` | `number \| null` | **integer**. `is_anomaly: true`이면 integer, 아니면 `null` |
| | `points[].confidence_grade` | `ConfidenceGrade \| null` | `is_anomaly: true`이면 non-null |
| | `points[].primary_pattern` | `PrimaryPattern \| null` | `is_anomaly: true`이면 non-null |

> **타입 주의**: `anomaly_id`는 `number | null` (integer). 문자열 캐스팅 금지.

### 2.2 useAppStore 읽기 상태

| 슬라이스 | 필드 | 용도 |
|---------|------|------|
| CommodityState | `primaryCommodityId: string \| null` | /scatter 요청 `{id}` 경로 변수 |
| FilterState | `filterFrom: string \| null` | 쿼리 파라미터 `from` |
| FilterState | `filterTo: string \| null` | 쿼리 파라미터 `to` |
| FilterState | `confidenceFilter: ConfidenceGrade[]` | 쿼리 파라미터 `grade` (콤마 결합) |
| ViewState | `scatterSegment: SegmentId` | 쿼리 파라미터 `segment` (단일값, 필수) |

> **`activeSegments` 미사용**: scatter 뷰는 구간을 탭으로 단일 선택. FilterState의 `activeSegments`는 스트림 차트용 다중 토글이며 scatter 쿼리 파라미터에 사용하지 않는다.

### 2.3 타입 변환 규칙

| 변환 위치 | AS-IS | TO-BE | 규칙 |
|-----------|-------|-------|------|
| API `period` 파싱 (D3 시점 비교) | `"2022-03"` (string) | `Date` 객체 | `parse(s, 'yyyy-MM', new Date())` via `date-fns`. 파싱 실패 → `PARSE-DATE-002` |
| `upstream_pct` / `downstream_pct` NaN 문자열 | `"NaN"` string | NaN 필터링 | `PARSE-NUM-002`. 해당 관측치 skip |
| `anomaly_id: null` + `is_anomaly: false` | `null` (정상) | 클릭 불가 처리 | 정상 케이스. 이상 없음 점은 클릭 이벤트 없음 |
| `anomaly_id: null` + `is_anomaly: true` | `null` (비정상) | 콘솔 경고 + 클릭 불가 | `PARSE-SCHEMA-001` 제안 — `is_anomaly: true`이면 `anomaly_id`는 반드시 integer여야 함 |

---

## 3. 출력 데이터

### 3.1 렌더링 출력

| 출력 | 내용 |
|------|------|
| `ScatterChart.tsx` SVG | 관측치 산점도 + 기준선 + 구역 레이블 + 이상 관측치 + 슬라이더 궤적선 |
| 이상 없음 UI | `points` 중 `is_anomaly: true`인 관측치 없음: "이 기간에는 이상 탐지 관측치가 없습니다" 오버레이 (산점도 위에 표시, 일반 관측치는 그대로 렌더링) |

### 3.2 useAppStore 쓰기

| 필드 | 트리거 | 값 |
|------|--------|-----|
| `selectedAnomalyId: number \| null` | 이상 관측치 클릭 | 클릭된 `anomaly_id` (integer) |
| `isPanelOpen: boolean` | 이상 관측치 클릭 | `true` |
| `scatterSegment: SegmentId` | 구간 탭 전환 | 선택한 탭의 `SegmentId` |

> `selectedAnomalyId` 저장 → `isPanelOpen: true` 설정만 수행. 패널 슬라이드인 애니메이션 및 내부 콘텐츠 렌더링은 `feat/fe-panel` 담당.

### 3.3 시각화 규격 (web_plan_vN §4.2 기준)

#### ① 축 및 캔버스

| 항목 | 규격 |
|------|------|
| X축 | 상류 가격 변화율 (%) — `upstream_label` 값으로 축 타이틀 표시 |
| Y축 | 하류 가격 변화율 (%) — `downstream_label` 값으로 축 타이틀 표시 |
| 그리드 | 회색 점선 수평·수직 그리드 (`opacity: 0.3`) |
| 원점 강조 | x=0, y=0 각각 실선 (`opacity: 0.5`) |

#### ② 대각선 기준선

- **기울기**: y = x (slope 1.0, "전이율 = 1.0 정상 전달 기준선")
- **색상·스타일**: 파란 점선 (`stroke: #3b82f6`, `stroke-dasharray: 6,4`, `opacity: 0.8`)
- **범위**: 차트 대각선 전체 (데이터 range 기준)
- **진입 말풍선**: 차트 진입(마운트) 후 2초간 기준선 중앙에 "이 선에 가까울수록 정상 전달" 텍스트 표시 후 fade-out

#### ③ 구역 레이블 (4개)

| 위치 | 레이블 | 1줄 설명 |
|------|--------|----------|
| 우상단 (x>0, y>x) | 과대 전달 | "상류 상승이 하류에 더 크게 전달됨" |
| 좌하단 (x<0, y>x) | 과소 전달 | "상류 하락이 하류에 덜 전달됨" |
| 우하단 (x>0, y<0) | 역전 | "상류 상승, 하류 하락" |
| 좌상단 (x<0, y>0) | 깃털 패턴 | "상류 하락에도 하류 무반응 또는 상승" |

- 레이블 텍스트 색상: `#94a3b8` (slate-400). 설명 텍스트: `#64748b` (slate-500), `font-size: 11px`
- 구역 레이블은 SVG `<text>` 요소로 렌더링. 차트 리사이즈 시 위치 재계산

#### ④ 관측치 포인트

| 종류 | 조건 | 색상 | 반지름 | 효과 |
|------|------|------|--------|------|
| 일반 | `is_anomaly: false` | `#94a3b8` (slate-400) | 4px | 없음. 호버 없음 |
| 고신뢰 이상 | `confidence_grade === 'high'` | `#e24b4a` | 7px | CSS 글로우 + 펄스 |
| 중신뢰 이상 | `confidence_grade === 'medium'` | `#ef9f27` | 5.5px | CSS 글로우 |
| 참고 이상 | `confidence_grade === 'reference'` | `#c8d850` (연두) | 4px | 없음 |

- **이상 관측치 클릭**: `setSelectedAnomalyId(anomaly_id)` + `setPanelOpen(true)` 호출. `anomaly_id: null`인 경우 클릭 이벤트 없음
- **일반 관측치 클릭**: 반응 없음

#### ⑤ 이상 관측치 호버 툴팁

`is_anomaly: true` 포인트 hover 시 표시. 필드:

| 필드 | 표시 형식 |
|------|-----------|
| `period` | `YYYY년 M월` (예: "2022년 3월") |
| `upstream_pct` | `X축: +18.2%` (소수점 1자리, + 부호 명시) |
| `downstream_pct` | `Y축: +26.1%` (소수점 1자리, + 부호 명시) |
| `confidence_grade` | "고신뢰" / "중신뢰" / "참고" |
| `primary_pattern` | "패턴1: 비대칭" / "패턴2: 과대" / "패턴3: 깃털" (한국어 매핑) |

> **패턴 한국어 매핑**: `pattern1` → "비대칭 전달", `pattern2` → "과대 전달", `pattern3` → "깃털 패턴"

#### ⑥ 구간 전환 탭

- **위치**: 차트 상단
- **3구간 품목** (`has_wholesale: false`): A / B / D′ 탭 3개
- **4구간 품목** (`has_wholesale: true`): A / B / C / D / D′ 탭 5개
- `has_wholesale` 값은 `/commodities` 응답의 `primaryCommodityId` 매칭 항목에서 읽음
- 탭 전환 → `setScatterSegment(segmentId)` → `useScatterData` 자동 재조회

#### ⑦ 접이식 설명 패널

- **위치**: 차트 상단 (구간 탭 아래)
- **기본 상태**: 펼침
- **헤더**: "[전달 구조 뷰란?] ▲ / ▼"
- **내용** (web_plan_vN §4.2 원문 그대로):
  ```
  이 그래프는 특정 구간에서 가격이 '얼마나, 어느 방향으로' 전달됐는지를 보여줍니다.

  X축: 상류(앞 단계) 가격의 월별 변화율
  Y축: 하류(다음 단계) 가격의 월별 변화율
  각 점: 1개월 관측치

  파란 점선(기준선)에 가까울수록 상류 변화가 그대로 전달된 정상적인 달입니다.
  빨간·주황 점은 이상 탐지 시점이며, 클릭하면 분석 수치를 확인할 수 있습니다.

  흐름 보기가 '언제 이상이 있었는가'라면,
  전달 구조는 '그 이상이 어떤 형태였는가'를 보여줍니다.
  ```
- 접기 상태는 컴포넌트 로컬 state로 관리 (useAppStore 미사용)

#### ⑧ 시점 슬라이더

- **위치**: 차트 하단
- **범위**: `actual_from` ~ `actual_to` (월 단위 step)
- **초기 위치**: `actual_to` (전체 표시)
- **동작**:
  - 슬라이더 이동 → `points[].period <= 슬라이더 위치`인 관측치만 렌더링
  - 슬라이더 위치보다 과거 관측치를 순서대로 선으로 연결 (궤적선, `stroke: #475569`, `opacity: 0.4`)
  - 재생 버튼: `actual_from`부터 1개월 단위로 200ms 간격 자동 전진
  - 일시정지 버튼: 현재 위치에서 정지
  - 재시작 버튼: `actual_from`으로 리셋 후 재생
- **슬라이더 상태**: 컴포넌트 로컬 state (`sliderPosition: string`, YYYY-MM)
- **`until` API 파라미터**: 슬라이더 자동 재생 중 HTTP 재조회 없음. 초기 마운트 시 `until: null` (전체 범위 로드)

---

## 4. 파라미터 제약 조건

| 파라미터 | 관리 위치 | 기본값 | 하드코딩 금지 이유 |
|----------|-----------|--------|-------------------|
| 이상 관측치 색상 (high·medium·reference) | `src/utils/colorUtils.ts` | `feat/fe-stream-chart`에서 정의된 값 재사용 | 디자인 변경 단일 관리 |
| 이상 관측치 반지름 | `src/utils/colorUtils.ts` | `feat/fe-stream-chart`에서 정의된 값 재사용 | 동일 |
| 기준선 색상 (`#3b82f6`) | `src/utils/colorUtils.ts` 또는 ScatterChart 상수 | `#3b82f6` | 디자인 변경 대비 |
| 구역 레이블 텍스트 색상 | ScatterChart 내 상수 | `#94a3b8` / `#64748b` | 동일 |
| 슬라이더 재생 간격 | ScatterChart 내 상수 | `200` (ms) | 애니메이션 속도 단일 관리 |
| `scatterSegment` 초기값 | `useAppStore.ts` 초기 상태 | `'A'` | 상태 초기화 단일 관리 |

---

## 5. 예외처리

### 5.1 적용 예외 코드

| 예외 코드 | 발생 조건 | 처리 방침 |
|-----------|-----------|-----------|
| `FE-API-001` | `/scatter` 요청 중 네트워크 실패 | FE_TOAST ("데이터를 불러오지 못했습니다.") + 재시도 버튼. React Query `retry: 3` |
| `FE-API-002` | `/scatter` 400 응답 (`INVALID_SEGMENT`, `INVALID_DATE_RANGE` 등) | FE_TOAST (api_error_code에 따른 사용자 친화 메시지). **INVALID_SEGMENT**: "선택한 구간 데이터가 없습니다." |
| `FE-API-003` | `/scatter` 404 응답 (`COMMODITY_NOT_FOUND`) | FE_FALLBACK — 빈 상태 UI ("데이터가 없습니다.") |
| `FE-API-004` | `/scatter` 500 응답 | FE_BLOCK — ScatterChart 에러 UI. ErrorBoundary로 전파 방지 |
| `FE-D3-001` | `points[]` 빈 배열 | FE_FALLBACK — "이 기간에는 관측 데이터가 없습니다." (산점도 캔버스 기준선·레이블은 유지) |
| `FE-D3-002` | `upstream_pct` 또는 `downstream_pct`에 NaN 포함으로 D3 스케일 계산 실패 | FE_FALLBACK — NaN 포인트 필터링 후 재렌더링 |
| `FE-D3-003` | SVG 컨테이너 `getBoundingClientRect()` width 또는 height가 0 | FE_FALLBACK — `ResizeObserver` 감지 후 재렌더링 |
| `PARSE-DATE-002` | `points[].period`가 `YYYY-MM` 형식 아님 | FE_FALLBACK — 해당 포인트 skip, 콘솔 경고 |
| `PARSE-NUM-002` | `upstream_pct` 또는 `downstream_pct`가 `"NaN"` 문자열 또는 비정상 `null` | FE_FALLBACK — 해당 포인트 skip |
| `PARSE-ARR-002` | `points[]` 배열 요소에서 필수 필드 누락 | FE_FALLBACK — 해당 포인트 skip, 콘솔 경고 |
| `FE-MOCK-001` | `VITE_USE_MOCK !== 'false'` 상태에서 `src/fixtures/scatter.json` 없음 | FE_BLOCK (개발환경 전용) |

### 5.2 신규 예외 코드 제안

| 코드(proposed) | 발생 조건 | 처리 방침 | 제안 사유 |
|----------------|-----------|-----------|-----------|
| `PARSE-SCHEMA-001` (기존 코드) | `is_anomaly: true`이면서 `anomaly_id: null`인 관측치 | FE_FALLBACK — 해당 포인트 클릭 불가 처리 + 콘솔 경고 | api_spec 상 `is_anomaly: true` → `anomaly_id`는 반드시 integer여야 하는 묵시적 제약 위반 |

> ⚠️ `(proposed)` 코드는 PM 확정 전 사용 금지. 콘솔 경고만 출력하고 코드는 기재하지 않는다.

---

## 6. 목업 및 실제 데이터 전환 조건

| 항목 | 내용 |
|------|------|
| 테스트 품목 | `wheat` (3구간: A, B, D_prime) |
| 기본 구간 | segment A (`scatterSegment` 초기값) |
| 테스트 기간 | `2023-04` ~ `2026-03` (36개월) |
| 특수 케이스 1 | `is_anomaly: false` 일반 관측치 다수 포함 — 회색 점 렌더링 검증 |
| 특수 케이스 2 | `confidence_grade: 'high'` 관측치 1개 + `'medium'` 1개 + `'reference'` 1개 — 3등급 색상 검증 |
| 특수 케이스 3 | 궤적선: 슬라이더를 중간 위치로 이동 시 이전 관측치 선 연결 확인 |
| 특수 케이스 4 | `points[]` 빈 배열 fixture — `FE-D3-001` 빈 상태 UI 검증 |
| Fixture 경로 | `src/fixtures/scatter.json` (주 케이스), `src/fixtures/scatter_empty.json` (빈 케이스) |
| MOCK 분기 조건 | `import.meta.env.VITE_USE_MOCK !== 'false'` |
| 더미 → 실제 전환 트리거 | `VITE_USE_MOCK=false` + `feat/be-api-timeseries` dev 머지 완료 후 |

### 6.1 scatter.json fixture 최소 구조

```json
{
  "commodity_id": "wheat",
  "segment_id": "A",
  "upstream_label": "국제가 (원화 환산)",
  "downstream_label": "수입단가",
  "requested_from": "2023-04",
  "requested_to":   "2026-03",
  "actual_from":    "2023-04",
  "actual_to":      "2026-03",
  "granularity":    "monthly",
  "total_points":   36,
  "until":          null,
  "baseline": {
    "transmission_elasticity": 0.72,
    "normal_transmission_lag": 2
  },
  "points": [
    {
      "period": "2023-04",
      "upstream_pct": 3.1,
      "downstream_pct": 2.9,
      "is_anomaly": false,
      "anomaly_id": null,
      "confidence_grade": null,
      "primary_pattern": null
    },
    {
      "period": "2022-03",
      "upstream_pct": 18.2,
      "downstream_pct": 26.1,
      "is_anomaly": true,
      "anomaly_id": 142,
      "confidence_grade": "high",
      "primary_pattern": "pattern2"
    },
    {
      "period": "2021-09",
      "upstream_pct": -5.4,
      "downstream_pct": 1.2,
      "is_anomaly": true,
      "anomaly_id": 87,
      "confidence_grade": "medium",
      "primary_pattern": "pattern3"
    },
    {
      "period": "2020-11",
      "upstream_pct": 9.7,
      "downstream_pct": 14.1,
      "is_anomaly": true,
      "anomaly_id": 43,
      "confidence_grade": "reference",
      "primary_pattern": "pattern1"
    }
  ]
}
```

> `anomaly_id`는 **정수** (number 리터럴). 문자열 `"142"` 금지.  
> 실제 `scatter.json`은 36개월 풀 데이터 포함 (일반 관측치 32개 + 이상 3등급 각 1개 이상).

### 6.2 scatter_empty.json fixture 최소 구조

`points` 전원 `is_anomaly: false` 케이스. `FE-D3-001` 이상 없음 UI 검증용.

```json
{
  "commodity_id": "wheat",
  "segment_id": "A",
  "upstream_label": "국제가 (원화 환산)",
  "downstream_label": "수입단가",
  "requested_from": "2023-04",
  "requested_to":   "2026-03",
  "actual_from":    "2023-04",
  "actual_to":      "2026-03",
  "granularity":    "monthly",
  "total_points":   12,
  "until":          null,
  "baseline": {
    "transmission_elasticity": 0.72,
    "normal_transmission_lag": 2
  },
  "points": [
    {
      "period": "2023-04",
      "upstream_pct": 2.1,
      "downstream_pct": 1.9,
      "is_anomaly": false,
      "anomaly_id": null,
      "confidence_grade": null,
      "primary_pattern": null
    }
  ]
}
```

---

## 7. 완료 기준

> 주관적 판단 없이 수치·상태로 기술.

| 항목 | 기준 |
|------|------|
| 산점도 캔버스 렌더링 | `scatter.json` 기준 X·Y축, 그리드, 대각선 기준선(파란 점선) SVG 렌더링 확인 (브라우저 시각 검증) |
| 기준선 말풍선 | 차트 마운트 후 2초간 "이 선에 가까울수록 정상 전달" 텍스트 표시 후 사라짐 확인 |
| 구역 레이블 | 4개 구역 레이블 + 설명 텍스트 SVG 렌더링 확인 |
| 일반 관측치 | 회색(#94a3b8) 원 4px 렌더링 확인. 호버·클릭 반응 없음 확인 |
| 이상 관측치 3색 | high(빨강)/medium(주황)/reference(연두) 관측치 각 1개 이상 렌더링 확인 |
| 이상 관측치 클릭 → 스토어 | 클릭 시 `useAppStore.selectedAnomalyId`가 해당 `anomaly_id` (integer) 갱신 확인 |
| isPanelOpen 갱신 | 이상 관측치 클릭 시 `useAppStore.isPanelOpen: true` 확인 |
| 호버 툴팁 | 이상 관측치 hover 시 period·upstream_pct·downstream_pct·confidence_grade·primary_pattern 툴팁 표시 확인 |
| 구간 탭 | A/B/D′ 탭 3개 렌더링 확인. 탭 클릭 시 `scatterSegment` 갱신 + useScatterData 재조회 확인 |
| 4구간 품목 탭 | `has_wholesale: true` 품목 선택 시 C/D 탭 추가 렌더링 확인 |
| 3구간 품목 탭 제한 | `has_wholesale: false` 품목에서 C/D 탭 미표시 확인 |
| 접이식 설명 패널 | 마운트 시 기본 펼침 상태. 헤더 클릭 시 접기/펼치기 동작 확인 |
| 슬라이더 표시 범위 | `actual_from` ~ `actual_to` 범위로 슬라이더 렌더링 확인 |
| 슬라이더 필터링 | 슬라이더 이동 시 해당 위치 이하 `period` 관측치만 렌더링 확인 (재조회 없음, 콘솔 Network 탭 확인) |
| 궤적선 | 슬라이더 이동 시 과거 관측치 순서대로 선 연결 렌더링 확인 |
| 재생 버튼 | 재생 버튼 클릭 시 200ms 간격으로 슬라이더 자동 전진·관측치 증가 확인 |
| 이상 없음 UI | `scatter_empty.json` 사용 시 "이 기간에는 이상 탐지 관측치가 없습니다" 오버레이 표시 확인 |
| activeTab 마운트 분기 | `activeTab === 'scatter'`일 때만 `ScatterChart` 마운트, 다른 탭 전환 시 unmount 확인 |
| MOCK 분기 | `VITE_USE_MOCK !== 'false'` 시 fixture 데이터 반환, 실제 HTTP 요청 없음 확인 |
| 타입 일치 | `anomaly_id` 필드가 `number` 타입으로 처리됨 확인 |

---

## 8. 금지 사항

| 금지 사항 | 이유 |
|-----------|------|
| D3.js 외 시각화 라이브러리 추가 | D3.js v7 단일 사용 원칙 (CLAUDE.md §15-1) |
| `upstream_pct`·`downstream_pct` 가공·재계산 | 백엔드 API 응답값 직접 사용 원칙 (CLAUDE.md §15-2) |
| 슬라이더 이동 시마다 HTTP 재조회 | 성능 원칙: 전체 데이터 1회 로드 후 클라이언트 필터링. `until` 파라미터 실시간 조회 금지 (Action Item 정책) |
| `has_wholesale: false` 품목에 C·D 탭 표시 | 3구간 품목 도매가 UI 노출 금지 (CLAUDE.md §15-6) |
| `activeSegments` 필드를 scatter `segment` 파라미터로 사용 | `activeSegments`는 스트림 차트 전용 다중 토글 (§2.2 참조) |
| `snake_case` → `camelCase` 변환 인터셉터 | §6.1 정책 위반 (CLAUDE.md §6) |

---

## 9. PR 체크리스트

PR 제출 전 아래 항목을 모두 확인한다.

- [ ] TypeScript 컴파일 오류 없음 (`PATH="...nvm/v20.11.1:$PATH" node ./node_modules/typescript/bin/tsc -b --noEmit`)
- [ ] ESLint 경고 없음 (`npx eslint src/ --max-warnings 0`)
- [ ] vitest 스모크 테스트 통과 (`vitest run`)
- [ ] `scatter.json` fixture에 이상 관측치 3등급 각 1개 이상 포함 확인
- [ ] `scatter_empty.json` fixture에 `is_anomaly: false`만 포함 확인
- [ ] `anomaly_id` 필드 모두 정수형(숫자 리터럴) 기재 확인
- [ ] `scatterSegment` 초기값 `'A'` 설정 확인
- [ ] 3구간 품목(`wheat`) 탭 3개(A/B/D′)만 렌더링 확인
- [ ] 슬라이더 이동 시 Network 탭에 추가 HTTP 요청 없음 확인
- [ ] 기준선 말풍선 2초 후 사라짐 확인
- [ ] 접이식 설명 패널 기본 펼침 확인

---

## 10. 참고 문서

| 문서 | 참조 섹션 | 참조 목적 |
|------|-----------|-----------|
| `api_spec_vN.md` | `§/commodities/{id}/scatter` | 엔드포인트 파라미터·응답 필드 최종 확인 |
| `web_plan_vN.md` | `§4.2` | 전달 구조 뷰 UX 명세 (구역 레이블 원문·슬라이더·접이식 패널) |
| `frame_spec_frontend_vN.md` | `§2, §6.1, §8.6` | 디렉토리 구조·snake_case·D3 컴포넌트 위치 정책 |
| `exception_spec_vN.md` | `§2.4 FE-*, §2.3 PARSE-*` | 에러 코드 처리 방침 |
| `feature_spec_FE-STREAM_v1.md` | `§3.3 이상 노드, §4, §5` | 이상 노드 색상·반지름·글로우 상수 (colorUtils.ts 재사용) |
| `src/types/timeseries.ts` | `ScatterResponse, ScatterPoint, ScatterBaseline` | 타입 정의 최종 확인 |
