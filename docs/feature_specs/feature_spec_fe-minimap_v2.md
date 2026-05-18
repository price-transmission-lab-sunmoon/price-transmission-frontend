# Feature 명세서 — 미니맵

**문서 유형**: Feature 명세서
**브랜치명**: `feat/fe-minimap`
**담당자**: 하대수
**작성일**: 2026-05-05
**상태**: 초안

**변경 이력**:
- v1 (2026-05-05): 최초 작성
- v2 (2026-05-10): `plan_feature_specs_alignment_v1.md` 감사 결과 반영
  - **P2 ④**: 본문 frame_spec 섹션 인용 정정 (`§2` → `§8.6`, D3 컴포넌트 위치 정책 SoT)
  - **공통 패턴**: 헤더 `기능 번호: FE-MINIMAP` 제거, `feature_spec_FE-STREAM_v1.md` → `feature_spec_fe-stream-chart_vN.md` 참조 정정, "FE-LAY" 잔존 표현 → `feat/fe-layout-filter`로 정정
  - **P1 ② 유지**: feature_dev_list `§5.1 → §4.1` 정정 PM 별건 유지
  - **P1 ③ 유지**: anomaly_density 색상·opacity 임계 PM 결재 유지

---

## ⚠️ 구현 시작 전 필수 확인

| 문서 | 버전 | 참조 목적 | 확인 |
|------|------|-----------|------|
| `web_plan_vN.md §4.1` | vN | 하단 미니맵 UX 요구사항 (뷰포트 박스·드래그·밀도 표시) | ☐ |
| `api_spec_vN.md §/stream/minimap` | vN | 응답 구조·anomaly_density 필드·쿼리 파라미터 | ☐ |
| `exception_spec_vN.md §8` | vN | feat/fe-minimap 예외 코드 매핑 (`FE-D3-001`, `FE-D3-003`) | ☐ |
| `feature_dev_list_vN.md §feat/fe-minimap` | vN | 완료 기준·선행 조건·구현 범위 | ☐ |
| `feature_spec_fe-stream-chart_vN.md §1.3, §3.2` | vN | 선행 구현 상태 (useAppStore 구조·FilterState 필드·MainPage 마운트 패턴) | ☐ |
| `frame_spec_frontend_vN.md §6.2, §8.6` | vN | Zustand 필드명 SoT + D3 컴포넌트 위치 정책 | ☐ |

---

## ⚠️ PM 별건 — 결재 대기 항목

| # | 항목 | 충돌 내용 | 본 명세 잠정 채택 |
|---|------|----------|-------------------|
| 1 | feature_dev_list 섹션 인용 오기 | `feature_dev_list_vN §feat/fe-minimap`이 `web_plan_vN §5.1`을 참조하나 실제 미니맵 명세는 `web_plan_vN §4.1` (§5.1은 멀티 품목 오버레이) | feature_dev_list v5 bump 시 `§4.1`로 정정 |
| 2 | anomaly_density 색상·opacity 임계 | web_plan §4.1은 "이상이 집중된 구간을 색상으로 표시"만 명시 — 색상·opacity 임계 미정 | §3.3 ⑤ 표 잠정 (`high>0`→빨강 0.12 등). PM 확정 후 본문 갱신 |
| 3 | `/stream/minimap` 응답 `anomaly_nodes[]` 포함 여부 | api_spec_vN 응답 예시는 생략. yearly 집계라 density로 표현하는 의도로 해석 | **포함 안 함 전제** 작성. PM이 "포함" 확정 시 §2.1·§6 fixture에 `anomaly_nodes[]` 추가 |

---

## 1. 기능 개요

### 1.1 한 줄 요약

스트림 그래프 하단에 고정 배치되는 전체 기간 압축 뷰. 반투명 뷰포트 박스 드래그로 메인 스트림차트의 표시 기간을 이동·조정하며, 연도별 이상 밀도를 색상으로 표시한다.

### 1.2 데이터 흐름

```
useAppStore (primaryCommodityId, filterFrom, filterTo, activeSegments)
  → useMinimapData (enabled: primaryCommodityId !== null)
  → GET /commodities/{id}/stream/minimap (granularity=yearly)
  → Minimap.tsx D3 렌더링
      → series[] : 연별 전이율 곡선 (배경, opacity 0.3)
      → anomaly_density[] : 연도별 이상 밀도 배경 밴드
      → d3.brushX() 뷰포트 박스 (filterFrom ~ filterTo 범위)
  → 박스 드래그(brush end) → useAppStore.setFilterFrom / setFilterTo
  → StreamChart 기간 이동 (store 통해 단방향 반응)

에러 경로 (FE-API-001~004): useMinimapData 훅이 throw → 호출 측이 useQuery isError prop으로 수신 → Minimap 컴포넌트를 FE-D3-001 fallback UI로 대체.
```

### 1.3 프레임 내 위치

> D3 컴포넌트 위치 정책: `frame_spec_frontend_vN.md §8.6` (`src/components/charts/`).

| 구분 | 경로 | 작업 내용 |
|------|------|-----------|
| 수정 | `src/pages/MainPage.tsx` | `activeTab === 'stream'` 분기에 `<Minimap variant="stream" />` 하단 고정 마운트 |
| 신규 | `src/components/charts/Minimap.tsx` | 미니맵 본체 — d3.brushX 뷰포트 박스·곡선 렌더·밀도 밴드. frame_spec_vN §8.6 D3 컴포넌트 위치 정책 따름 |
| 신규 | `src/hooks/useMinimapData.ts` | variant에 따라 `/stream/minimap` 또는 `/raw-prices/minimap` 조건부 호출. queryKey: `['minimap', variant, primaryCommodityId, activeSegments.join(',')]`. enabled: `primaryCommodityId !== null` |
| 수정 | `src/types/timeseries.ts` | `MinimapDataPoint`, `AnomalyDensityItem`, `MinimapResponse` 타입 추가 |
| 수정 | `src/api/client.ts` | regex 매칭: `url.match(/^\/commodities\/([^/]+)\/stream\/minimap$/)` |
| 신규 | `src/fixtures/stream_minimap.json` | wheat 미니맵 Mock 데이터 (yearly, anomaly_density 3개 연도) |

> **NOTE**: `endpoints.ts` 미수정 — frame/frontend에서 이미 `COMMODITY_STREAM_MINIMAP`, `COMMODITY_RAW_PRICES_MINIMAP` 모두 정의됨.

### 1.4 구현 범위 및 비구현 범위

| 구분 | 내용 |
|------|------|
| **구현** | 스트림 뷰 하단 고정 미니맵 렌더링 (전체 기간 yearly 압축 뷰) |
| **구현** | 뷰포트 박스 표시 (filterFrom~filterTo 반투명 박스) |
| **구현** | 박스 드래그로 메인 스트림차트 기간 이동 (store filterFrom/filterTo 갱신) |
| **구현** | 박스 좌·우 핸들 드래그로 기간 범위 조정 |
| **구현** | 마우스 휠 줌 연동 (store 값 변경 → 박스 자동 갱신, 별도 코드 불필요) |
| **구현** | 연도별 이상 밀도 배경 밴드 (anomaly_density 기반) |
| **구현** | `variant="raw-prices"` props 타입 정의 (재사용 준비) |
| **비구현** | `/raw-prices/minimap` 실제 마운트 — `feat/fe-raw-timeseries`에서 구현 |
| **비구현** | `raw_prices_minimap.json` fixture — `feat/fe-raw-timeseries`에서 추가 |
| **비구현** | 보조 품목 미니맵 오버레이 — 향후 확장 |
| **선행 조건** | `frame/frontend` → `develop` 머지 + `feat/fe-layout-filter` → `develop` 머지 + `feat/fe-stream-chart` → `develop` 머지 |

> *구현 범위 출처: feature_dev_list_vN §feat/fe-minimap + web_plan_vN §4.1 미니맵 섹션. feature_dev_list가 web_plan §5.1로 참조하는 것은 PM 별건 #1.*

---

## 2. 입력 데이터

### 2.1 API 응답 — `/stream/minimap`

`GET /commodities/{commodity_id}/stream/minimap` (api_spec_vN §/stream/minimap)

**쿼리 파라미터**

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|:----:|--------|------|
| `segments` | string | — | 품목 전체 구간 | 구간 필터 (쉼표 구분: `"A,B"`) |

> `granularity=yearly`는 항상 고정. 파라미터 전송 불필요. `from`/`to` 파라미터도 없음 (항상 전체 기간).

**응답 필드**

| 필드 | 타입 | 설명 |
|------|------|------|
| `commodity_id` | string | 품목 ID |
| `requested_from` | string | 요청 시작 (YYYY-MM) |
| `requested_to` | string | 요청 종료 (YYYY-MM) |
| `actual_from` | string | 실제 데이터 시작 (YYYY-MM) |
| `actual_to` | string | 실제 데이터 종료 (YYYY-MM) |
| `granularity` | string | 항상 `"yearly"` |
| `total_points` | number | 연도 수 |
| `series` | array | 구간별 연도 집계 데이터 (구조는 `/stream` 동일) |
| `series[].segment_id` | string | 구간 ID |
| `series[].data[]` | array | 연도별 데이터 포인트 |
| `series[].data[].period` | string | 연도 문자열 (`"YYYY"` 형식) |
| `series[].data[].transmission_rate` | number \| null | 연간 집계 전이율 |
| `series[].data[].upstream_pct` | number | 상류 가격 변화율 |
| `series[].data[].downstream_pct` | number | 하류 가격 변화율 |
| `series[].data[].in_warmup_period` | boolean | 워밍업 구간 여부 |
| `series[].data[].has_anomaly` | boolean | 해당 연도 이상 존재 여부 |
| `series[].data[].anomaly_ids` | number[] | 해당 연도 이상 ID 목록 |
| `anomaly_density` | array | 연도별 신뢰도 등급별 이상 건수 |
| `anomaly_density[].period` | string | 연도 (`"YYYY"` 형식) |
| `anomaly_density[].high_count` | number | 고신뢰 이상 건수 |
| `anomaly_density[].medium_count` | number | 중신뢰 이상 건수 |
| `anomaly_density[].reference_count` | number | 참고 이상 건수 |

> **period 형식 주의**: 미니맵 데이터의 period는 `"YYYY"` (연도만). `/stream`의 `"YYYY-MM"` 형식과 다름. D3 파싱 시 `d3.timeParse("%Y")` 사용.

### 2.2 useAppStore 읽기 상태

`feat/fe-layout-filter`에서 정의된 FilterState·CommodityState·ViewState를 읽기만 한다. 새 필드 추가 없음.

| 필드 | 타입 | 용도 |
|------|------|------|
| `primaryCommodityId` | string | API 호출 `commodity_id` |
| `filterFrom` | string (YYYY-MM) | 현재 뷰포트 시작 → 박스 좌측 경계 계산 |
| `filterTo` | string (YYYY-MM) | 현재 뷰포트 종료 → 박스 우측 경계 계산 |
| `activeSegments` | SegmentId[] | `segments` 쿼리 파라미터 조합 |
| `activeTab` | ViewTab | `"stream"`일 때만 MainPage가 Minimap 마운트 (직접 읽지 않음) |

### 2.3 타입 변환 규칙

| AS-IS | TO-BE | 적용 규칙 |
|-------|-------|-----------|
| `period: "2022"` (YYYY) | `Date` | `d3.timeParse("%Y")(period)` — X축 스케일 입력 |
| `filterFrom: "2023-04"` (YYYY-MM) | `Date` | `d3.timeParse("%Y-%m")(filterFrom)` — 뷰포트 박스 좌측 경계 계산 |
| `filterTo: "2026-03"` (YYYY-MM) | `Date` | `d3.timeParse("%Y-%m")(filterTo)` — 뷰포트 박스 우측 경계 계산 |
| `transmission_rate: null` + `in_warmup_period: true` | skip | d3.line().defined() — 정상 케이스, 워밍업 구간 제외 |
| `transmission_rate: null` + `in_warmup_period: false` | skip + console.warn | PARSE-NUM-002 (연간 집계임에도 null인 비정상 케이스) |
| `anomaly_density` 필드 누락 | `[]` (빈 배열) 대체 | PARSE-ARR-002 — 밀도 밴드 미표시로 degraded 처리 |

---

## 3. 출력 데이터

### 3.1 렌더링 출력

SVG 기반 D3.js 미니맵. StreamChart 하단에 고정 배치.

- 높이: 64px (고정)
- 너비: 부모 컨테이너 100%
- 구성 레이어 (아래에서 위 순서):
  1. 이상 밀도 배경 밴드 (anomaly_density)
  2. 시리즈 전이율 곡선 (series, opacity 0.3)
  3. d3.brushX() 뷰포트 박스
  4. X축 눈금 (연도 레이블)

### 3.2 useAppStore 쓰기

미니맵은 FilterState의 기간 필드만 갱신한다. 다른 상태 수정 금지.

| 액션 | 트리거 | 갱신 필드 |
|------|--------|-----------|
| 박스 전체 드래그 (pan) | brush end — 박스 중앙 영역 드래그 완료 | `filterFrom`, `filterTo` (새 범위로 동시 갱신) |
| 좌측 핸들 드래그 | brush end — 좌측 핸들 드래그 완료 | `filterFrom` (filterTo 유지) |
| 우측 핸들 드래그 | brush end — 우측 핸들 드래그 완료 | `filterTo` (filterFrom 유지) |

> **줌 연동 (쓰기 없음)**: 메인 스트림차트 마우스 휠 줌은 store를 통해 filterFrom/filterTo를 갱신(`feat/fe-stream-chart` 담당). 미니맵은 store를 읽어 자동 반응하므로 별도 이벤트 핸들러 불필요.

### 3.3 시각화 규격

#### ① 레이아웃

| 항목 | 값 |
|------|-----|
| 고정 높이 | 64px |
| 마진 | top 8px, bottom 20px (X축 레이블 여백), left/right 동일 (StreamChart와 정렬) |
| X축 도메인 | actual_from ~ actual_to 전체 기간 |
| Y축 | transmission_rate 범위 (auto-scale, 표시 없음) |

#### ② 시리즈 전이율 곡선 (배경)

- 구간별 `d3.line()` 곡선 렌더링
- 색상: `colorUtils.ts` 동일 팔레트 (`feat/fe-stream-chart` §3.3 ① 구간 색상 기준)
- `stroke-opacity: 0.3`, `stroke-width: 1`
- `d3.line().defined()`: `transmission_rate !== null` 인 포인트만 연결

#### ③ X축

- `d3.scaleTime()` 기반
- 눈금: 연도 단위 (`d3.timeYear.every(2)` — 2년마다 표시, 기간이 짧으면 1년마다)
- 눈금 텍스트 포맷: `d3.timeFormat("%Y")`

#### ④ 뷰포트 박스 (d3.brushX)

| 항목 | 값 |
|------|-----|
| 구현 방식 | `d3.brushX()` |
| 박스 색상 | `rgba(100, 149, 237, 0.20)` |
| 테두리 | `#6495ED`, 1px solid |
| 핸들 색상 | `#6495ED` |
| 최소 박스 너비 | 3개월에 해당하는 픽셀 |
| 범위 제한 | actual_from ~ actual_to 초과 불가 |

**brush end 핸들러 로직**:
```
1. d3.brushSelection(brushRef.current) → [x0, x1] 픽셀 범위
2. xScale.invert(x0) → newFrom (Date) → YYYY-MM 문자열로 포맷
3. xScale.invert(x1) → newTo (Date) → YYYY-MM 문자열로 포맷
4. if (newTo - newFrom < 3개월) → 최소 범위 클램프 후 store 갱신
5. store.setFilterFrom(newFrom), store.setFilterTo(newTo)
```

**store 외부 갱신 시 brush selection 동기화** (메인 차트 줌 등):
```
useEffect(() => {
  const [px0, px1] = [xScale(parseDate(filterFrom)), xScale(parseDate(filterTo))];
  d3.select(brushRef.current).call(brush.move, [px0, px1]);
}, [filterFrom, filterTo, xScale]);
```
> 무한 루프 방지 위해 새 selection이 기존과 동일하면 setFilterFrom/setFilterTo 호출 생략.

#### ⑤ 이상 밀도 밴드 (anomaly_density) — PM 별건 #2

각 연도 구간에 배경 색상 rect을 채워 이상 집중도를 표시한다.
색상 결정: 해당 연도의 최고 등급 기준 단일 색상 (PM 결재 후 확정).

| 조건 | 배경 색상 | opacity |
|------|-----------|---------|
| `high_count > 0` | `#e24b4a` | 0.12 |
| `high_count = 0`, `medium_count > 0` | `#ef9f27` | 0.12 |
| `high = medium = 0`, `reference_count > 0` | `#c8d850` | 0.10 |
| 모두 0 또는 해당 연도 없음 | 없음 | — |

> anomaly_density에 없는 연도는 이상 없음으로 간주, 밴드 미표시.

---

## 4. 파라미터 제약 조건

| 파라미터 | 제약 | 출처 |
|---------|------|------|
| `granularity` | 항상 `"yearly"` 고정 — 프론트에서 파라미터 전송 불필요 | api_spec_vN |
| `segments` | `activeSegments.join(",")` — null이면 파라미터 생략 (전체 구간 기본값) | api_spec_vN |
| 박스 최소 너비 | 3개월 — 스트림차트 줌 하한과 동일 | web_plan_vN §4.1 |
| 박스 범위 | actual_from ~ actual_to 내로 클램프 | 논리적 제약 |
| `variant` prop | `"stream" \| "raw-prices"` — 타입 외 값은 컴파일 오류 | 이 명세 |
| X축 파싱 | period `"YYYY"` → `d3.timeParse("%Y")` — `"YYYY-MM"` 파서 사용 금지 | api_spec_vN (granularity=yearly 시 period 형식) |

---

## 5. 예외처리

### 5.1 적용 예외 코드

exception_spec_vN §8 `feat/fe-minimap` 매핑: `FE-D3-001`, `FE-D3-003`

| 코드 | 발생 조건 | 처리 방침 |
|------|-----------|-----------|
| `FE-D3-001` | `series[]` 전체가 빈 배열이거나 모든 segment의 `data[]`가 비어 있음 | FE_FALLBACK — 미니맵 영역에 "전체 기간 데이터 없음" 텍스트 표시. 뷰포트 박스·밀도 밴드 미표시 |
| `FE-D3-003` | SVG 컨테이너 `getBoundingClientRect()` width 또는 height = 0 | FE_FALLBACK — `ResizeObserver`로 컨테이너 크기 복구 감지 후 재렌더링 |
| `PARSE-NUM-002` | `transmission_rate: null` + `in_warmup_period: false` 비정상 케이스 | FE_FALLBACK — 해당 포인트 skip + console.warn |
| `PARSE-ARR-002` | `anomaly_density` 필드 누락 또는 배열 요소 필수 필드 누락 | FE_FALLBACK — 빈 배열 대체, 밀도 밴드 미표시 |

**FE-API-001~005 전파 처리**: useMinimapData 훅의 API 호출 에러는 React Query가 캐싱 후 호출 측(MainPage)으로 전파. 미니맵 컴포넌트 레벨에서는 `isError` prop을 받아 컴포넌트 자체를 숨기거나 FE-D3-001 fallback UI로 대체.

**FE-MOCK-001**: `VITE_USE_MOCK=true` 상태에서 `stream_minimap.json` 파일 없으면 FE_BLOCK (개발환경 전용).

### 5.2 신규 예외 코드 제안

해당 없음.

---

## 6. 목업 및 실제 데이터 전환 조건

`VITE_USE_MOCK=true` 시 `src/api/client.ts` 인터셉터가 `stream_minimap.json` 반환.

**client.ts 인터셉터 패턴** (동적 경로 — regex 필요):

```typescript
// 평가 순서 주의: /stream/minimap 정규식을 /stream보다 먼저 평가하거나 $ 앵커로 분리
const minimapMatch = url.match(/^\/commodities\/([^/]+)\/stream\/minimap$/);
if (minimapMatch) {
  const commodityId = minimapMatch[1];
  data = streamMinimapFixture;
}
```

**`src/fixtures/stream_minimap.json` 최소 구조**:

```json
{
  "commodity_id": "wheat",
  "requested_from": "2000-01",
  "requested_to": "2026-03",
  "actual_from": "2000-01",
  "actual_to": "2026-03",
  "granularity": "yearly",
  "total_points": 26,
  "series": [
    {
      "segment_id": "A",
      "data": [
        { "period": "2000", "transmission_rate": 0.72, "upstream_pct": 0.0, "downstream_pct": 0.0, "in_warmup_period": false, "has_anomaly": false, "anomaly_ids": [] },
        { "period": "2008", "transmission_rate": 1.21, "upstream_pct": 8.4, "downstream_pct": 10.2, "in_warmup_period": false, "has_anomaly": true, "anomaly_ids": [15] },
        { "period": "2020", "transmission_rate": 0.94, "upstream_pct": 3.1, "downstream_pct": 2.9, "in_warmup_period": false, "has_anomaly": true, "anomaly_ids": [98] },
        { "period": "2022", "transmission_rate": 1.43, "upstream_pct": 18.2, "downstream_pct": 26.1, "in_warmup_period": false, "has_anomaly": true, "anomaly_ids": [142] },
        { "period": "2026", "transmission_rate": 0.85, "upstream_pct": 5.1, "downstream_pct": 4.3, "in_warmup_period": false, "has_anomaly": false, "anomaly_ids": [] }
      ]
    }
  ],
  "anomaly_density": [
    { "period": "2008", "high_count": 0, "medium_count": 1, "reference_count": 2 },
    { "period": "2020", "high_count": 1, "medium_count": 2, "reference_count": 0 },
    { "period": "2022", "high_count": 3, "medium_count": 1, "reference_count": 0 }
  ]
}
```

> **실제 구현 주의 사항**
> - fixture의 series는 5개 포인트만 포함 (대표 연도). 실제 응답은 전체 기간(예: 2000~2026 = 26개 포인트).
> - wheat는 3구간(A, B, D_prime). 4구간 품목(땅콩·바나나·오렌지)은 C, D 구간 추가.
> - anomaly_density는 이상이 없는 연도는 배열에 미포함.

---

## 7. 완료 기준

feature_dev_list_vN 완료 기준 (2개) + web_plan_vN §4.1 기준 보강:

1. 스트림 뷰(activeTab = "stream") 하단에 미니맵이 64px 높이로 고정 표시됨
2. 전체 기간(actual_from ~ actual_to) 압축 렌더링 확인 — X축이 전체 연도 범위를 커버
3. filterFrom~filterTo 범위가 반투명 파란 박스로 미니맵에 표시됨
4. **핵심** 박스 드래그 완료 시 store filterFrom/filterTo 갱신 → 메인 스트림차트 기간 이동 확인
5. 박스 좌측 핸들 드래그로 filterFrom 조정 확인
6. 박스 우측 핸들 드래그로 filterTo 조정 확인
7. 마우스 휠 줌 시 미니맵 뷰포트 박스 연동 업데이트 확인 (store 통해)
8. 박스를 전체 기간 경계 밖으로 드래그 시 클램프 동작 확인
9. 박스 너비가 3개월 이하로 줄지 않음 (최소 너비 제약)
10. anomaly_density 기반 연도별 색상 밴드 표시 확인 (고신뢰 빨강·중신뢰 주황·참고 연두)
11. VITE_USE_MOCK=true 환경에서 stream_minimap.json 정상 로드 및 렌더링 확인
12. 3구간 품목(wheat)·4구간 품목 fixture 모두 정상 렌더링 (3구간은 C, D 밴드 없음)
13. FE-D3-001: series[] 빈 배열 시 "전체 기간 데이터 없음" fallback 표시
14. FE-D3-003: 컨테이너 숨김→표시 전환(탭 전환 등) 후 미니맵 정상 재렌더링
15. TypeScript: `variant="raw-prices"` prop 타입 정의 완료 (컴파일 오류 없음)

---

## 8. 금지 사항

1. **D3.js 외 시각화 라이브러리 사용 금지**
2. **API 응답값 자체 가공 금지** — transmission_rate 등 분석 수치 재계산 금지
3. **미등록 예외 코드 생성 금지** — exception_spec_vN에 없는 FE-* / PARSE-* 코드 임의 생성 금지
4. **FilterState 외 스토어 상태 수정 금지** — 미니맵은 filterFrom/filterTo만 갱신. selectedAnomalyId, isPanelOpen 등 다른 상태 건드리지 않음
5. **period 파서 혼용 금지** — 미니맵 period는 `d3.timeParse("%Y")`. `/stream`의 `"%Y-%m"` 파서 재사용 금지
6. **박스 범위 초과 허용 금지** — 드래그 시 actual_from ~ actual_to 범위를 벗어나는 filterFrom/filterTo 갱신 금지
7. **raw-prices 실제 마운트 금지 (이 스프린트)** — `variant="raw-prices"` 타입은 정의하되, RawPricesView 마운트는 `feat/fe-raw-timeseries`에서 구현
8. **VITE_USE_MOCK 분기 하드코딩 금지** — `import.meta.env.VITE_USE_MOCK` 환경 변수로만 분기
9. **localStorage / sessionStorage 사용 금지** — frame_spec_frontend_vN §8.10

---

## 9. PR 템플릿

```markdown
## feat/fe-minimap PR

### Feature 명세
`docs/feature_spec_fe-minimap_vN.md` (최신 버전)

### 구현 내용
- [ ] Minimap.tsx — d3.brushX 뷰포트 박스, 전이율 곡선 배경, anomaly_density 밀도 밴드
- [ ] useMinimapData.ts — /stream/minimap React Query 호출 (variant prop 기반 라우팅)
- [ ] MainPage.tsx — Minimap 하단 고정 마운트
- [ ] types/timeseries.ts — MinimapDataPoint, AnomalyDensityItem, MinimapResponse 타입 추가
- [ ] client.ts — /stream/minimap regex 인터셉터 추가
- [ ] stream_minimap.json — wheat 미니맵 fixture (yearly, anomaly_density 3개 연도)

### 완료 기준 체크
- [ ] 미니맵 전체 기간 렌더링 확인 (§7-1, 2)
- [ ] 핸들 드래그 → 메인 그래프 기간 이동 확인 (§7-4)
- [ ] 뷰포트 박스 표시 및 드래그 (§7-3, 4, 5, 6)
- [ ] 줌 연동 확인 (§7-7)
- [ ] anomaly_density 밀도 밴드 표시 (§7-10)
- [ ] FE-D3-001, FE-D3-003 fallback 동작 (§7-13, 14)
- [ ] TypeScript 컴파일 오류 없음

### PM 별건 처리 결과
- [ ] PM 별건 #1 — feature_dev_list `§5.1 → §4.1` 정정 결과 반영
- [ ] PM 별건 #2 — anomaly_density 밀도 밴드 색상·opacity 결재 결과 반영
- [ ] PM 별건 #3 — `/stream/minimap` 응답 `anomaly_nodes` 포함 여부 결재 결과 반영

### 리뷰어 확인 사항
- [ ] d3.brushX 뷰포트 박스가 store filterFrom/filterTo를 정확히 반영하는지
- [ ] brush end 핸들러에서 최소 박스 너비(3개월) 클램프 로직 정확성
- [ ] variant="raw-prices" 타입 정의만 되고 실제 마운트는 없는지 확인
- [ ] stream_minimap.json fixture의 period가 "YYYY" 형식인지 확인
```
