// 예외처리 설계 문서(exception_design_vN) 기반 — 에러 체이닝 + ORIGIN 추출 + 글로벌 핸들러
// frame 단계: 인프라(체인 구조·핸들러)만 구축. FE-* 코드별 처리(toast/fallback)는 feat/* 단계.

import type { ApiErrorBody, ApiErrorResponse } from '@/types/error';

/**
 * 프론트엔드 공통 에러 베이스 클래스 (exception_spec_vN §부록 A + frame_spec_frontend_vN §6.4).
 * FE-* / PARSE-* 코드를 직접 throw할 때 사용한다.
 * ES2022 표준 `cause` 옵션으로 `raise X from Y` 패턴 구현.
 *
 * @example
 *   throw new FEError("FE-D3-001", "데이터 빈 배열", { chart_type: "stream" });
 */
export class FEError extends Error {
  code: string;
  context: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    context: Record<string, unknown> = {},
    cause?: unknown,
  ) {
    super(`[${code}] ${message}`, cause !== undefined ? { cause } : undefined);
    this.name = 'FEError';
    this.code = code;
    this.context = context;
  }
}

/**
 * API 응답 에러 envelope을 wrapping하는 클래스 (frame_spec_frontend_vN §6.4).
 * FEError 계층 확장 — HTTP API 응답이 있는 경우에 한해 사용한다.
 */
export class ApiError extends FEError {
  readonly httpStatus: number;
  readonly publicCode: string;

  constructor(body: ApiErrorBody, httpStatus: number, cause?: unknown) {
    super(body.code, body.message, body.context ?? {}, cause);
    this.name = 'ApiError';
    this.httpStatus = httpStatus;
    this.publicCode = body.code;
  }
}

/**
 * 에러 체인 추적 결과 (exception_design_vN §2.2).
 */
export interface ErrorChainTrace {
  origin: Error;
  chain: Error[];
  formatted: string;
}

/**
 * 예외 체인을 역추적하여 ORIGIN과 전파 경로를 반환한다 (exception_design_vN §2.2).
 * 체인의 끝(`cause === undefined`)이 ORIGIN이며, 첫 번째로 정렬된다.
 *
 * 컨벤션 전제: `throw new FEError("...", ..., {}, cause)` 패턴을 반드시 지킨다.
 * cause를 누락하면 체인이 끊겨 ORIGIN 추적이 불가능해진다.
 */
export function traceErrorChain(err: unknown): ErrorChainTrace {
  const chain: Error[] = [];
  let current: unknown = err;

  while (current instanceof Error) {
    chain.push(current);
    current = current.cause;
  }

  // ORIGIN이 첫 번째가 되도록 역순 정렬
  chain.reverse();
  const origin = chain[0] ?? new Error(String(err ?? 'Unknown error'));

  return {
    origin,
    chain,
    formatted: formatErrorChain(chain),
  };
}

/**
 * 체인을 사람이 읽기 좋은 다중 라인 문자열로 포매팅 (exception_design_vN §2.3).
 * FEError.message 는 이미 "[code] message" 형식이므로 code 재접두 없이 출력한다.
 * ORIGIN 행에만 context를 출력한다.
 */
export function formatErrorChain(chain: Error[]): string {
  if (chain.length === 0) return '(empty error chain)';

  const lines: string[] = [];

  for (let i = 0; i < chain.length; i++) {
    const exc = chain[i];
    const isOrigin = i === 0;
    const prefix = isOrigin ? 'ORIGIN' : '      ';
    const arrow = isOrigin ? '  ' : ' └─ ';

    if (exc instanceof FEError) {
      let snapshotStr = '';
      if (isOrigin && Object.keys(exc.context).length > 0) {
        const items = Object.entries(exc.context)
          .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
          .join(', ');
        snapshotStr = ` | context: {${items}}`;
      }
      // exc.message 는 이미 "[code] message" 형식 — 재접두 하지 않는다
      lines.push(`${prefix}${arrow}${exc.message}${snapshotStr}`);
    } else {
      lines.push(`${prefix}${arrow}[${exc.constructor.name}] ${exc.message}`);
    }
  }

  return lines.join('\n');
}

/**
 * 체인을 AI 디버깅 전달용 한 줄 요약으로 포매팅 (exception_design_vN §2.5).
 * 코드만 나열하여 전파 경로를 한눈에 파악할 수 있게 한다.
 *
 * @example
 *   formatErrorChainSummary(chain)  // "COMMODITY_NOT_FOUND → AxiosError"
 */
export function formatErrorChainSummary(chain: Error[]): string {
  if (chain.length === 0) return '(empty)';
  return chain
    .map((exc) => (exc instanceof FEError ? exc.code : exc.constructor.name))
    .join(' → ');
}

/**
 * Axios 응답 본문을 ApiError로 파싱한다 (frame_spec_frontend_vN §6.4).
 * 응답 본문이 API 에러 envelope 형식이면 ApiError를 반환한다.
 * 형식이 아니면 NETWORK_ERROR FEError를 반환한다.
 * 원본 axios 에러는 `cause`로 보존하여 체인을 끊지 않는다.
 *
 * @param data Axios 에러 응답의 body (response.data)
 * @param httpStatus HTTP 상태 코드 (error.response.status)
 * @param cause 원본 axios/네트워크 에러 (체인 보존용)
 */
export function parseApiError(
  data: unknown,
  httpStatus: number,
  cause?: unknown,
): ApiError | FEError {
  if (
    data !== null &&
    typeof data === 'object' &&
    'error' in data &&
    typeof (data as ApiErrorResponse).error?.code === 'string'
  ) {
    const body = (data as ApiErrorResponse).error;
    return new ApiError(body, httpStatus, cause);
  }
  return new FEError('NETWORK_ERROR', 'Unexpected API response format', {}, cause);
}

/**
 * 최상위에서 잡힌 예외를 처리한다 (exception_design_vN §2.4).
 * 에러 체인을 분석하고 ORIGIN 코드를 콘솔에 기록한다.
 * 사용 위치: `main.tsx`의 `window.error` / `window.unhandledrejection` 핸들러.
 *
 * frame 단계: 콘솔 로그까지만. UI 표시(toast/fallback)는 feat/* 단계.
 */
export function globalErrorHandler(err: unknown): void {
  const trace = traceErrorChain(err);
  const divider = '='.repeat(60);

  // §2.4 — 사람 가독성용 multi-line
  console.error(divider);
  console.error('[ 에러 발생 ]');
  console.error(divider);
  console.error(trace.formatted);
  console.error(divider);

  // §2.5 — AI 디버깅 전달용 한 줄 CHAIN 요약 + ORIGIN 코드
  console.error(`CHAIN:  ${formatErrorChainSummary(trace.chain)}`);

  const origin = trace.origin;
  const originCode = origin instanceof FEError ? origin.code : 'UNKNOWN';
  console.error(`ORIGIN 코드: ${originCode}`);
  console.error(divider);
}
