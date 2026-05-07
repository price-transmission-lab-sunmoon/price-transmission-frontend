// 예외처리 설계 문서(exception_design_vN) 기반 — 에러 체이닝 + ORIGIN 추출 + 글로벌 핸들러
// frame 단계: 인프라(체인 구조·핸들러)만 구축. FE-* 코드별 처리(toast/fallback)는 feat/* 단계.

import type { ApiErrorResponse } from '@/types/error';

/**
 * API 응답 에러 envelope을 wrapping하는 클래스 (frame_spec_frontend_vN §6.4).
 * ES2022 표준 `cause` 옵션을 지원하여 `raise X from Y` 패턴을 JS에서 구현.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly context?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    options?: { context?: Record<string, unknown>; cause?: unknown },
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'ApiError';
    this.code = code;
    this.context = options?.context;
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
 * 컨벤션 전제: `throw new X('...', { cause: e })` 패턴을 반드시 지킨다.
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

    if (exc instanceof ApiError) {
      let snapshotStr = '';
      if (isOrigin && exc.context && Object.keys(exc.context).length > 0) {
        const items = Object.entries(exc.context)
          .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
          .join(', ');
        snapshotStr = ` | context: {${items}}`;
      }
      lines.push(`${prefix}${arrow}[${exc.code}] ${exc.message}${snapshotStr}`);
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
    .map((exc) => (exc instanceof ApiError ? exc.code : exc.constructor.name))
    .join(' → ');
}

/**
 * Axios 응답 본문을 ApiError envelope으로 파싱한다 (frame_spec_frontend_vN §6.4).
 * 원본 axios 에러는 `cause`로 보존하여 체인을 끊지 않는다.
 *
 * @param data Axios 에러 응답의 body (response.data)
 * @param cause 원본 axios/네트워크 에러 (체인 보존용)
 */
export function parseApiError(data: unknown, cause?: unknown): ApiError {
  if (
    data !== null &&
    typeof data === 'object' &&
    'error' in data &&
    typeof (data as ApiErrorResponse).error?.code === 'string'
  ) {
    const body = (data as ApiErrorResponse).error;
    return new ApiError(body.code, body.message, { context: body.context, cause });
  }
  return new ApiError('NETWORK_ERROR', 'Network or unknown error', { cause });
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
  const originCode = origin instanceof ApiError ? origin.code : 'UNKNOWN';
  console.error(`ORIGIN 코드: ${originCode}`);
  console.error(divider);
}
