# Feature 명세서 — 레이아웃 + 필터 바

**문서 유형**: Feature 명세서
**기능 번호**: `FE-LAY`
**브랜치명**: `feat/fe-layout-filter`
**담당자**: 하대수
**작성일**: 2026-05-01
**상태**: 초안

**변경 이력**
- v1 (2026-04-30): 최초 작성
- v2 (2026-05-01): v1 자체 검증 결과 11개 항목 반영
  - **타입 정정**: `selectedPatterns: (1|2|3)[]` → `PrimaryPattern[]` (literals.ts·api_spec_v4 표기 일치)
  - **타입 신규**: `SegmentId` literals.ts 추가 항목 명시 (frame 미정의 보완)
  - **수정 대상 추가**: `src/api/client.ts` mock 인터셉터에 `/anomalies/summary` 분기 추가, `src/router/index.tsx`에 `/methodology` 라우트 추가
  - **fixture 분류 정정**: `commodities.json`, `freshness.json`을 신규 → 수정으로 정정. `anomalies_summary.json`만 신규
  - **Banner 동작 보강**: 배지 클릭 시 `selectAnomaly` 동시 호출 + 동일 commodity_id dedup 규칙 명시
  - **신규 디렉토리**: `src/hooks/`, `src/utils/` 신규 생성 명시
  - **호환성 검증**: `activeTab: 'raw' → 'raw-prices'` 영향 범위 검증 결과 기재

---

## ⚠️ 구현 시작 전 필수 확인

> AI 및 구현 담당자는 아래 문서가 **모두 첨부 또는 열람 가능한 상태**인지 확인한 후 구현을 시작한다.
> 하나라도 누락된 경우 구현을 시작하지 않고 PM에게 문서 제공을 요청한다.

| 문서 | 버전 | 참조 목적 | 확인 |
|------|------|-----------|------|
| `api_spec_vN.md §/commodities, §/freshness, §/anomalies/summary` | v4 | 엔드포인트·request·response 필드명 | ☐ |
| `exception_spec_vN.md §2.4 FE-*, §2.3 PARSE-*` | v4 | 이 기능에 해당하는 에러 코드·처리 방침 | ☐ |
| `frame_spec_frontend_vN.md §2` | v3 | 프레임 디렉토리 구조·타입 파일 위치 확인 (CLAUDE.md §3과 불일치 존재 — frame_spec 우선) | ☐ |
| `web_plan_v6.md §3` | v6 | 레이아웃·헤더·배너·필터 바 상세 명세 | ☐ |

---

## 1. 기능 개요

### 1.1 한 줄 요약

프레임 stub 상태인 AppShell·Header·FilterBar를 실제 동작하는 컴포넌트로 구현하고, Banner(이달의 이상 요약)를 신규 생성하며, useAppStore를 필요한 전체 상태로 확장한다.

### 1.2 데이터 흐름

```
GET /commodities
  → useAppStore.commodities (품목 목록 캐시)
  → Header: 주 품목 드롭다운 + 보조 품목 선택
  → FilterBar: 구간 on/off 토글 (선택 품목 segments 기준 동적 렌더링)

GET /freshness
  → useAppStore.freshness
  → Header: 데이터 기준 시점 칩
  → FilterBar: 기간 프리셋 계산 기준월(data_up_to)

GET /anomalies/summary
  → Banner: 이달의 이상 품목 배지(commodity_id dedup 후) + 증감 표시 + 배지 클릭 액션

useAppStore (selectedCommodityId, secondaryCommodityId, periodPreset, fromMonth, toMonth,
             selectedGrades, selectedPatterns, activeSegments, selectedEventKeys, activeTab, layoutNumber)
  → Header, FilterBar, Banner 렌더링 제어
  → 후속 feat/* 시각화 컴포넌트가 이 상태를 읽어 API 호출 파라미터로 사용
```

### 1.3 프레임 내 위치

> 본 표는 `frame_spec_frontend_v3 §2` 실제 frame 구조 기준으로 작성한다.
> CLAUDE.md §3은 머지 미반영 stale 상태이므로 **frame_spec 우선**. CLAUDE.md §3 동기화는 별도 단독 커밋으로 처리한다 (§9 PR 기타 참조).

| 구분 | 경로 | 작업 내용 |
|------|------|-----------|
| 수정 | `src/stores/useAppStore.ts` | CommodityState에 `secondaryCommodityId` 추가; FilterState 전면 확장; ViewState `activeTab` 타입 교정 (`'raw'` → `'raw-prices'`); OverlayState에 `layoutNumber` 추가 |
| 수정 | `src/types/literals.ts` | `SegmentId` 신규 (`'A'\|'B'\|'C'\|'D'\|'D_prime'`), `PeriodPreset` 신규, `ViewTab` 신규 추가. `commodity.ts`의 `segments: string[]`를 `SegmentId[]`로 좁히는 작업 동반 |
| 수정 | `src/api/client.ts` | mock 인터셉터의 url 분기에 `/anomalies/summary` 추가 (기존 4개 엔드포인트와 동일 패턴) |
| 수정 | `src/router/index.tsx` | `/methodology` 라우트 추가. element는 `MethodologyView` placeholder (실제 구현은 `feat/fe-methodology-tab`) |
| 수정 | `src/components/layout/AppShell.tsx` | Banner 마운트 추가, 실제 2컬럼 레이아웃 (메인 시각화 영역 + 패널 사이드) 구성 |
| 수정 | `src/components/layout/Header.tsx` | 품목 드롭다운, 보조 품목 버튼, 뷰 탭 Zustand 연결, 방법론 탭(React Router 이동), 기준 시점 칩 구현 |
| 수정 | `src/components/layout/FilterBar.tsx` | 기간 프리셋 6종, 사건 토글 드롭다운, 신뢰도·패턴 필터, 구간 on/off 토글 구현 |
| 수정 | `src/fixtures/commodities.json` | 배너 dedup·드롭다운 클러스터 그룹·이상 배지 검증을 위한 필드값 보강 (10종 유지) |
| 수정 | `src/fixtures/freshness.json` | `data_up_to`, `next_run_date`, `last_updated` 갱신 |
| 신규 | `src/components/layout/Banner.tsx` | 이달의 이상 요약 배너 |
| 신규 | `src/hooks/` (폴더) + `useCommodities.ts`, `useFreshness.ts`, `useAnomaliesSummary.ts` | React Query 훅 3종. 폴더 자체 신규 생성 |
| 신규 | `src/utils/` (폴더) + `dateUtils.ts` | `YYYY-MM` 파싱·포맷·`subtractMonths(yyyymm, n)` 등. 폴더 자체 신규 생성 |
| 신규 | `src/fixtures/anomalies_summary.json` | GET /anomalies/summary mock 응답 (`total_count > 0` 케이스) |
| 신규 | `src/fixtures/anomalies_summary_empty.json` | 이상 없는 달 케이스 (`total_count: 0`) |
| 신규 | `src/pages/MethodologyPage.tsx` | placeholder 페이지. 실제 구현은 `feat/fe-methodology-tab` |

### 1.4 구현 범위 및 비구현 범위

| 구분 | 내용 |
|------|------|
| **구현** | AppShell 실제 레이아웃 (Banner + Header + FilterBar + 메인 영역 + Panel), Header (품목 드롭다운·보조 품목·뷰 탭·방법론 라우팅·기준 시점 칩), Banner (이달의 이상 요약 배지·증감·배지 클릭), FilterBar (기간 프리셋 6종·사건 토글 드롭다운·신뢰도·패턴·구간 토글), useAppStore 확장, `/methodology` 라우트 placeholder |
| **비구현** | 스트림 그래프·산점도·원시 시계열 차트 구현, 분석 수치 패널 내부 구현, 방법론 뷰 내부 구현, 온보딩 가이드, MethodologyPage 본문 |
| **선행 조건** | `frame/frontend` → `develop` PR #1 머지 완료 |

---

## 2. 입력 데이터

| 출처 | 엔드포인트 | 사용 필드 | 타입 | 비고 |
|------|-----------|-----------|------|------|
| API 응답 | `GET /commodities` | `commodities[].commodity_id`, `name_kr`, `cluster`, `has_wholesale`, `route_type`, `segments`, `analysis_start`, `has_anomaly_this_month`, `latest_anomaly_grade` | 배열 | 품목 드롭다운 + 구간 토글 + 배너 배지 색상 |
| API 응답 | `GET /freshness` | `data_up_to`, `next_run_date` | `YYYY-MM`, `YYYY-MM-DD` | Header 기준 시점 칩 + 기간 프리셋 계산 기준 |
| API 응답 | `GET /anomalies/summary` | `reference_month`, `total_count`, `prev_month_count`, `count_diff`, `anomalies[].anomaly_id`, `.commodity_id`, `.commodity_name_kr`, `.confidence_grade`, `.is_new` | 혼합 | Banner 전용 |

### 2.1 타입 변환 규칙

해당 없음. API 응답값을 그대로 렌더링한다. 단, `/anomalies/summary` 응답 배열은 Banner 렌더링 직전 클라이언트에서 `commodity_id` 기준 dedup (§3.2 Banner 항목 참조).

---

## 3. 출력 데이터

### 3.1 useAppStore 확장 명세

기존 `selectedEventKey: string | null` 필드를 **제거**하고 `selectedEventKeys: string[]`로 교체한다.

**CommodityState 추가**

| 필드 | 타입 | 초기값 | 설명 |
|------|------|--------|------|
| `secondaryCommodityId` | `string \| null` | `null` | 보조 품목 ID |
| `setSecondaryCommodity` | `(id: string \| null) => void` | — | 보조 품목 설정 액션 |

**FilterState 변경·추가**

| 필드 | 타입 | 초기값 | 변경 사항 |
|------|------|--------|-----------|
| `selectedGrades` | `ConfidenceGrade[]` | `['high', 'medium']` | 유지 |
| `selectedEventKeys` | `string[]` | `[]` | `selectedEventKey: string \| null` 교체 (단일 → 복수) |
| `fromMonth` | `string \| null` | `null` | 유지 |
| `toMonth` | `string \| null` | `null` | 유지 |
| `periodPreset` | `PeriodPreset` (literals.ts 신규) | `'3yr'` | 신규 |
| `activeSegments` | `SegmentId[]` (literals.ts 신규) | `[]` | 신규. 품목 선택 시 해당 품목 `segments`로 초기화 |
| `selectedPatterns` | `PrimaryPattern[]` (literals.ts 기존) | `[]` | 신규. 빈 배열 = 전체 패턴 표시. **API 응답 `primary_pattern: "pattern2"` 표기와 일치** |
| `setPeriodPreset` | `(preset: PeriodPreset) => void` | — | 신규 액션 |
| `setActiveSegments` | `(segments: SegmentId[]) => void` | — | 신규 액션 |
| `setSelectedPatterns` | `(patterns: PrimaryPattern[]) => void` | — | 신규 액션 |
| `setEventKeys` | `(keys: string[]) => void` | — | `setEventKey` 교체 |

**ViewState 타입 교정**

기존 `activeTab: 'stream' | 'raw' | 'scatter'`를 CLAUDE.md §7 / API 엔드포인트 명명과 정렬한다.

| 필드 | 기존 타입 | 변경 후 타입 |
|------|-----------|-------------|
| `activeTab` | `'stream' \| 'raw' \| 'scatter'` | `ViewTab` (= `'stream' \| 'scatter' \| 'raw-prices'`, literals.ts 신규) |

> **`'raw'` 리터럴 영향 범위 검증**: frame 전체에서 `'raw'` 리터럴 사용처는 `src/stores/useAppStore.ts` 단일 파일. 다른 컴포넌트에서 참조하지 않으므로 교체로 인한 외부 영향 없음. (검증 방법: `Grep "'raw'"`)
>
> 방법론 탭은 별도 라우트(`/methodology`)로 이동하므로 Zustand 상태에 포함하지 않는다.

**OverlayState 추가**

| 필드 | 타입 | 초기값 | 설명 |
|------|------|--------|------|
| `layoutNumber` | `1 \| 2 \| 3 \| 4 \| 5 \| 6` | `1` | 원시 시계열 레이아웃 번호 (`feat/fe-raw-timeseries`에서 사용) |
| `setLayoutNumber` | `(n: 1 \| 2 \| 3 \| 4 \| 5 \| 6) => void` | — | 레이아웃 선택 액션 |

**`src/types/literals.ts` 신규 추가 타입**

```typescript
export const SEGMENT_IDS = ['A', 'B', 'C', 'D', 'D_prime'] as const;
export type SegmentId = (typeof SEGMENT_IDS)[number];

export const PERIOD_PRESETS = ['3mo', '6mo', '1yr', '3yr', '5yr', 'all'] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export const VIEW_TABS = ['stream', 'scatter', 'raw-prices'] as const;
export type ViewTab = (typeof VIEW_TABS)[number];
```

**`src/types/commodity.ts` 좁히기**

```typescript
// AS-IS
segments: string[];
// TO-BE
segments: SegmentId[];
```

### 3.2 컴포넌트 렌더링 명세

**Banner — `commodity_id` dedup 규칙**

API 응답 `anomalies[]`은 per-anomaly 배열이지만 배너는 품목 단위로 표시한다 (web_plan_v6 §3.2 "이상 탐지 품목명 + 신뢰도 배지").

| 단계 | 규칙 |
|------|------|
| 1. 그룹화 | `commodity_id` 기준 그룹핑 |
| 2. 대표 등급 | 그룹 내 `confidence_grade` 최고 등급 (`high` > `medium` > `reference`) 채택 |
| 3. 대표 anomaly_id | 그룹 내 동일 최고 등급 행 중 `is_new: true` 우선, 다음으로 가장 늦은 `period`(YYYY-MM 사전 정렬) 행의 `anomaly_id` 채택 |
| 4. NEW 배지 | 그룹 내 `is_new: true`가 1개 이상이면 표시 |

**Banner 렌더링 규칙**

| 조건 | 렌더링 |
|------|--------|
| `total_count === 0` | "이번 달 탐지된 이상이 없습니다" 표시. 배지 없음 |
| `total_count > 0` | dedup 후 품목 배지 나열. 배지 색상은 대표 등급 따름 |
| `count_diff > 0` | "지난달보다 {N}건 증가" (강조 텍스트) |
| `count_diff < 0` | "지난달보다 {N}건 감소" |
| `count_diff === 0` | "지난달과 동일" |
| 배지 클릭 | `selectCommodity(commodity_id)` + `selectAnomaly(대표 anomaly_id)` **동시 호출**. (web_plan §3.2 "해당 품목·최신 이상 시점으로 자동 이동 + 분석 수치 패널 자동 오픈") |

**Header — 품목 드롭다운**

- 클러스터 구분선 포함. 순서: `grain` → `oil_sugar` → `tropical` → `livestock` → `independent`
- `has_anomaly_this_month: true` 품목에 `latest_anomaly_grade` 색상 배지 표시
  - `high`: `#e24b4a`, `medium`: `#ef9f27`, `reference`: `#c8d850`
- 보조 품목 드롭다운에서 주 품목과 동일 품목 선택 불가 (동일 시 무시)
- 품목 변경 시 `activeSegments`를 새 품목의 `segments` 전체로 초기화

**Header — 데이터 기준 시점 칩**

- `data_up_to: "2026-03"` → `"2026년 3월 기준"`
- `next_run_date: "2026-04-15"` → `"다음 갱신 4월 15일 예정"`
- 로딩 중: 점 placeholder 유지 (frame stub 스타일)

**FilterBar — 기간 프리셋**

프리셋 클릭 시 `setPeriodPreset(preset)` + `setDateRange(from, to)` 동시 호출.

| 프리셋 | `from` 계산 | `to` 계산 |
|--------|-------------|-----------|
| `'3mo'` | `subtractMonths(data_up_to, 3)` | `freshness.data_up_to` |
| `'6mo'` | `subtractMonths(data_up_to, 6)` | `freshness.data_up_to` |
| `'1yr'` | `subtractMonths(data_up_to, 12)` | `freshness.data_up_to` |
| `'3yr'` | `subtractMonths(data_up_to, 36)` | `freshness.data_up_to` |
| `'5yr'` | `subtractMonths(data_up_to, 60)` | `freshness.data_up_to` |
| `'all'` | `null` (API가 `analysis_start` 기본값 사용) | `null` |

`subtractMonths()`는 `src/utils/dateUtils.ts`에 신규 정의. `freshness` 미로드 시 현재 월(`new Date()`) 기반 fallback.

**FilterBar — 사건 필터 드롭다운**

이벤트 목록은 CLAUDE.md §12 기준 5개 항목 하드코딩. (API `/events` 연동은 `feat/fe-api-connect` 단계에서 전환)

| 항목 | key 값 | 표시 기간 |
|------|--------|-----------|
| 2008 금융위기 | `financial_crisis_2008` | 2008.07~2009.03 |
| 2020 코로나19 | `covid19_2020` | 2020.02~2021.06 |
| 2021~22 브라질 서리 | `brazil_frost_2021` | 2021.07~2022.03 |
| 2022 우크라이나 사태 | `ukraine_2022` | 2022.02~2022.10 |
| 2022 인도네시아 팜유 수출 규제 | `indonesia_palmoil_2022` | 2022.04~2022.05 |

- 드롭다운 닫기: 외부 클릭 또는 ESC 키
- "선택 해제" 버튼: `setEventKeys([])` 호출

**FilterBar — 신뢰도 필터 (라디오 3택1)**

| 옵션 | `selectedGrades` 값 |
|------|---------------------|
| 고신뢰만 | `['high']` |
| 고신뢰+중신뢰 (기본값) | `['high', 'medium']` |
| 전체 | `['high', 'medium', 'reference']` |

**FilterBar — 패턴 필터 (4택1)**

| 옵션 | `selectedPatterns` 값 |
|------|----------------------|
| 패턴 1 | `['pattern1']` |
| 패턴 2 | `['pattern2']` |
| 패턴 3 | `['pattern3']` |
| 전체 (기본값) | `[]` |

**FilterBar — 구간 on/off 토글**

- 표시 대상: `commodities[selectedCommodityId].segments` 목록
- `has_wholesale: false` 품목: 구간 C·D 토글 미표시
- 토글 OFF 시 해당 `SegmentId`를 `activeSegments`에서 제거

### 3.3 mock 인터셉터 분기 추가

`src/api/client.ts`의 기존 mock 인터셉터(L23~46)에 `/anomalies/summary` 분기를 추가한다.

```typescript
// 추가 import
import anomaliesSummaryFixture from '@/fixtures/anomalies_summary.json';

// 인터셉터 url 분기에 추가
} else if (url === '/anomalies/summary') {
  data = anomaliesSummaryFixture;
}
```

빈 케이스(`total_count: 0`) 검증은 `anomalies_summary_empty.json`을 임시로 import 교체하여 수동 테스트한다 (자동 분기 미구현, `feat/fe-api-connect`에서 정식 처리).

---

## 4. 파라미터 제약 조건

해당 없음. settings.py 파라미터 없음.

환경 변수:

| 변수 | 값 | 동작 |
|------|----|------|
| `VITE_USE_MOCK` | 미설정 또는 `'false'` 외 모든 값 | `src/fixtures/*.json` fixture 사용 (frame 기본 동작: `import.meta.env.VITE_USE_MOCK !== 'false'`) |
| `VITE_USE_MOCK` | `'false'` | 실제 API 호출 |

---

## 5. 예외처리

### 5.1 적용 예외 코드

| 예외 코드 | 발생 조건 | 처리 방침 |
|-----------|-----------|-----------|
| `FE-API-001` | `/commodities`, `/freshness`, `/anomalies/summary` 네트워크 실패 | FE_TOAST ("데이터를 불러오지 못했습니다.") + 재시도 버튼. React Query `retry: 3` |
| `FE-API-002` | 기간 범위 오류 등 400 응답 | FE_TOAST (사용자 입력 오류 안내) |
| `FE-API-003` | 404 응답 (`COMMODITY_NOT_FOUND` 등) | FE_FALLBACK (빈 상태 UI: "데이터가 없습니다.") |
| `FE-API-004` | 500 응답 | FE_BLOCK (에러 UI). ErrorBoundary로 전파 방지 |
| `FE-STORE-001` | Zustand 상태 hydration 실패 | FE_FALLBACK (초기 상태로 복구) |
| `FE-STORE-002` | `selectedCommodityId`가 `/commodities` 응답 목록에 없음 | FE_TOAST + `selectedCommodityId` 초기화 (`null`) |
| `FE-MOCK-001` | `VITE_USE_MOCK` 비활성 외 상태에서 fixture 파일 없음 | FE_BLOCK (개발환경 전용) |
| `PARSE-DATE-002` | `/freshness` `data_up_to`, `next_run_date` 등 `YYYY-MM` 파싱 실패 | FE_FALLBACK (placeholder 유지) |
| `PARSE-ENUM-002` | `latest_anomaly_grade`, `cluster`, `confidence_grade` 등이 literals.ts union 외 값 | FE_TOAST + 해당 항목 무시 |

---

## 6. 목업 및 실제 데이터 전환 조건

| 항목 | 내용 |
|------|------|
| 테스트 품목 | `wheat` (3구간, has_wholesale: false), `banana` (4구간, has_wholesale: true) |
| 테스트 기간 | fixture 기준 `2000-01` ~ `2026-03` (임시값) |
| 특수 케이스 | Banner `total_count = 0` (이상 없는 달), `count_diff` 양·음·0 케이스, 3구간 품목 구간 C·D 미표시, 보조 품목 동일 품목 선택 방지, 동일 commodity_id의 멀티 segment anomaly dedup |
| 목업 파일 위치 | `src/fixtures/commodities.json` (수정), `src/fixtures/freshness.json` (수정), `src/fixtures/anomalies_summary.json` (신규), `src/fixtures/anomalies_summary_empty.json` (신규) |
| 더미 → 실제 전환 트리거 | `VITE_USE_MOCK=false` + `feat/fe-api-connect` dev 머지 완료 후 |

**fixture 검증 포인트**

- `commodities.json`: 10종 전체 포함. 클러스터 그룹별 최소 1종, `has_anomaly_this_month` true/false 혼재, `latest_anomaly_grade` 3등급 모두 등장
- `freshness.json`: `data_up_to: "2026-03"`, `next_run_date: "2026-04-15"`, `last_updated: "2026-04-01T03:00:00Z"`
- `anomalies_summary.json`: `total_count >= 5`, 동일 `commodity_id` 멀티 segment 케이스 1건 이상 (dedup 검증), `is_new` true/false 혼재
- `anomalies_summary_empty.json`: `total_count: 0`, `prev_month_count: 0`, `count_diff: 0`, `anomalies: []`

---

## 7. 완료 기준

| 항목 | 기준 |
|------|------|
| 품목 드롭다운 | 10종 목록 표시, 클러스터 구분선 포함, 이상 배지 표시, 선택 시 `selectedCommodityId` 변경 + `activeSegments` 초기화 확인 |
| 보조 품목 | "비교 추가 +" 클릭 → 드롭다운 열림, 선택 시 `secondaryCommodityId` 설정, 주 품목과 동일 선택 방지 확인 |
| 뷰 탭 | 흐름 보기·전달 구조·원시 시계열 3개 탭 클릭 시 `activeTab` 변경 확인. 방법론 탭 클릭 시 `/methodology` 라우트 이동 확인 |
| 기준 시점 칩 | fixture `data_up_to`·`next_run_date` 기준 텍스트 렌더링 확인 |
| 배너 렌더링 | `total_count > 0`: dedup된 품목 배지·증감 텍스트 표시. `total_count = 0`: "이상 없음" 메시지. 배지 클릭 시 `selectCommodity` + `selectAnomaly` 동시 호출 확인 |
| 배너 dedup | 동일 commodity_id 멀티 segment 케이스에서 배지 1개만 표시, 대표 등급·anomaly_id 선택 규칙 §3.2 일치 확인 |
| 기간 프리셋 | 6개 버튼 클릭 시 `periodPreset` + `fromMonth`/`toMonth` 동시 갱신 확인. `from` 계산이 `data_up_to` 기준 정확함 확인 |
| 사건 필터 | "사건 ▾" 클릭 → 드롭다운 열림, 복수 선택 시 `selectedEventKeys` 갱신, "선택 해제" 버튼 동작, 외부 클릭·ESC 시 닫힘 확인 |
| 신뢰도 필터 | 3개 옵션 선택 시 §3.2 정의 값으로 `selectedGrades` 갱신 확인 |
| 패턴 필터 | 4개 옵션 선택 시 §3.2 정의 값(`'pattern1'` 등 문자열)으로 `selectedPatterns` 갱신 확인 |
| 구간 토글 | 3구간 품목: A·B·D_prime 3개만 표시. 4구간 품목: A·B·C·D 4개 표시. 토글 시 `activeSegments` 갱신 확인 |
| 타입 정합 | literals.ts에 `SegmentId`, `PeriodPreset`, `ViewTab` 신규 정의, `commodity.ts` `segments: SegmentId[]` 좁히기 적용, `useAppStore` `activeTab` 타입이 `ViewTab` |
| mock 인터셉터 | `/anomalies/summary` 호출 시 fixture 응답 정상 반환 확인 |
| 라우터 | `/methodology` 라우트 진입 시 placeholder 페이지 렌더링 확인 |
| 예외처리 | §5.1 예외 코드 발생 시 정의된 방침대로 처리 확인 |
| 목업 실행 | 기본 환경 (`VITE_USE_MOCK` 미설정 = mock 활성) 로컬 실행 오류 없음, fixture 데이터 정상 렌더링 확인 |
| 후속 선행 조건 | `feat/fe-raw-timeseries` 착수 가능 (`layoutNumber` 상태 사용 가능) |

---

## 8. 금지 사항

| 금지 사항 | 이유 |
|-----------|------|
| D3.js 외 시각화 라이브러리 추가 | CLAUDE.md §15 절대 금지 |
| API 응답값 자체 가공·재계산 | CLAUDE.md §15 절대 금지 (단, Banner dedup은 표시 단위 변환이며 분석값 재계산 아님) |
| `exception_spec_v4.md` 미등록 예외 코드 생성 | `(proposed)` 표식으로 PM 제안 후 확정 전까지 임의 코드 금지 |
| `has_wholesale: false` 품목에 구간 C·D 토글 표시 | CLAUDE.md §15 절대 금지 |
| 이벤트 데이터를 시계열 응답에서 추출 | `/events` 별도 호출 원칙. 이 단계에서는 §3.2 5개 하드코딩 허용 |
| `VITE_USE_MOCK` 환경 변수 하드코딩 | 환경 변수로만 분기 |
| `setEventKey` (단수) 신규 사용 | `setEventKeys` (복수)로 교체됨 — 단수 함수 삭제 |
| `selectedPatterns`에 숫자 리터럴 사용 (`1, 2, 3`) | API 응답·literals.ts 표기는 `'pattern1'`, `'pattern2'`, `'pattern3'` 문자열. 숫자 사용 시 타입 드리프트 |

---

## 9. Pull Request 템플릿

```markdown
## 개요
- **브랜치**: feat/fe-layout-filter
- **기능 번호**: FE-LAY
- **Feature 명세**: `docs/feature_spec_FE-LAY_v2.md`
- **담당자**: 하대수

## 구현 완료 항목
Feature 명세 §7 완료 기준 기준으로 체크한다.
- [ ] 기능 완성: AppShell·Header·Banner·FilterBar 전 컴포넌트 구현 완료
- [ ] useAppStore 확장 (secondaryCommodityId, periodPreset, activeSegments, selectedPatterns, selectedEventKeys, layoutNumber)
- [ ] literals.ts 신규 타입 추가 (SegmentId, PeriodPreset, ViewTab) + commodity.ts segments 좁히기
- [ ] mock 인터셉터에 /anomalies/summary 분기 추가
- [ ] /methodology 라우트 placeholder 추가
- [ ] hooks/, utils/ 폴더 신규 생성
- [ ] 예외처리 구현 (FE-API-001, FE-API-002, FE-API-003, FE-API-004, FE-STORE-001, FE-STORE-002, FE-MOCK-001, PARSE-DATE-002, PARSE-ENUM-002)
- [ ] 목업 실행 성공 (기본 mock 활성)
- [ ] 결과 명세 `docs/results/FE-LAY.md` 작성

## 필드명 일치 확인
- [ ] `api_spec_v4.md` JSON 키 ↔ TypeScript 타입 필드명 일치
- [ ] `selectedPatterns` 값이 `'pattern1'|'pattern2'|'pattern3'` 문자열 사용 (숫자 미사용)
- 불일치 항목: {없음 / 목록}

## 예외처리 범위
- 구현한 예외 코드: FE-API-001, FE-API-002, FE-API-003, FE-API-004, FE-STORE-001, FE-STORE-002, FE-MOCK-001, PARSE-DATE-002, PARSE-ENUM-002
- 신규 제안 코드: 없음

## 로컬 실행 증빙
{스크린샷: 품목 드롭다운, 필터 바, 배너 렌더링, /methodology placeholder}

## 리뷰어 확인 요청 사항
- `selectedEventKey` → `selectedEventKeys` 교체로 인한 기존 코드 드리프트 없음 확인
- `activeTab` 타입 교정 (`'raw'` → `'raw-prices'`) 영향: useAppStore.ts 단일 파일 외 영향 없음 확인
- Banner dedup 규칙(§3.2) 구현 일치 확인
- `commodity.ts` `segments: string[] → SegmentId[]` 좁히기로 인한 타입 에러 없음 확인

## 기타
- **CLAUDE.md §3 동기화 별도 작업**: 본 PR과 별개로 `[CLAUDE.md] Sync §3 directory structure with frame_spec_v3` 단독 커밋 필요. PM 이슈 보고 후 처리 예정.
- frame_spec_v3 ↔ CLAUDE.md §3 불일치는 frame 머지 시점부터 존재. 본 feat에서는 frame_spec 기준으로 작업.
```
