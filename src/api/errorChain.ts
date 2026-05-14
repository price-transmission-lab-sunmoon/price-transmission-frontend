// exception_design_vN §2.2 + frame_spec_frontend_vN §6.4 정합
// feature_spec_fe-api-connect_vN §4.2 SoT
//
// traceErrorChain / formatErrorChainSummary / formatErrorChain 는 이 파일에 집중 관리.
// (구 error.ts 에 있던 동일 함수들을 IS-10에 따라 분리)

import { FEError } from '@/api/error';

/**
 * 에러 체인을 따라 ORIGIN(가장 안쪽 원인)까지 추적한다.
 *
 * 탐색 우선순위 (feature_spec_fe-api-connect_vN §4.2):
 *  1. FEError.context.cause  — frame_spec_frontend_vN §6.4 정합 (IS-8 해소)
 *  2. ES2022 Error.cause     — 표준 fallback
 */
export function traceErrorChain(error: unknown): unknown[] {
  const chain: unknown[] = [];
  let current: unknown = error;

  while (current != null) {
    chain.push(current);

    // FEError.context.cause 우선 탐색 (frame_spec v5 §6.4 정합)
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

/**
 * 체인을 한 줄 요약으로 포매팅 — AI 디버깅 전달용 (exception_design_vN §2.5).
 * @param error 체인의 시작(가장 바깥) 에러
 */
export function formatErrorChainSummary(error: unknown): string {
  const chain = traceErrorChain(error);
  const origin = chain[chain.length - 1];
  if (origin instanceof FEError) return `[${origin.code}] ${origin.message}`;
  if (origin instanceof Error) return origin.message;
  return String(origin);
}

/**
 * 체인을 다중 라인 문자열로 포매팅 — 콘솔 디버깅용 (exception_design_vN §2.3).
 * @param error 체인의 시작 에러
 */
export function formatErrorChain(error: unknown): string {
  const chain = traceErrorChain(error);
  if (chain.length === 0) return '(empty error chain)';

  return chain
    .map((e, i) => {
      const prefix = i === 0 ? 'ORIGIN' : '      ';
      const arrow = i === 0 ? '  ' : ' └─ ';
      if (e instanceof Error) {
        return `${prefix}${arrow}[${e.constructor.name}] ${e.message}`;
      }
      return `${prefix}${arrow}${String(e)}`;
    })
    .join('\n');
}
