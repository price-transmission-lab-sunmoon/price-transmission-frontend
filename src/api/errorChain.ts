import { FEError } from '@/api/error';

// FEError.context.cause → ES2022 Error.cause 순으로 체인을 따라가며 배열로 반환한다.
export function traceErrorChain(error: unknown): unknown[] {
  const chain: unknown[] = [];
  let current: unknown = error;

  while (current != null) {
    chain.push(current);

    if (current instanceof FEError && current.context?.cause != null) {
      current = current.context.cause;
      continue;
    }

    const standardCause = (current as { cause?: unknown })?.cause;
    if (standardCause != null) {
      current = standardCause;
      continue;
    }

    break;
  }

  return chain;
}

// 체인 끝(가장 안쪽) 에러를 한 줄로 요약한다.
export function formatErrorChainSummary(error: unknown): string {
  const chain = traceErrorChain(error);
  const origin = chain[chain.length - 1];
  if (origin instanceof FEError) return `[${origin.code}] ${origin.message}`;
  if (origin instanceof Error) return origin.message;
  return String(origin);
}

// 체인 전체를 콘솔 디버깅용 다중 라인 문자열로 포매팅한다.
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
