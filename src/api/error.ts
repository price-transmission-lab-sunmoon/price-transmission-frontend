import { AxiosError } from 'axios';
import type { Query, QueryClient } from '@tanstack/react-query';
import type { ApiErrorBody, ApiErrorResponse } from '@/types/error';
import { showToast } from '@/components/ui/Toast';
import { formatErrorChainSummary, formatErrorChain } from '@/api/errorChain';

// 공통 에러 베이스. 원인 에러는 ES2022 Error.cause 대신 context.cause에 보관한다.
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

// API 응답 에러 envelope을 wrapping한다. HTTP 응답이 있을 때만 사용.
export class ApiError extends FEError {
  readonly httpStatus: number;
  readonly publicCode: string;

  constructor(body: ApiErrorBody, httpStatus: number) {
    super(body.code, body.message, body.context ?? {});
    this.name = 'ApiError';
    this.httpStatus = httpStatus;
    this.publicCode = body.public_code ?? body.code;
  }
}

// Axios 에러를 ApiError 또는 FEError로 파싱한다. 원본은 context.cause에 보존.
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
    body == null ||
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

const CODES_404 = new Set([
  'COMMODITY_NOT_FOUND',
  'ANOMALY_NOT_FOUND',
  'ML_MAP_NOT_READY',
  'WARMUP_PERIOD_ONLY',
]);

// retry해도 의미 없는 영구 실패 코드 목록
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
  'INVALID_GRADE',
  'SNAPSHOT_METRIC_ON_SERIES',
  'WHOLESALE_NOT_AVAILABLE',
  'UNTIL_EXCEEDS_TO',
  'PARSE-SCHEMA-001',
  // 내부 code
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

  if (!(error instanceof FEError)) {
    showToast({
      code: 'FE-API-001',
      variant: 'error',
      message: '서버에 연결할 수 없습니다. 네트워크를 확인해 주세요.',
      onRetry: refetch,
    });
    return;
  }

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
    if (pc === 'SNAPSHOT_METRIC_ON_SERIES' || pc === 'INVALID_METRIC') {
      showToast({
        code: pc,
        variant: 'warning',
        message: `지원하지 않는 지표 요청입니다. (${pc})`,
      });
      return;
    }
    // 404 계열과 NOT_IMPLEMENTED는 컴포넌트 fallback에 맡기고 Toast 없음
    if (CODES_404.has(pc)) return;
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

  showToast({ code: error.code, variant: 'error', message: formatErrorChainSummary(error) });
}
