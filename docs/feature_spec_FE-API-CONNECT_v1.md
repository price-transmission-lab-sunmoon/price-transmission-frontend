# Feature 명세서 — API 실연결 및 전역 에러 처리 인프라

**문서 유형**: Feature 명세서  
**기능 번호**: `FE-API-CONNECT`  
**브랜치명**: `feat/fe-api-connect`  
**담당자**: 하대수  
**작성일**: 2026-05-07  
**상태**: 초안  

**변경 이력**
- v1 (2026-05-07): 최초 작성

---

## ⚠️ 구현 시작 전 필수 확인

| 문서 | 버전 | 참조 목적 | 확인 |
|------|------|-----------|------|
| `api_spec_vN.md §공통사항, §/freshness, §/anomalies/summary, §에러코드` | 최신(`docs_manifest.md` 조회) | 엔드포인트·response 필드명·에러 envelope | ☐ |
| `exception_spec_vN.md §FE-API-*, §FE-MOCK-001` | 최신(`docs_manifest.md` 조회) | 에러 코드·처리 방침 | ☐ |
| `frame_spec_frontend_vN.md §8.1 Mock 정책` | 최신(`docs_manifest.md` 조회) | client.ts MOCK_ROUTES 배열 패턴 | ☐ |
| `web_plan_vN.md §3.2, §3.3` | 최신(`docs_manifest.md` 조회) | 이달의 이상 요약 배너·데이터 기준 시점 칩 UX | ☐ |

> **버전 해석**: 문서명의 `vN`은 `docs/docs_manifest.md` SoT에서 해당 문서의 현재 최신 버전 번호를 조회한다.

---

## ⚠️ Action Items — 미결 불일치 항목

| 항목 | 현황 | 근거 |
|------|------|------|
| Toast 컴포넌트 위치 | `frame_spec §2` 디렉토리에 `components/ui/` 언급 없음. `components/layout/`만 명시 | 전역 UI이므로 `src/components/ui/Toast.tsx` 신규 디렉토리 생성. PM 이견 없으면 이 방식 채택 |
| `freshness` Zustand 저장 여부 | `useAppStore.ts` OverlayState에 `freshness: Freshness \| null` + `setFreshness()` 이미 존재 | `useFreshness()` 훅 내부에서 `setFreshness()` 병행 호출 여부는 선택. 본 명세는 React Query 상태만 사용하고 `setFreshness`는 다른 컴포넌트가 store에서 직접 읽어야 할 때 사용 |
| `useCommodities.ts` 존재 여부 | `frame_spec §3` hooks 목록에 미포함. `feat/fe-layout-filter`에서 작성됐을 수 있음 | 이 브랜치에서 중복 생성 금지 — 통합 전 확인 |
| TanStack Query 버전 | v4·v5 `QueryCache onError` API 다름 | 구현 시 `package.json`의 `@tanstack/react-query` 버전 확인 후 적용. 본 명세는 v5 기준 |

---

## 1. 기능 개요

### 1.1 한 줄 요약

`VITE_USE_MOCK=false` 실연결 전환에 필요한 전역 React Query 설정·Toast 에러 처리 UI·`FreshnessChip`·`AnomalySummaryBanner` 연동을 완성하여, 모든 `feat/*` 브랜치의 API 호출이 실제 백엔드로 정상 연결되는 통합 인프라를 구축한다.

### 1.2 이 브랜치가 담당하는 범위

| 영역 | 내용 |
|------|------|
| 전역 QueryClient 설정 | retry·refetchOnWindowFocus·gcTime 기본값 + QueryCache onError 연결 |
| Toast UI | `Toast.tsx` — FE-API-* / WHOLESALE_NOT_AVAILABLE 전역 토스트 |
| `/freshness` 연동 | `useFreshness.ts` + `FreshnessChip.tsx` → `Header.tsx`에 마운트 |
| `/anomalies/summary` 연동 | `useAnomaliesSummary.ts` + `AnomalySummaryBanner.tsx` → `AppShell.tsx`에 마운트 |
| Mock fixture 완전 등록 | `MOCK_ROUTES`에 18개 엔드포인트 모두 등록 완료 확인 체크리스트 |
| 환경 전환 절차 | `VITE_USE_MOCK=false` 전환 체크리스트 |
| 통합 테스트 | 18개 엔드포인트 기본 연결 확인 |

**이 브랜치에서 담당하지 않는 것**:
- `/stream`, `/scatter`, `/raw-prices`, `/anomalies/*`, `/meta/*` 각 시각화 연동 → 각 feat 브랜치 완성
- `/segments`, `/events` 연동 → `feat/fe-layout-filter` 완성
- `/commodities` 드롭다운 전체 UI → `feat/fe-layout-filter` 완성

### 1.3 데이터 흐름

```
App.tsx
  └─ QueryClientProvider (QueryClient 전역 설정)
       └─ QueryCache.onError → showToast() 발화

AppShell.tsx
  ├─ Toast.tsx                   ← window 이벤트 버스 수신
  ├─ AnomalySummaryBanner.tsx    ← useAnomaliesSummary() → GET /anomalies/summary
  └─ Header.tsx
       └─ FreshnessChip.tsx      ← useFreshness() → GET /freshness
```

### 1.4 의존 브랜치

이 브랜치는 모든 `feat/*` 브랜치가 dev에 머지된 후 마지막으로 통합 테스트를 수행한다.  
단, `FreshnessChip`·`AnomalySummaryBanner`·`Toast` 컴포넌트는 다른 브랜치와 독립적으로 선행 개발 가능.

---

## 2. 환경 설정

### 2.1 환경 변수

```dotenv
# .env.example
VITE_USE_MOCK=true          # true: fixture 사용 / false: 실 백엔드 호출
VITE_API_BASE_URL=          # 실연결 시 필수. 예: http://localhost:8000/api/v1
```

> `VITE_API_BASE_URL`이 비어 있으면 `client.ts`가 `baseURL: ''`로 설정 → 동일 출처 요청.  
> Docker Compose 환경에서는 Nginx 리버스 프록시가 `/api/v1`을 백엔드로 전달.

### 2.2 Mock → 실연결 전환 절차

| 단계 | 내용 | 확인 |
|------|------|------|
| 1 | `.env.local` 생성: `VITE_USE_MOCK=false` + `VITE_API_BASE_URL=<백엔드 URL>` | ☐ |
| 2 | 백엔드 서버 기동 확인: `GET /api/v1/commodities` → 200 | ☐ |
| 3 | 브라우저 콘솔에 CORS 에러 없음 확인 | ☐ |
| 4 | `vite dev` 재기동 (환경 변수 반영) | ☐ |
| 5 | §8 통합 테스트 체크리스트 100% 통과 | ☐ |

### 2.3 CORS 정책

`api_spec_v4 §공통사항`: 인증 없음 (1차 출시 기준). CORS 설정은 백엔드(FastAPI) 담당.  
프론트엔드 `client.ts`에서는 `withCredentials: false` (기본값) 유지. 별도 CORS 헤더 추가 금지.

---

## 3. 전역 React Query 설정

### 3.1 QueryClient 설정 (`App.tsx`)

```typescript
import { QueryClient, QueryClientProvider, QueryCache } from '@tanstack/react-query';
import { showToast } from '@/components/ui/Toast';
import { handleQueryError } from '@/api/error';   // §4.2 참조

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      handleQueryError(error, query);
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      retryDelay: 1000,
      refetchOnWindowFocus: false,
      staleTime: 0,
    },
  },
});
```

| 옵션 | 값 | 근거 |
|------|-----|------|
| `retry` | `1` | 네트워크 불안정 시 1회 자동 재시도. 과도한 재시도로 인한 지연 방지 |
| `retryDelay` | `1000` ms | 1초 대기 후 재시도 |
| `refetchOnWindowFocus` | `false` | 월별 배치 갱신 데이터 → 탭 전환마다 재조회 불필요 |
| `staleTime` | `0` | 기본값. 정적 데이터 훅은 개별 override |

### 3.2 개별 훅의 staleTime 재정의 목록

| 훅 | staleTime | 근거 |
|----|-----------|------|
| `useFreshness` | `60_000` (1분) | 월별 갱신. 화면 내내 동일 값 |
| `useAnomaliesSummary` | `60_000` (1분) | 월별 갱신 데이터 |
| `usePipelineData`, `useAnalysisParams` | `3_600_000` (1시간) | 정적 데이터 (`ETag` 캐싱 병행) |
| 시계열 훅 전체 | `0` (기본) | 필터 변경 → 즉시 재조회 필요 |

---

## 4. 전역 Toast 에러 처리

### 4.1 Toast 컴포넌트

**위치**: `src/components/ui/Toast.tsx`  
**마운트**: `AppShell.tsx` 최상단

Toast 상태는 Zustand에 추가하지 않고, `Toast.tsx` 내부 지역 `useState`로 관리.  
외부 발화는 **CustomEvent 버스** 패턴으로 구현:

```typescript
// Toast.tsx — 이벤트 수신 (컴포넌트 내부)
useEffect(() => {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<ToastDetail>).detail;
    // 토스트 큐에 추가
  };
  window.addEventListener('fe-toast', handler);
  return () => window.removeEventListener('fe-toast', handler);
}, []);

// Toast.tsx — 외부 발화 헬퍼 (named export)
export function showToast(detail: ToastDetail): void {
  window.dispatchEvent(new CustomEvent('fe-toast', { detail }));
}
```

### 4.2 ToastDetail 타입

```typescript
interface ToastDetail {
  code: string;             // ApiError.code 또는 FE-* 코드
  message: string;          // 사용자에게 표시할 한국어 메시지
  variant: 'error' | 'warning' | 'info';
  onRetry?: () => void;     // 재시도 버튼 클릭 핸들러
  duration?: number;        // ms, 기본 4000
}
```

### 4.3 에러 코드별 Toast 규칙

`handleQueryError(error, query)` 함수 (`src/api/error.ts`에 추가):

| 조건 | variant | 메시지 | 재시도 버튼 |
|------|---------|--------|-------------|
| `ApiError` 아님 (NETWORK_ERROR, 타임아웃 등) | `error` | "서버에 연결할 수 없습니다. 네트워크를 확인해 주세요." | ✔ |
| Axios timeout (`code === 'ECONNABORTED'`) | `error` | "요청 시간이 초과되었습니다. 다시 시도해 주세요." | ✔ |
| `WHOLESALE_NOT_AVAILABLE` (400) | `warning` | "해당 품목은 도매가 데이터가 없습니다. 레이아웃 1로 전환됩니다." | ✘ |
| 404계열 코드¹ | — | Toast 없음 (FE_FALLBACK UI) | ✘ |
| 500계열 코드² | `error` | "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." | ✔ |
| 기타 400계열 | `warning` | `잘못된 요청입니다. ({error.code})` | ✘ |

> ¹ 404계열: `COMMODITY_NOT_FOUND`, `ANOMALY_NOT_FOUND`, `ML_MAP_NOT_READY`, `WARMUP_PERIOD_ONLY`  
> ² 500계열: `PIPELINE_DATA_MISSING` 및 HTTP 500 응답

```typescript
// src/api/error.ts 에 추가
import type { Query } from '@tanstack/react-query';
import { showToast } from '@/components/ui/Toast';

const CODES_404 = new Set([
  'COMMODITY_NOT_FOUND', 'ANOMALY_NOT_FOUND',
  'ML_MAP_NOT_READY', 'WARMUP_PERIOD_ONLY',
]);

export function handleQueryError(error: unknown, query: Query): void {
  const refetch = () => queryClient.refetchQueries({ queryKey: query.queryKey });

  if (!(error instanceof ApiError)) {
    const isTimeout =
      typeof error === 'object' && error !== null && 'code' in error &&
      (error as { code: string }).code === 'ECONNABORTED';
    showToast({
      code: isTimeout ? 'FE-API-005' : 'FE-API-001',
      variant: 'error',
      message: isTimeout
        ? '요청 시간이 초과되었습니다. 다시 시도해 주세요.'
        : '서버에 연결할 수 없습니다. 네트워크를 확인해 주세요.',
      onRetry: refetch,
    });
    return;
  }

  if (error.code === 'WHOLESALE_NOT_AVAILABLE') {
    showToast({ code: 'WHOLESALE_NOT_AVAILABLE', variant: 'warning',
      message: '해당 품목은 도매가 데이터가 없습니다. 레이아웃 1로 전환됩니다.' });
    return;
  }

  if (CODES_404.has(error.code)) return;  // FE_FALLBACK — Toast 없음

  if (error.code === 'PIPELINE_DATA_MISSING') {
    showToast({ code: 'FE-API-004', variant: 'error',
      message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', onRetry: refetch });
    return;
  }

  showToast({ code: 'FE-API-002', variant: 'warning',
    message: `잘못된 요청입니다. (${error.code})` });
}
```

---

## 5. /freshness 연동 — FreshnessChip

### 5.1 훅 — `useFreshness.ts`

**위치**: `src/hooks/useFreshness.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import type { FreshnessResponse } from '@/types/meta';

export function useFreshness() {
  return useQuery({
    queryKey: ['freshness'],
    queryFn: () =>
      client.get<FreshnessResponse>(ENDPOINTS.FRESHNESS).then((r) => r.data),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
```

### 5.2 응답 타입 (`src/types/meta.ts` 기존 `Freshness` 인터페이스 확인)

```typescript
// api_spec_v4 §/freshness — src/types/meta.ts의 Freshness와 대조
interface FreshnessResponse {
  data_up_to:    string;  // YYYY-MM
  next_run_date: string;  // YYYY-MM-DD
  last_updated:  string;  // ISO 8601
}
```

> `src/types/meta.ts`에 이미 `Freshness` 타입이 정의되어 있을 경우 필드명 일치 확인 후 재사용.

### 5.3 표시 포맷 — `dateUtils.ts` 추가 함수

`src/utils/dateUtils.ts`에 아래 함수를 추가한다:

```typescript
/**
 * /freshness 응답을 Header 칩 텍스트로 변환.
 * @param dataUpTo   "2026-03"    → "2026년 3월 기준"
 * @param nextRunDate "2026-04-15" → "4월 15일"
 * @returns "2026년 3월 기준 · 다음 갱신 4월 15일 예정"
 */
export function formatFreshnessChip(dataUpTo: string, nextRunDate: string): string {
  const [year, month] = dataUpTo.split('-');
  const baseText = `${year}년 ${parseInt(month, 10)}월 기준`;

  const [, nMonth, nDay] = nextRunDate.split('-');
  const nextText = `${parseInt(nMonth, 10)}월 ${parseInt(nDay, 10)}일 예정`;

  return `${baseText} · 다음 갱신 ${nextText}`;
}
```

| 입력 | 출력 |
|------|------|
| `data_up_to: "2026-03"` | "2026년 3월 기준" |
| `next_run_date: "2026-04-15"` | "4월 15일 예정" |
| 최종 텍스트 | **"2026년 3월 기준 · 다음 갱신 4월 15일 예정"** |

### 5.4 FreshnessChip 컴포넌트

**위치**: `src/components/layout/FreshnessChip.tsx`  
**마운트**: `Header.tsx` 우측 끝 (자리표시자 교체)

```typescript
export function FreshnessChip() {
  const { data, isLoading, isError } = useFreshness();

  if (isLoading) {
    return <span className="text-xs text-gray-400 animate-pulse">데이터 기준 시점 로딩 중…</span>;
  }
  if (isError || !data) return null;  // QueryCache.onError가 Toast 발화, 칩은 숨김

  return (
    <span className="text-xs text-gray-500 whitespace-nowrap">
      {formatFreshnessChip(data.data_up_to, data.next_run_date)}
    </span>
  );
}
```

**에러 처리**: `QueryCache.onError` → `handleQueryError` → Toast 발화. `FreshnessChip` 자체는 `null` 반환.

---

## 6. /anomalies/summary 연동 — AnomalySummaryBanner

### 6.1 훅 — `useAnomaliesSummary.ts`

**위치**: `src/hooks/useAnomaliesSummary.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import type { AnomaliesSummaryResponse } from '@/types/anomaly';

export function useAnomaliesSummary() {
  return useQuery({
    queryKey: ['anomalies', 'summary'],
    queryFn: () =>
      client.get<AnomaliesSummaryResponse>(ENDPOINTS.ANOMALIES_SUMMARY).then((r) => r.data),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
```

### 6.2 신규 타입 추가 (`src/types/anomaly.ts` 확장)

```typescript
// api_spec_v4 §/anomalies/summary
export interface AnomalySummaryItem {
  anomaly_id:        number;
  commodity_id:      string;
  commodity_name_kr: string;
  segment_id:        SegmentId;
  period:            string;         // YYYY-MM
  primary_pattern:   PrimaryPattern;
  confidence_grade:  ConfidenceGrade;
  is_new:            boolean;
  transmission_rate: number;
}

export interface AnomaliesSummaryResponse {
  reference_month:   string;  // YYYY-MM
  total_count:       number;
  prev_month_count:  number;
  count_diff:        number;  // 양수 = 증가
  anomalies:         AnomalySummaryItem[];
}
```

### 6.3 AnomalySummaryBanner 렌더링 규칙

**위치**: `src/components/layout/AnomalySummaryBanner.tsx`  
**마운트**: `AppShell.tsx` 최상단 (Header 위)

#### 상태별 표시

| 조건 | 표시 내용 |
|------|-----------|
| `isLoading` | 스켈레톤 플레이스홀더 (배너 높이 유지, 레이아웃 밀림 방지) |
| `isError` | `null` 반환 (배너 숨김) |
| `total_count === 0` | "이번 달 탐지된 이상이 없습니다" |
| `total_count > 0` | 품목 배지 목록 + 증감 텍스트 |

#### 증감 표시 (`count_diff`)

| count_diff | 텍스트 | Tailwind 색상 |
|-----------|--------|---------------|
| `> 0` | "지난달보다 N건 증가" | `text-red-500` |
| `< 0` | "지난달보다 N건 감소" | `text-green-500` |
| `= 0` | "지난달과 동일" | `text-gray-500` |

#### 배지 색상 (CLAUDE.md §9 이상 노드 색상과 통일)

| confidence_grade | 색상 코드 |
|-----------------|-----------|
| `high` | `#e24b4a` (빨강) |
| `medium` | `#ef9f27` (주황) |
| `reference` | `#c8d850` (연두) |

`is_new: true`인 항목은 배지에 "NEW" 텍스트 추가.

#### 배지 클릭 동작

배지 클릭 시 `useAppStore`에서 아래 액션을 순서대로 호출:

```typescript
const selectPrimaryCommodity = useAppStore((s) => s.selectPrimaryCommodity);
const selectAnomaly          = useAppStore((s) => s.selectAnomaly);
const setActiveTab           = useAppStore((s) => s.setActiveTab);

function handleBadgeClick(item: AnomalySummaryItem) {
  setActiveTab('stream');                          // ① 흐름 보기 탭으로 전환
  selectPrimaryCommodity(item.commodity_id);       // ② 주 품목 전환
  selectAnomaly(item.anomaly_id);                  // ③ 이상 선택 + isPanelOpen: true 자동 연동
}
```

> **스토어 액션 이름 주의**:
> - 주 품목 전환: `selectPrimaryCommodity(id)` — `setPrimaryCommodityId` 아님
> - 이상 선택 + 패널 오픈: `selectAnomaly(id)` — `isPanelOpen`이 자동으로 `true`로 설정됨 (`setPanelOpen` 액션 없음)

---

## 7. Mock 모드 — MOCK_ROUTES 완전 등록 체크리스트

`feat/fe-api-connect` 브랜치 착수 시점에 `client.ts`의 `MOCK_ROUTES`에 아래 18개 엔드포인트가 모두 등록되어 있어야 한다:

| 엔드포인트 | Fixture 파일 | 등록 브랜치 | ✔ |
|-----------|-------------|------------|---|
| `/commodities` | `commodities.json` | frame (완료) | ✔ |
| `/segments` | `segments.json` | frame (완료) | ✔ |
| `/events` | `events.json` | frame (완료) | ✔ |
| `/freshness` | `freshness.json` | frame (완료) | ✔ |
| `/anomalies/summary` | `anomalies_summary.json` | **이 브랜치** | ☐ |
| `/commodities/{id}` | `commodity_detail.json` | feat/fe-layout-filter | ☐ |
| `/commodities/{id}/stream` | `stream.json` | feat/fe-stream-chart | ☐ |
| `/commodities/{id}/stream/minimap` | `stream_minimap.json` | feat/fe-minimap | ☐ |
| `/commodities/{id}/scatter` | `scatter.json` | feat/fe-scatter-chart | ☐ |
| `/commodities/{id}/raw-prices` | `raw_prices.json` | feat/fe-raw-timeseries | ☐ |
| `/commodities/{id}/raw-prices/minimap` | `raw_prices_minimap.json` | feat/fe-raw-timeseries | ☐ |
| `/anomalies/{id}/detail` | `anomaly_detail.json` | feat/fe-panel | ☐ |
| `/anomalies/{id}/stat-series` | `stat_series.json` | feat/fe-panel | ☐ |
| `/anomalies/{id}/stat-snapshot` | `stat_snapshot.json` | feat/fe-panel | ☐ |
| `/anomalies/{id}/irf` | `irf.json` | feat/fe-panel | ☐ |
| `/anomalies/{id}/ml-map` | `ml_map.json` | feat/fe-panel | ☐ |
| `/meta/pipeline` | `pipeline.json` | feat/fe-methodology-tab | ☐ |
| `/meta/analysis-params` | `analysis_params.json` | feat/fe-methodology-tab | ☐ |

> 미등록 엔드포인트는 `VITE_USE_MOCK=true` 환경에서 실제 `baseURL`로 호출 시도 → 백엔드 없으면 네트워크 에러(`FE-API-001`) 또는 콘솔 경고(`FE-MOCK-001`) 발생.

### 7.1 `anomalies_summary.json` Fixture

**위치**: `src/fixtures/anomalies_summary.json`

```json
{
  "reference_month": "2026-03",
  "total_count": 3,
  "prev_month_count": 1,
  "count_diff": 2,
  "anomalies": [
    {
      "anomaly_id": 142,
      "commodity_id": "wheat",
      "commodity_name_kr": "밀",
      "segment_id": "A",
      "period": "2026-03",
      "primary_pattern": "pattern2",
      "confidence_grade": "high",
      "is_new": true,
      "transmission_rate": 1.43
    },
    {
      "anomaly_id": 98,
      "commodity_id": "soybean",
      "commodity_name_kr": "대두",
      "segment_id": "B",
      "period": "2026-02",
      "primary_pattern": "pattern1",
      "confidence_grade": "medium",
      "is_new": false,
      "transmission_rate": 0.31
    },
    {
      "anomaly_id": 115,
      "commodity_id": "peanut",
      "commodity_name_kr": "땅콩",
      "segment_id": "C",
      "period": "2026-03",
      "primary_pattern": "pattern3",
      "confidence_grade": "high",
      "is_new": true,
      "transmission_rate": 1.87
    }
  ]
}
```

---

## 8. 통합 테스트 체크리스트 (실연결 전환 후)

`VITE_USE_MOCK=false` 전환 후 아래 체크리스트로 18개 엔드포인트 기본 연결을 확인한다.

### 8.1 참조 엔드포인트

| 엔드포인트 | 확인 방법 | 기대 결과 | ✔ |
|-----------|-----------|-----------|---|
| GET `/commodities` | 앱 진입 → 드롭다운 목록 렌더링 | 200, `commodities[]` 10건 | ☐ |
| GET `/commodities/{id}` | 품목 전환 | 200, `segment_meta` 포함 | ☐ |
| GET `/segments` | 필터바 구간 토글 항목 | 200, `segments[]` 5건 | ☐ |
| GET `/events` | 사건 필터 드롭다운 목록 | 200, `events[]` 5건 | ☐ |
| GET `/freshness` | Header 칩 텍스트 확인 | 200, "YYYY년 M월 기준 · 다음 갱신 M월 D일 예정" | ☐ |

### 8.2 요약 엔드포인트

| 엔드포인트 | 확인 방법 | 기대 결과 | ✔ |
|-----------|-----------|-----------|---|
| GET `/anomalies/summary` | 최상단 배너 품목 배지 렌더링 | 200, 배지 목록 및 증감 텍스트 표시 | ☐ |

### 8.3 시각화 엔드포인트

| 엔드포인트 | 확인 방법 | 기대 결과 | ✔ |
|-----------|-----------|-----------|---|
| GET `/commodities/{id}/stream` | 흐름 보기 탭 진입 | 200, 스트림 차트 렌더링 | ☐ |
| GET `/commodities/{id}/stream/minimap` | 흐름 보기 미니맵 | 200, 미니맵 렌더링 | ☐ |
| GET `/commodities/{id}/scatter` | 전달 구조 탭 진입 | 200, 산점도 렌더링 | ☐ |
| GET `/commodities/{id}/raw-prices` | 원시 시계열 탭 진입 | 200, 시계열 렌더링 | ☐ |
| GET `/commodities/{id}/raw-prices/minimap` | 원시 시계열 미니맵 | 200, 미니맵 렌더링 | ☐ |

### 8.4 패널 엔드포인트

| 엔드포인트 | 확인 방법 | 기대 결과 | ✔ |
|-----------|-----------|-----------|---|
| GET `/anomalies/{id}/detail` | 이상 노드 클릭 → 패널 오픈 | 200, 패널 섹션 렌더링 | ☐ |
| GET `/anomalies/{id}/stat-series` | 계량경제학 항목 클릭 | 200, 인라인 그래프 렌더링 | ☐ |
| GET `/anomalies/{id}/stat-snapshot` | IQR·비대칭 항목 클릭 | 200, 박스플롯·히스토그램 렌더링 | ☐ |
| GET `/anomalies/{id}/irf` | IRF 섹션 펼침 | 200, IRF 곡선 렌더링 | ☐ |
| GET `/anomalies/{id}/ml-map` | ML 결과맵 행 클릭 | 200, 결과맵 렌더링 | ☐ |

### 8.5 방법론 엔드포인트

| 엔드포인트 | 확인 방법 | 기대 결과 | ✔ |
|-----------|-----------|-----------|---|
| GET `/meta/pipeline` | 방법론 탭 진입 | 200, 플로우 다이어그램 렌더링 | ☐ |
| GET `/meta/analysis-params` | 방법론 탭 섹션 2·3 | 200, 패턴 카드·파라미터 수치 표시 | ☐ |

### 8.6 에러 케이스 확인

| 시나리오 | 조작 방법 | 기대 결과 | ✔ |
|----------|-----------|-----------|---|
| 3구간 품목 + 레이아웃 4 | 원시 시계열 탭 → 밀 선택 → 레이아웃 4 클릭 | WHOLESALE_NOT_AVAILABLE Toast + 레이아웃 1 폴백 | ☐ |
| 네트워크 단절 | 백엔드 종료 후 조회 | FE-API-001 Toast + 재시도 버튼 표시 | ☐ |
| 타임아웃 | `client.ts` timeout 100ms로 임시 수정 | FE-API-005 Toast + 재시도 버튼 표시 | ☐ |

---

## 9. 신규·수정 파일 목록

### 신규 파일

| 파일 | 설명 |
|------|------|
| `src/hooks/useFreshness.ts` | `/freshness` React Query 훅 |
| `src/hooks/useAnomaliesSummary.ts` | `/anomalies/summary` React Query 훅 |
| `src/components/layout/FreshnessChip.tsx` | 데이터 기준 시점 칩 컴포넌트 |
| `src/components/layout/AnomalySummaryBanner.tsx` | 이달의 이상 요약 배너 컴포넌트 |
| `src/components/ui/Toast.tsx` | 전역 Toast UI + `showToast()` 헬퍼 |
| `src/fixtures/anomalies_summary.json` | `/anomalies/summary` mock fixture |

### 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `src/App.tsx` | QueryClient 전역 설정 + `QueryCache onError` 연결 |
| `src/components/layout/AppShell.tsx` | `AnomalySummaryBanner`, `Toast` 마운트 추가 |
| `src/components/layout/Header.tsx` | `FreshnessChip` 마운트 (자리표시자 교체) |
| `src/utils/dateUtils.ts` | `formatFreshnessChip()` 함수 추가 |
| `src/types/anomaly.ts` | `AnomalySummaryItem`, `AnomaliesSummaryResponse` 타입 추가 |
| `src/api/error.ts` | `handleQueryError()` 함수 추가 |
| `src/api/client.ts` | `MOCK_ROUTES`에 `/anomalies/summary` 분기 추가 |

---

## 10. 완료 기준

| 항목 | 기준 |
|------|------|
| FreshnessChip | Header에 "YYYY년 M월 기준 · 다음 갱신 M월 D일 예정" 텍스트 표시 |
| AnomalySummaryBanner | 이달 이상 품목 배지 + 증감 텍스트 정상 렌더링 |
| 배지 클릭 | 주 품목 전환 + 패널 자동 오픈 + 흐름 보기 탭 전환 |
| Toast | FE-API-001·005 (재시도 버튼), FE-API-002·004, WHOLESALE_NOT_AVAILABLE 정상 발화 |
| Mock | `VITE_USE_MOCK=true` 환경에서 `anomalies_summary.json` fixture 정상 렌더링 |
| 실연결 | §8 18개 엔드포인트 통합 테스트 체크리스트 100% 통과 |
