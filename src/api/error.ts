// 예외처리 설계 문서(exception_design_vN) §2.1 + frame_spec_frontend_vN §6.4 정합
// feature_spec_fe-api-connect_vN §4.1 §4.4 §4.5 SoT (v4 정정 반영)
//
// 변경 이력:
//   IS-6: FEError constructor에서 cause 직접 파라미터 제거 → context.cause 보관 패턴으로 전환
//   IS-7: ApiError constructor에서 cause 직접 파라미터 제거
//   IS-9: parseApiError 시그니처 → (axiosError: unknown) 단일 인자
//   IS-10: traceErrorChain / formatErrorChain / formatErrorChainSummary → errorChain.ts 이전
//   IS-11: globalErrorHandler → globalErrorHandler.ts 이전 (registerGlobalErrorHandler)

import { AxiosError } from 'axios';
import type { Query, QueryClient } from '@tanstack/react-query';
import type { ApiErrorBody, ApiErrorResponse } from '@/types/error';
import { showToast } from '@/components/ui/Toast';
import { formatErrorChainSummary, formatErrorChain } from '@/api/errorChain';

/**
 * 프론트엔드 공통 에러 베이스 클래스 (exception_spec_vN §부록 A + frame_spec_frontend_vN §6.4).
 *
 * IS-6: `cause`는 ES2022 Error.cause로 전달하지 않는다.
 * 원인 에러를 보존해야 할 때 `context.cause` 필드로 명시 보관한다.
 * → traceErrorChain 이 FEError.context.cause 를 우선 탐색.
 *
 * @example
 *   throw new FEError('FE-D3-001', '데이터 빈 배열', { cause: originalErr, chart_type: 'stream' });
 */
export class FEError extends Error {
  code: string;
  context: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    context: Record<string, unknown> = {},
  ) {
    super(`[${code}] ${message}`);
    this.name = 'FEError';
    this.code = code;
    this.context = context;
  }
}

/**
 * API 응답 에러 envelope을 wrapping하는 클래스 (frame_spec_frontend_vN §6.4).
 * FEError 계층 확장 — HTTP API 응답이 있는 경우에 한해 사용한다.
 *
 * IS-7: cause는 body.context.cause 필드로 전달한다.
 */
export class ApiError extends FEError {
  readonly httpStatus: number;
  readonly publicCode: string;

  constructor(body: ApiErrorBody, httpStatus: number) {
    // BE-4: 내부 code 보존, public_code가 있으면 publicCode에 별도 보관.
    super(body.code, body.message, body.context ?? {});
    this.name = 'ApiError';
    this.httpStatus = httpStatus;
    this.publicCode = body.public_code ?? body.code;
  }
}

/**
 * Axios 에러 전체 객체를 받아 ApiError 또는 FEError로 파싱한다.
 * feature_spec_fe-api-connect_vN §4.4 SoT (v4 정정 — IS-9).
 *
 * 원본 axiosError는 context.cause 필드로 보존 (IS-6 context.cause 패턴 적용).
 *
 * @param axiosError Axios 인터셉터가 throw한 에러 객체 전체
 */
export function parseApiError(axiosError: unknown): ApiError | FEError {
  if (!(axiosError instanceof AxiosError)) {
    return new FEError('NETWORK_ERROR', '네트워크 오류 — AxiosError 아님', {
      cause: axiosError,
    });
  }

  const response = axiosError.response;
  if (!response) {
    return new FEError('NETWORK_ERROR', axiosError.message, {
      cause: axiosError,
    });
  }

  const body = response.data as ApiErrorResponse | undefined;

  if (
    body === null ||
    body === undefined ||
    typeof body !== 'object' ||
    !('error' in body) ||
    typeof body.error?.code !== 'string'
  ) {
    return new FEError('PARSE-SCHEMA-001', '응답 envelope 구조 불일치', {
      cause: axiosError,
      received: body,
      httpStatus: response.status,
    });
  }

  return new ApiError(
    {
      code: body.error.code,
      public_code: body.error.public_code,
      message: body.error.message,
      context: { ...body.error.context, cause: axiosError },
    },
    response.status,
  );
}

// ============================================================
// handleQueryError — feature_spec_fe-api-connect_vN §4.5
// QueryCache.onError 콜백. 에러 코드 분기 후 Toast 발화.
// ============================================================

const CODES_404 = new Set([
  'COMMODITY_NOT_FOUND',
  'ANOMALY_NOT_FOUND',
  'ML_MAP_NOT_READY',
  'WARMUP_PERIOD_ONLY',
]);

// 영구 실패 코드 — retry 무의미. P1-3에서 queryClient.retry 정책에 활용.
// BE-3 (2026-05-20): 백엔드 신규 내부 코드(API-ANO-001 등) 및 public_code 양쪽 모두 등록.
export const PERMANENT_FAILURE_CODES = new Set([
  // public_code
  'NOT_IMPLEMENTED',
  'COMMODITY_NOT_FOUND',
  'ANOMALY_NOT_FOUND',
  'ML_MAP_NOT_READY',
  'WARMUP_PERIOD_ONLY',
  'INVALID_LAYOUT',
  'INVALID_SEGMENT',
  'INVALID_GRANULARITY',
  'INVALID_DATE_RANGE',
  'INVALID_METRIC',
  'SNAPSHOT_METRIC_ON_SERIES',
  'WHOLESALE_NOT_AVAILABLE',
  'PARSE-SCHEMA-001',
  // 백엔드 내부 code
  'API-VAL-001',
  'API-ANO-001',
  'API-MET-001',
  'API-MET-002',
]);

export function isPermanentFailure(error: unknown): boolean {
  if (!(error instanceof FEError)) return false;
  if (PERMANENT_FAILURE_CODES.has(error.code)) return true;
  if (error instanceof ApiError && PERMANENT_FAILURE_CODES.has(error.publicCode)) return true;
  return false;
}

export function handleQueryError(
  error: unknown,
  query: Query<unknown, unknown>,
  queryClient: QueryClient,
): void {
  console.error(`[ApiError @ ${query.queryHash}]`, formatErrorChain(error));

  const refetch = () => queryClient.refetchQueries({ queryKey: query.queryKey });

  // 1. FEError 외 (예상치 못한 non-FEError)
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
    const causeCode = (error.context as { cause?: { code?: string } })?.cause?.code;
    const isTimeout = typeof causeCode === 'string' && causeCode === 'ECONNABORTED';
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
    showToast({
      code: 'PARSE-SCHEMA-001',
      variant: 'error',
      message: '응답 형식이 올바르지 않습니다. 서버 점검이 필요합니다.',
    });
    return;
  }
  if (error.code === 'PARSE-ENUM-002') {
    showToast({
      code: 'PARSE-ENUM-002',
      variant: 'warning',
      message: `알 수 없는 값이 응답에 포함됐습니다. (${formatErrorChainSummary(error)})`,
    });
    return;
  }

  // 4. ApiError 도메인 코드 — publicCode 기준 분기 (BE-3)
  if (error instanceof ApiError) {
    const pc = error.publicCode;
    if (pc === 'WHOLESALE_NOT_AVAILABLE') {
      showToast({
        code: 'WHOLESALE_NOT_AVAILABLE',
        variant: 'warning',
        message: '해당 품목은 도매가 데이터가 없습니다. 레이아웃 1로 전환됩니다.',
      });
      return;
    }
    if (pc === 'INVALID_LAYOUT') {
      showToast({
        code: 'INVALID_LAYOUT',
        variant: 'warning',
        message: '잘못된 레이아웃 번호입니다. 레이아웃 1로 전환됩니다.',
      });
      return;
    }
    if (pc === 'UNTIL_EXCEEDS_TO') {
      showToast({
        code: 'UNTIL_EXCEEDS_TO',
        variant: 'warning',
        message: '슬라이더 시점이 데이터 범위를 초과했습니다.',
      });
      return;
    }
    // BE-3: 신규 백엔드 코드 — Toast 발화. UI 컴포넌트가 자체 fallback 처리한 경우 조용히 처리.
    if (pc === 'SNAPSHOT_METRIC_ON_SERIES' || pc === 'INVALID_METRIC') {
      showToast({
        code: pc,
        variant: 'warning',
        message: `지원하지 않는 지표 요청입니다. (${pc})`,
      });
      return;
    }
    // 404 계열 — FE_FALLBACK (Toast 없이 조용히 처리)
    if (CODES_404.has(pc)) return;

    // NOT_IMPLEMENTED — 백엔드 패널 엔드포인트 미구현 (Phase 7 이후). Toast 없이 컴포넌트 fallback.
    if (pc === 'NOT_IMPLEMENTED') return;

    if (pc === 'PIPELINE_DATA_MISSING' || error.httpStatus >= 500) {
      showToast({
        code: 'FE-API-004',
        variant: 'error',
        message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        onRetry: refetch,
      });
      return;
    }

    if (error.httpStatus >= 400) {
      showToast({
        code: 'FE-API-002',
        variant: 'warning',
        message: `잘못된 요청입니다. (${pc})`,
      });
      return;
    }
  }

  // 5. 기타 FEError
  showToast({ code: error.code, variant: 'error', message: formatErrorChainSummary(error) });
}
