# 01 · API 계층 (`API-*`)

> 네트워크 통신 + 에러 처리 전부. `src/api/` 4개 파일.
> 핵심: 모든 요청은 GET(읽기 전용). 응답 에러는 `{error:{code,message,context}}` 형태이며 `parseApiError`가 `FEError`/`ApiError` 객체로 감싼다.

---

### API-01 · 엔드포인트 목록 (18종)
- 위치: `src/api/endpoints.ts` (`ENDPOINTS`)
- 무엇: 백엔드 경로 18종을 상수/함수로 정의. 동적 경로(`/commodities/{id}/stream` 등)는 `(id) => ...` 함수.
- 왜: 경로 문자열을 코드 곳곳에 흩지 않고 한 곳에서 관리 → 오타·변경 위험 차단.
- 그룹: 참조(commodities/segments/events/freshness), 요약(anomalies/summary), 시각화(stream/scatter/raw-prices), 패널(anomalies/{id}/detail·stat-series·stat-snapshot·irf·ml-map), 방법론(meta/pipeline·analysis-params).

### API-02 · Axios 인스턴스
- 위치: `src/api/client.ts` (`client`)
- 무엇: baseURL(`VITE_API_BASE_URL`) + 30초 타임아웃을 가진 공용 axios 객체. 모든 훅이 이걸 import해 쓴다.
- 왜: 요청 설정·인터셉터를 한 인스턴스에 모아 일관 처리.

### API-03 · Mock 라우트 시스템
- 위치: `src/api/client.ts` (`MOCK_ROUTES` + request/response 인터셉터)
- 무엇: `VITE_USE_MOCK !== 'false'`일 때, 실제 HTTP 대신 `src/fixtures/`의 정적 JSON을 반환. URL 패턴 매칭으로 라우팅하며 성공/에러(`type:'error'`) 둘 다 흉내 낸다. 예: 3구간 품목(`wheat` 등)에 `layout=4` 요청 → `WHOLESALE_NOT_AVAILABLE` 에러.
- 왜: 백엔드 없이도 프론트 단독 개발·데모 가능. 에러 분기도 미리 테스트.
- 연결: [[API-04]] 실제 에러 변환 경로로 이어짐.

### API-04 · parseApiError 단일 응답 인터셉터
- 위치: `src/api/client.ts` (맨 아래 `client.interceptors.response.use`)
- 무엇: 모든 응답 에러를 [[API-07]] `parseApiError`로 통과시켜 `FEError`/`ApiError`로 변환 후 throw.
- 왜: 컴포넌트·훅이 raw axios 에러를 다루지 않고 일관된 에러 타입만 보게 함.

### API-05 · FEError (프론트 공통 에러 베이스)
- 위치: `src/api/error.ts` (`class FEError`)
- 무엇: `code` + `message` + `context` 를 가진 Error 확장. 원인 에러는 `context.cause`에 보관(ES `Error.cause` 미사용 — IS-6 규칙).
- 왜: 프론트 자체 에러(네트워크·파싱 등)를 코드로 분류하기 위함.
- 연결: [[API-10]] 체인 추적이 `context.cause`를 따라감.

### API-06 · ApiError (HTTP 응답 에러 wrapper)
- 위치: `src/api/error.ts` (`class ApiError extends FEError`)
- 무엇: 백엔드 에러 envelope를 감싼다. `httpStatus` + `publicCode`(사용자 노출 코드, 내부 `code`와 분리 — BE-4) 보유.
- 왜: 도메인 에러(품목 없음·레이아웃 오류 등)를 status·코드로 분기하기 위함.

### API-07 · parseApiError
- 위치: `src/api/error.ts` (`parseApiError`)
- 무엇: axios 에러 → 적절한 에러 객체로 변환. response 없으면 `NETWORK_ERROR`, envelope 구조 불일치면 `PARSE-SCHEMA-001`, 정상 envelope면 [[API-06]] `ApiError`.
- 왜: 모든 에러를 한 함수에서 분류 → 처리 일관성.

### API-08 · 영구 실패 코드 / isPermanentFailure
- 위치: `src/api/error.ts` (`PERMANENT_FAILURE_CODES`, `isPermanentFailure`)
- 무엇: 재시도해도 의미 없는 코드 집합(`NOT_IMPLEMENTED`, 4xx 도메인 코드 등). `isPermanentFailure`는 code/publicCode 양쪽 검사.
- 왜: react-query 재시도 정책이 이걸 보고 영구 실패는 retry 안 함 — [[LAYOUT-10]] App.
- 연결: [[LAYOUT-10]].

### API-09 · handleQueryError
- 위치: `src/api/error.ts` (`handleQueryError`)
- 무엇: react-query `QueryCache.onError` 콜백. 에러 코드별로 분기해 Toast를 띄운다. 일부(404 계열·`NOT_IMPLEMENTED`)는 조용히 무시(컴포넌트가 자체 fallback).
- 왜: 전역 에러 알림 정책을 한 곳에 모음.
- 연결: [[UI-08]] showToast, [[LAYOUT-10]] 등록 위치.

### API-10 · traceErrorChain
- 위치: `src/api/errorChain.ts` (`traceErrorChain`)
- 무엇: 에러의 `context.cause`(우선) 또는 `Error.cause`를 따라 가장 안쪽 원인까지 배열로 추적.
- 왜: 디버깅 시 "진짜 원인"을 찾기 위함.

### API-11 · 에러 체인 포매터
- 위치: `src/api/errorChain.ts` (`formatErrorChainSummary`, `formatErrorChain`)
- 무엇: 체인을 한 줄 요약 / 여러 줄 문자열로 변환. 콘솔·Toast 메시지용.
- 연결: [[API-09]], [[UI-09]] ErrorBoundary, [[API-12]].

### API-12 · 전역 에러 핸들러 등록
- 위치: `src/api/globalErrorHandler.ts` (`registerGlobalErrorHandler`)
- 무엇: `window.onerror` + `unhandledrejection`을 잡아 콘솔 로그 + Toast. `main.tsx`에서 1회 호출.
- 왜: react 트리 밖에서 터진 예외도 사용자에게 알림.
- 연결: [[LAYOUT-12]] main.tsx.

---

## 보너스: 시계열 응답 공통 규칙

- 모든 시계열 응답에 envelope(`requested_from/to`, `actual_from/to`, `granularity`, `total_points`)가 붙는다 — [[TYPE-02]].
- 날짜는 항상 `YYYY-MM` 문자열. 이벤트(외부 충격)는 `/events` 별도 엔드포인트로만 받는다(시계열 응답에 미포함).
