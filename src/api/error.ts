// 예외처리 설계 문서(exception_design_vN) §2.1 + frame_spec_frontend_vN §6.4 정합
// feature_spec_fe-api-connect_vN §4.1 SoT (v4 정정 반영)
//
// 변경 이력:
//   IS-6: FEError constructor에서 cause 직접 파라미터 제거 → context.cause 보관 패턴으로 전환
//   IS-7: ApiError constructor에서 cause 직접 파라미터 제거
//   IS-9: parseApiError 시그니처 → (axiosError: unknown) 단일 인자
//   IS-10: traceErrorChain / formatErrorChain / formatErrorChainSummary → errorChain.ts 이전
//   IS-11: globalErrorHandler → globalErrorHandler.ts 이전 (registerGlobalErrorHandler)

import { AxiosError } from 'axios';
import type { ApiErrorBody, ApiErrorResponse } from '@/types/error';

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
    super(body.code, body.message, body.context ?? {});
    this.name = 'ApiError';
    this.httpStatus = httpStatus;
    this.publicCode = body.code;
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
      message: body.error.message,
      context: { ...body.error.context, cause: axiosError },
    },
    response.status,
  );
}
