# Feature 명세서 — API 실연결 및 전역 에러 처리 인프라

**문서 유형**: Feature 명세서
**브랜치명**: `feat/fe-api-connect`
**담당자**: 하대수
**작성일**: 2026-05-07
**상태**: 초안

**변경 이력**
- v1 (2026-05-07): 최초 작성
- v2 (2026-05-10): exception_design v3 인프라 보강 (cause 체이닝·errorChain·globalErrorHandler·PARSE 코드 분기·gcTime·mock 비활성화 절차)
- v3 (2026-05-14): cross-spec 점검 결과 반영 (Banner/FreshnessChip 신규 생성 제거 — C1, ErrorBoundary 신규 — C3, Toast 큐·중복 방지 — I7)
- v4 (2026-05-14): **develop baseline 정합** — `frame_spec_frontend_v5 §6.4` `FEError` 클래스 도입 반영
  - **§4.4 ApiError 클래스 정정** — `FEError` 상속 계층화 (`ApiError extends FEError`). 생성자 시그니처를 `(body: ApiErrorBody, httpStatus: number)`으로 frame_spec v5 SoT 정합
  - **§4.1 cause 체이닝 패턴 정정** — `FEError`/`ApiError`가 ES2022 `Error.cause`를 받지 않는 frame_spec v5 시그니처에 맞춰, `cause`를 별도 `context` 필드로 보관하는 패턴으로 변경. `traceErrorChain`이 `context.cause`까지 순회
  - **§4.2 errorChain 함수 수정** — `(e as { cause?: unknown }).cause`만이 아니라 `context.cause`도 탐색
  - **참조 baseline 명시**: `exception_spec_v6` / `frame_spec_frontend_v5` / `docs_manifest_v2`
  - exception_spec v6 변경(API-COM-002 추가)은 BE only — FE 매핑 동일 → 본 명세서 §5 변경 없음

---

## ⚠️ 구현 시작 전 필수 확인

| 문서 | 버전 | 참조 목적 | 확인 |
|------|------|-----------|------|
| `api_spec_vN.md §공통사항, §/freshness, §/anomalies/summary, §에러코드` | 최신 (`docs_manifest_v2.md` 조회 — 현재 v5) | 엔드포인트·response 필드명·에러 envelope | ☐ |
| `exception_spec_vN.md §FE-API-*, §FE-MOCK-001, §PARSE-SCHEMA-001, §PARSE-ENUM-002, §부록 A, §8 매핑` | 최신 (현재 v6) | 에러 코드·`feat/fe-api-connect` 매핑·**`FEError` SoT** | ☐ |
| `exception_design_vN.md §2.1, §2.2, §2.4` | 최신 (현재 v3) | cause 체이닝·ORIGIN 추출·globalErrorHandler SoT | ☐ |
| `frame_spec_frontend_vN.md §6.4, §8.1, §8.10` | 최신 (현재 v5) | **`FEError`/`ApiError` 클래스 SoT (§6.4)** · Mock 정책 · localStorage 금지 | ☐ |
| `feature_dev_list_vN.md §feat/fe-api-connect` | 최신 (현재 v4) | 구현 범위·`gcTime` 최적화 | ☐ |
| `feature_spec_fe-layout-filter_vN.md §1.3` | 최신 (현재 v5) | Banner / FreshnessChip 소유권 — fe-layout-filter 단독 (C1) | ☐ |

---

## ⚠️ PM 별건 — 결재 대기 항목

| # | 항목 | 충돌 내용 | 본 명세 잠정 채택 |
|---|------|----------|-------------------|
| 1 | `retry` 기본값 | §3.1: `retry: 1` / exception_spec FE-API-001 처방: `retry: 3` | `retry: 1` 잠정. PM 결재 후 통일 |
| 2 | exception_design v3 인프라 별도 명세 분리 여부 | `errorChain`/`globalErrorHandler` 패턴이 fe-api-connect 단독 범위 초과 가능 | 본 명세 포함. PM이 별도 명세 판단 시 분리 |
| 3 | Toast / ErrorBoundary 컴포넌트 위치 | `frame_spec §2`에 `components/ui/` 미정의 | `src/components/ui/Toast.tsx` + `src/components/ui/ErrorBoundary.tsx` 신규 디렉토리 채택 |
| 4 | TanStack Query 버전 | `package.json` v5 (`5.32.0`) | v5 기준 |

---

## 1. 기능 개요

### 1.1 한 줄 요약

`VITE_USE_MOCK=false` 실연결 전환에 필요한 **전역 인프라**(React Query 설정·exception_design v3 cause 체이닝·`FEError`/`ApiError` 계층·globalErrorHandler·ErrorBoundary·Toast)를 구축하고, fe-layout-filter v5가 만든 Banner / FreshnessChip을 실연결 모드로 활성화·통합 테스트한다.

### 1.2 이 브랜치가 담당하는 범위 (v3 재정의 + v4 보강)

| 영역 | 내용 |
|------|------|
| 전역 QueryClient 설정 | `retry`·`refetchOnWindowFocus`·`staleTime`·`gcTime` + `QueryCache.onError` 연결 |
| **FEError·ApiError 클래스 (v4 신규 — frame_spec v5 §6.4 정합)** | `FEError` SoT 클래스 정의 + `ApiError extends FEError` 계층화. exception_spec v6 §부록 A 정합 |
| **exception_design v3 인프라** | `cause` 체이닝(`FEError.context.cause` 보관)·`traceErrorChain`/`formatErrorChainSummary`/`formatErrorChain` (`src/api/errorChain.ts` 신규) |
| **globalErrorHandler** | `window.onerror` / `window.onunhandledrejection` 리스너 (`src/api/globalErrorHandler.ts` 신규) |
| **ErrorBoundary (C3)** | React 컴포넌트 트리 에러 전파 방지 (`src/components/ui/ErrorBoundary.tsx` 신규) |
| **PARSE-SCHEMA-001 / PARSE-ENUM-002** | envelope 구조 검증 + literal union 검증 분기 |
| Toast UI + 큐·중복 방지 (I7) | `Toast.tsx` — CustomEvent 버스 + 큐 정책·중복 코드 throttle |
| Banner / FreshnessChip **활성화** (C1) | fe-layout-filter v5가 만든 컴포넌트의 mock→실연결 활성화·통합 테스트만. **신규 생성 금지** |
| Mock fixture 완전 등록 | `MOCK_ROUTES` 18개 엔드포인트 등록 완료 확인 |
| 환경 전환 절차 | `VITE_USE_MOCK=false` 체크리스트 |
| 통합 테스트 | 18개 엔드포인트 + 에러 케이스 검증 |

### 1.3 데이터 흐름

```
App.tsx
  ├─ <ErrorBoundary> (최상위 마운트)
  │     └─ React 트리 에러 → componentDidCatch → FE_BLOCK UI + 전파 차단
  ├─ registerGlobalErrorHandler() (window.onerror / onunhandledrejection)
  └─ QueryClientProvider
       └─ QueryCache.onError → handleQueryError(error, query, queryClient)
            → console.error([ApiError @ queryHash], formatErrorChain(error))  ← ORIGIN 추적
            → cause 체인 분석 (FEError.context.cause 순회) + 에러 코드 분기
            → enqueueToast() → Toast 큐 추가

AppShell.tsx (fe-layout-filter v5가 정의한 구조)
  ├─ <Toast/>
  ├─ <Banner/> ← fe-layout-filter v5 컴포넌트
  └─ <Header><FreshnessChip/></Header> ← fe-layout-filter v5 컴포넌트
```

### 1.4 의존 브랜치

이 브랜치는 모든 `feat/*` 브랜치가 dev 머지된 후 마지막 통합 테스트.
`Toast.tsx` / `ErrorBoundary.tsx` / `errorChain.ts` / `globalErrorHandler.ts` / `FEError`·`ApiError` 클래스 5종은 독립 선행 개발 가능.

---

## 2. 환경 설정

### 2.1 환경 변수

```dotenv
# .env.example
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_USE_MOCK=true
VITE_APP_TITLE=가격 전달 이상 탐지
```

(frame_spec_frontend_v5 §4 환경 변수 표와 일치)

### 2.2 Mock → 실연결 전환 절차

| 단계 | 내용 | 확인 |
|------|------|------|
| 1 | `.env.local` 생성: `VITE_USE_MOCK=false` + `VITE_API_BASE_URL` 갱신 | ☐ |
| 2 | 백엔드 서버 기동 확인: `GET /api/v1/commodities` → 200 | ☐ |
| 3 | 브라우저 콘솔 CORS 에러 없음 확인 | ☐ |
| 4 | `vite dev` 재기동 | ☐ |
| 5 | §10 통합 테스트 100% 통과 | ☐ |

### 2.3 CORS 정책

`api_spec_vN §공통사항`: 인증 없음. CORS는 백엔드 담당. 프론트 `withCredentials: false` 유지.

### 2.4 Mock 인터셉터 비활성화 절차

```typescript
if (import.meta.env.VITE_USE_MOCK !== 'false') {
  client.interceptors.request.use(mockInterceptor);
}
```

> prod 빌드에 mock 코드 잔류 차단. fixture import도 동적 import 권장.

---

## 3. 전역 React Query 설정

### 3.1 QueryClient 설정 (`App.tsx`)

```typescript
import { QueryClient, QueryClientProvider, QueryCache } from '@tanstack/react-query';
import { handleQueryError } from '@/api/error';
import { registerGlobalErrorHandler } from '@/api/globalErrorHandler';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

registerGlobalErrorHandler();

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      handleQueryError(error, query, queryClient);
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      retryDelay: 1000,
      refetchOnWindowFocus: false,
      staleTime: 0,
      gcTime: 5 * 60 * 1000,
    },
  },
});

// App 본문 — ErrorBoundary 최상위 마운트
// <ErrorBoundary><QueryClientProvider>...</QueryClientProvider></ErrorBoundary>
```

### 3.2 개별 훅 staleTime / gcTime

| 훅 | staleTime | gcTime |
|----|-----------|--------|
| `useFreshness`·`useAnomaliesSummary` | 60_000 (1분) | 300_000 |
| `usePipelineData`·`useAnalysisParams` | 3_600_000 (1시간) | 3_600_000 |
| 시계열 훅 | 0 (기본) | 300_000 |
| `useAnomalyDetail` | 300_000 (5분) | 600_000 (10분) |

---

## 4. 전역 에러 처리 — exception_design v3 + frame_spec v5 §6.4 정합 (v4 핵심 변경)

### 4.1 FEError·ApiError 클래스 (v4 신규 — frame_spec_frontend_v5 §6.4 SoT)

> **frame_spec_frontend v5 §6.4가 SoT**. 본 feat는 SoT 그대로 구현.

```typescript
// src/api/error.ts — exception_spec_vN §부록 A 프론트엔드 구현체 + frame_spec_frontend_v5 §6.4 정합

import type { ApiErrorBody, ApiErrorResponse } from '@/types/error';

// === FEError: 프론트엔드 전역 에러 베이스 클래스 ===
export class FEError extends Error {
  code: string;
  context: Record<string, unknown>;

  constructor(code: string, message: string, context: Record<string, unknown> = {}) {
    super(`[${code}] ${message}`);
    this.name = 'FEError';
    this.code = code;
    this.context = context;
  }
}

// === ApiError: HTTP 응답 에러 — FEError 계층 확장 ===
export class ApiError extends FEError {
  httpStatus: number;
  publicCode: string;

  constructor(body: ApiErrorBody, httpStatus: number) {
    super(body.code, body.message, body.context ?? {});
    this.name = 'ApiError';
    this.httpStatus = httpStatus;
    this.publicCode = body.code;
  }
}
```

**v3 → v4 시그니처 변경 정합 (cause 체이닝 패턴 변경)**:

| 구분 | v3 (호환 안 됨) | v4 (frame_spec v5 정합) |
|------|-----------------|--------------------------|
| 생성자 | `new ApiError(code, message, { cause })` | `new ApiError(body, httpStatus)` (body: `{code, message, context}`) |
| cause 보관 | ES2022 `Error.cause` (super 옵션) | `context.cause` 필드 (FEError.context에 보관) |
| 재throw 패턴 | `throw new ApiError(c, m, { cause: e })` | `throw new ApiError({ code, message, context: { cause: e, ...context } }, status)` |

> ES2022 `Error.cause`는 frame_spec v5 FEError 시그니처에서 지원되지 않는다. cause를 보존하려면 `context.cause` 필드로 명시 보관. `traceErrorChain`이 이 필드를 순회.

### 4.2 errorChain 함수 (`src/api/errorChain.ts` — v4 정정)

```typescript
// src/api/errorChain.ts — exception_design v3 §2.2 + frame_spec v5 §6.4 정합

import { FEError } from '@/api/error';

/**
 * 에러 체인을 따라 ORIGIN(가장 안쪽 원인)까지 추적.
 * - ES2022 Error.cause (표준)
 * - FEError.context.cause (frame_spec v5 §6.4 정합 패턴)
 * 양쪽 모두 탐색.
 */
export function traceErrorChain(error: unknown): unknown[] {
  const chain: unknown[] = [];
  let current: unknown = error;
  while (current != null) {
    chain.push(current);

    // FEError.context.cause 우선 (frame_spec v5 정합)
    if (current instanceof FEError && current.context?.cause != null) {
      current = current.context.cause;
      continue;
    }

    // ES2022 Error.cause fallback
    const standardCause = (current as { cause?: unknown })?.cause;
    if (standardCause != null) {
      current = standardCause;
      continue;
    }

    break;
  }
  return chain;
}

export function formatErrorChainSummary(error: unknown): string {
  const chain = traceErrorChain(error);
  const origin = chain[chain.length - 1];
  if (origin instanceof Error) return origin.message;
  return String(origin);
}

export function formatErrorChain(error: unknown): string {
  const chain = traceErrorChain(error);
  return chain
    .map((e, i) => {
      if (e instanceof Error) {
        return `[${i}] ${e.constructor.name}: ${e.message}`;
      }
      return `[${i}] ${String(e)}`;
    })
    .join('\n  ↳ ');
}
```

### 4.3 globalErrorHandler 등록 (`src/api/globalErrorHandler.ts`)

(v3과 동일 — `formatErrorChainSummary`/`formatErrorChain` 호출)

```typescript
export function registerGlobalErrorHandler(): void {
  window.addEventListener('error', (event) => {
    console.error('[globalError]', formatErrorChain(event.error));
    showToast({
      code: 'FE-GLOBAL-001',
      variant: 'error',
      message: `예기치 못한 오류가 발생했습니다. ${formatErrorChainSummary(event.error)}`,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[unhandledRejection]', formatErrorChain(event.reason));
    showToast({
      code: 'FE-GLOBAL-002',
      variant: 'error',
      message: `비동기 처리 중 오류가 발생했습니다. ${formatErrorChainSummary(event.reason)}`,
    });
  });
}
```

### 4.4 parseApiError (`src/api/error.ts` — v4 정정)

```typescript
import { AxiosError } from 'axios';
import { FEError, ApiError } from '@/api/error';

/**
 * Axios 응답 에러를 ApiError로 변환.
 * cause는 context.cause로 보관 (frame_spec v5 §6.4 정합).
 */
export function parseApiError(axiosError: unknown): ApiError | FEError {
  if (!(axiosError instanceof AxiosError)) {
    return new FEError('NETWORK_ERROR', '네트워크 오류', { cause: axiosError });
  }

  const response = axiosError.response;
  if (!response) {
    return new FEError('NETWORK_ERROR', axiosError.message, { cause: axiosError });
  }

  const body = response.data as ApiErrorResponse | undefined;

  // PARSE-SCHEMA-001 — envelope 구조 불일치
  if (!body || typeof body !== 'object' || !('error' in body) || !body.error?.code) {
    return new FEError('PARSE-SCHEMA-001', '응답 envelope 구조 불일치', {
      cause: axiosError,
      received: body,
      httpStatus: response.status,
    });
  }

  // 정상 envelope — ApiError로 래핑 (context.cause에 원본 보존)
  return new ApiError(
    {
      code: body.error.code,
      message: body.error.message,
      context: { ...body.error.context, cause: axiosError },
    },
    response.status,
  );
}
```

### 4.5 handleQueryError (`src/api/error.ts` — v4 정합)

```typescript
import type { Query, QueryClient } from '@tanstack/react-query';
import { showToast } from '@/components/ui/Toast';
import { ApiError, FEError } from '@/api/error';
import { formatErrorChainSummary, formatErrorChain } from '@/api/errorChain';

const CODES_404 = new Set([
  'COMMODITY_NOT_FOUND', 'ANOMALY_NOT_FOUND',
  'ML_MAP_NOT_READY', 'WARMUP_PERIOD_ONLY',
]);

export function handleQueryError(
  error: unknown,
  query: Query,
  queryClient: QueryClient,
): void {
  // 디버깅용 ORIGIN 콘솔 출력
  console.error(`[ApiError @ ${query.queryHash}]`, formatErrorChain(error));

  const refetch = () => queryClient.refetchQueries({ queryKey: query.queryKey });

  // 1. FEError 외 (NETWORK_ERROR, TIMEOUT 등은 FEError로 래핑되어 들어옴)
  if (!(error instanceof FEError)) {
    showToast({
      code: 'FE-API-001',
      variant: 'error',
      message: '서버에 연결할 수 없습니다. 네트워크를 확인해 주세요.',
      onRetry: refetch,
    });
    return;
  }

  // 2. NETWORK_ERROR / TIMEOUT
  if (error.code === 'NETWORK_ERROR') {
    const isTimeout =
      typeof (error.context as { cause?: { code?: string } })?.cause?.code === 'string' &&
      (error.context as { cause: { code: string } }).cause.code === 'ECONNABORTED';
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

  // 3. PARSE 코드
  if (error.code === 'PARSE-SCHEMA-001') {
    showToast({ code: 'PARSE-SCHEMA-001', variant: 'error',
      message: '응답 형식이 올바르지 않습니다. 서버 점검이 필요합니다.' });
    return;
  }
  if (error.code === 'PARSE-ENUM-002') {
    showToast({ code: 'PARSE-ENUM-002', variant: 'warning',
      message: `알 수 없는 값이 응답에 포함됐습니다. (${formatErrorChainSummary(error)})` });
    return;
  }

  // 4. ApiError 도메인 코드
  if (error instanceof ApiError) {
    if (error.code === 'WHOLESALE_NOT_AVAILABLE') {
      showToast({ code: 'WHOLESALE_NOT_AVAILABLE', variant: 'warning',
        message: '해당 품목은 도매가 데이터가 없습니다. 레이아웃 1로 전환됩니다.' });
      return;
    }
    if (error.code === 'INVALID_LAYOUT') {
      showToast({ code: 'INVALID_LAYOUT', variant: 'warning',
        message: '잘못된 레이아웃 번호입니다. 레이아웃 1로 전환됩니다.' });
      return;
    }
    if (error.code === 'UNTIL_EXCEEDS_TO') {
      showToast({ code: 'UNTIL_EXCEEDS_TO', variant: 'warning',
        message: '슬라이더 시점이 데이터 범위를 초과했습니다.' });
      return;
    }
    if (CODES_404.has(error.code)) return; // FE_FALLBACK

    if (error.code === 'PIPELINE_DATA_MISSING' || error.httpStatus >= 500) {
      showToast({ code: 'FE-API-004', variant: 'error',
        message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', onRetry: refetch });
      return;
    }

    if (error.httpStatus >= 400) {
      showToast({ code: 'FE-API-002', variant: 'warning',
        message: `잘못된 요청입니다. (${error.code})` });
      return;
    }
  }

  // 5. 기타 FEError
  showToast({ code: error.code, variant: 'error',
    message: formatErrorChainSummary(error) });
}
```

---

## 5. 전역 Toast 에러 처리

(v3 §5 동일 — Toast 컴포넌트·ToastDetail·에러 코드별 규칙·큐 정책 §5.4·z-index §5.5)

> **v4 정합**: §5.3 에러 코드별 Toast 규칙은 §4.5 `handleQueryError` 함수가 발화. exception_spec_v6 §8 FE 매핑(`FE-API-001~005`·`PARSE-SCHEMA-001`·`PARSE-ENUM-002`)과 1:1.

---

## 6. ErrorBoundary 컴포넌트

### 6.1 위치 및 책임 / 6.2 구현 명세 / 6.3 사용처 / 6.4 3중 안전망

(v3 §6 동일 — `src/components/ui/ErrorBoundary.tsx`, FE-BOUNDARY-001 Toast 발화)

> **v4 정정**: ErrorBoundary `componentDidCatch`에서 `formatErrorChain(error)`로 ORIGIN 콘솔 출력. `error.cause` 직접 접근 금지 (frame_spec v5 §6.4 시그니처 정합).

---

## 7 ~ 9 (v3 §7~§9 동일 — Banner/FreshnessChip 활성화·MOCK_ROUTES 18종 등록·통합 테스트)

---

## 10. 통합 테스트 체크리스트

### 10.1 ~ 10.5 (v3 동일)

### 10.6 에러 케이스 확인 (v4 — FEError 정합 보강)

| 시나리오 | 조작 방법 | 기대 결과 | ✔ |
|----------|-----------|-----------|---|
| 3구간 품목 + 레이아웃 4 | 원시 시계열 → 밀 → 레이아웃 4 | WHOLESALE_NOT_AVAILABLE Toast + 레이아웃 1 폴백 | ☐ |
| INVALID_LAYOUT | URL 직접 조작 layout=99 | INVALID_LAYOUT Toast + 레이아웃 1 폴백 | ☐ |
| 네트워크 단절 | 백엔드 종료 후 조회 | FE-API-001 Toast + 재시도 + `formatErrorChain` 콘솔 출력 (FEError → NETWORK_ERROR → AxiosError → underlying cause 체인) | ☐ |
| 타임아웃 | timeout 100ms 임시 수정 | FE-API-005 Toast + 재시도 | ☐ |
| 타임아웃 시나리오 원복 verify | 검증 후 timeout 원복 | client.ts 임시 수정 잔류 없음 grep | ☐ |
| PARSE-SCHEMA-001 | mock fixture envelope 의도적 누락 | PARSE-SCHEMA-001 Toast (FE_BLOCK 메시지) + `context: { received, httpStatus }` 콘솔 확인 | ☐ |
| PARSE-ENUM-002 | mock fixture unknown enum 주입 | PARSE-ENUM-002 Toast (warning) | ☐ |
| globalErrorHandler 동기 에러 | D3 콜백 내 throw | FE-GLOBAL-001 Toast | ☐ |
| globalErrorHandler Promise rejection | Promise.reject() | FE-GLOBAL-002 Toast | ☐ |
| ErrorBoundary catch | 임의 컴포넌트 throw | FE-BOUNDARY-001 Toast + fallback UI | ☐ |
| Toast 큐 max 4 | 5개 동시 발화 | 4개만 표시, FIFO drop | ☐ |
| Toast 중복 throttle | 같은 코드 5초 내 2회 | 1개만 표시 (onRetry 없는 toast 한정) | ☐ |
| **cause 체인 verify (v4 변경)** | DevTools 콘솔 `[ApiError @ ...]` 출력 확인 | **`formatErrorChain` 출력에 `FEError → context.cause: AxiosError` 체인 가시화** | ☐ |
| **`FEError` 인스턴스 타입 verify (v4 신규)** | `error instanceof FEError` 가드 케이스 | handleQueryError가 FEError 우선 분기 후 ApiError 세분화 진행 | ☐ |

---

## 11. 신규·수정 파일 목록 (v4 정정)

### 신규 파일

| 파일 | 설명 |
|------|------|
| `src/api/errorChain.ts` | `traceErrorChain` / `formatErrorChainSummary` / `formatErrorChain` (v4 — `FEError.context.cause` 순회) |
| `src/api/globalErrorHandler.ts` | `registerGlobalErrorHandler` |
| `src/components/ui/Toast.tsx` | 전역 Toast UI + 큐·중복 throttle |
| `src/components/ui/ErrorBoundary.tsx` | React 컴포넌트 트리 에러 전파 방지 |

### 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `src/App.tsx` | `<ErrorBoundary>` 최상위 + QueryClient + `registerGlobalErrorHandler()` + `gcTime` |
| `src/components/layout/AppShell.tsx` | `<Toast/>` 마운트 (Banner·FreshnessChip은 fe-layout-filter v5 작업) |
| **`src/api/error.ts` (v4 핵심 변경)** | **`FEError` 베이스 클래스 신규 + `ApiError extends FEError` 계층화 + `parseApiError` 시그니처 정정 (frame_spec v5 §6.4 SoT 정합) + `handleQueryError` FEError 분기 추가** |
| `src/api/client.ts` | mock 인터셉터 비활성화 분기 (§2.4) |
| `src/utils/zIndex.ts` 또는 `tailwind.config.ts` | z-index 우선순위 SoT (§5.5) |

---

## 12. 완료 기준 (v4 정정)

| 항목 | 기준 |
|------|------|
| **`FEError`/`ApiError` 계층 (v4)** | `ApiError extends FEError` 확인. `FEError.context.cause`에 원본 에러 보존 확인 |
| **frame_spec_frontend v5 §6.4 SoT 정합 (v4)** | `parseApiError` 시그니처 = `(axiosError) → ApiError({code, message, context}, httpStatus)`. 본문에 `new ApiError(code, message, { cause })` 잔존 없음 (grep verify) |
| Banner / FreshnessChip | fe-layout-filter v5 컴포넌트가 실연결 모드에서 정상 렌더링 |
| Toast | FE-API-001·005, 002·004, WHOLESALE_NOT_AVAILABLE, INVALID_LAYOUT, UNTIL_EXCEEDS_TO, PARSE-SCHEMA-001, PARSE-ENUM-002 정상 발화 |
| Toast 큐·z-index | max 4 FIFO drop, 5초 throttle, z-index 우선순위 |
| ErrorBoundary | 컴포넌트 트리 에러 catch + FE-BOUNDARY-001 Toast |
| **cause 체이닝 (v4 변경)** | DevTools `formatErrorChain` 출력에 `FEError.context.cause` 체인 가시화 |
| traceErrorChain | `FEError.context.cause` + ES2022 `Error.cause` 양쪽 탐색 |
| globalErrorHandler | window.onerror·onunhandledrejection |
| PARSE-SCHEMA-001 / PARSE-ENUM-002 | fixture 시나리오 검증 |
| `gcTime` | QueryClient 기본 5분 + 개별 override |
| Mock 비활성화 | `VITE_USE_MOCK=false` 시 인터셉터 미등록 |
| 실연결 | §10 18개 엔드포인트 100% 통과 |
| 소유권 검증 (C1) | grep: `Banner.tsx`/`FreshnessChip.tsx`/`AnomalySummaryBanner.tsx` 본 feat 신규 생성 0건 |

---

## 13. 금지 사항 (v4 보강)

| 금지 사항 | 이유 |
|-----------|------|
| **`new ApiError(code, message, { cause })` v3 시그니처 사용 (v4 신규)** | **frame_spec_frontend v5 §6.4 SoT 위반**. v4부터는 `new ApiError({code, message, context: { cause, ...}}, httpStatus)` 사용 |
| **`FEError` 우회한 직접 `Error` throw (v4 신규)** | frame_spec v5 §6.4 SoT — 모든 FE 에러는 `FEError` 또는 그 하위 클래스 사용 |
| `traceErrorChain` 직접 호출 없이 `error.cause` 직접 접근 | `FEError.context.cause` 패턴 미지원 — `traceErrorChain` 의무 사용 |
| globalErrorHandler 미등록 | React Query 외 비동기 예외 미커버 |
| PARSE-SCHEMA-001 / PARSE-ENUM-002 처리 누락 | exception_spec v6 §8 필수 코드 |
| `localStorage` / `sessionStorage` 사용 | frame_spec v5 §8.10 |
| §10.6 시나리오 검증 후 임시 수정 잔류 | prod 코드 오염 |
| 본 feat에서 `Banner.tsx`/`FreshnessChip.tsx` 등 fe-layout-filter v5 소유 컴포넌트 신규 생성 (C1) | fe-layout-filter v5 단독 소유 |
| Toast 큐 정책(max 4 / throttle) 무시 | 화면 가독성 |
| `<ErrorBoundary>` 마운트 누락 | FE-API-004·FE_BLOCK 책임 미이행 |
| z-index 숫자 컴포넌트 내 직접 사용 | §5.5 SoT |

---

## 14. PR 체크리스트 (v4 정정)

### Feature 명세
`docs/feature_specs/feature_spec_fe-api-connect_vN.md` (최신)

### 체크리스트
- [ ] TypeScript 컴파일 오류 없음
- [ ] ESLint 경고 없음
- [ ] vitest 스모크 테스트 통과
- [ ] **`src/api/error.ts` — `FEError` + `ApiError extends FEError` 계층 (frame_spec v5 §6.4 SoT 정합, v4 신규)**
- [ ] `src/api/errorChain.ts` — `FEError.context.cause` 순회 + ES2022 `Error.cause` 양쪽 탐색
- [ ] `src/api/globalErrorHandler.ts` 신규
- [ ] `src/components/ui/ErrorBoundary.tsx` 신규
- [ ] `src/components/ui/Toast.tsx` 신규 — 큐·중복 throttle 정책
- [ ] App.tsx — `<ErrorBoundary>` 최상위 + `gcTime` 옵션
- [ ] mock 인터셉터 `VITE_USE_MOCK !== 'false'` 분기
- [ ] **grep 검증 (v4): `new ApiError\((code|").*,\s*\{\s*cause:` 패턴 0건 (구 시그니처 잔존 없음)**
- [ ] grep 검증 (C1): `Banner.tsx`/`FreshnessChip.tsx`/`AnomalySummaryBanner.tsx`/`useFreshness.ts`/`useAnomaliesSummary.ts` 본 feat 코드 0건
- [ ] grep 검증: `'cause:'` 패턴 충분 사용 (context.cause)
- [ ] z-index SoT 적용
- [ ] §10.6 시나리오 검증 후 임시 수정 원복

### PM 별건 처리 결과
- [ ] PM 별건 #1 — `retry` 기본값 결재
- [ ] PM 별건 #2 — exception_design v3 인프라 별도 명세 분리 결재
- [ ] PM 별건 #3 — `components/ui/` 디렉토리 결재
- [ ] PM 별건 #4 — TanStack Query v5 정합

### 리뷰어 확인 사항
- **`FEError`/`ApiError` 계층** — `error instanceof FEError` / `instanceof ApiError` 가드 정확성
- **frame_spec v5 §6.4 시그니처 정합** — `parseApiError` 출력이 `(body, httpStatus)` 생성자 사용
- cause 체이닝 — DevTools `formatErrorChain`에서 `context.cause` 체인 가시화
- ErrorBoundary 동작
- Toast 큐 정책 동작
- globalErrorHandler 안전망
- Banner / FreshnessChip 소유권
- mock 인터셉터 비활성화 — prod 빌드 fixture 잔류 검증
