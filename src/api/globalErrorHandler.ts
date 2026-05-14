// exception_design_vN §2.4 + feature_spec_fe-api-connect_vN §4.3 SoT
// window.onerror / window.onunhandledrejection 전역 리스너 등록
//
// IS-11: 구 error.ts의 globalErrorHandler(err) → registerGlobalErrorHandler() 로 리네임·분리.
// src/main.tsx 에서 단 한 번 호출.
//
// ⚠️ showToast 연동은 feat/fe-api-connect 브랜치에서 추가 (Toast 컴포넌트 미구현 상태).
//    현재는 console.error만 기록 (frame 단계 상태 유지).

import { formatErrorChain, formatErrorChainSummary } from '@/api/errorChain';

/**
 * 전역 에러 리스너를 등록한다.
 * React 트리 외부에서 발생하는 동기 오류와 미처리 Promise rejection을 포착.
 */
export function registerGlobalErrorHandler(): void {
  window.addEventListener('error', (event) => {
    const err = event.error ?? event.message;
    console.error('[FE-GLOBAL-001] 전역 동기 오류:', formatErrorChain(err));
    console.error('ORIGIN:', formatErrorChainSummary(err));
    // TODO(feat/fe-api-connect): showToast({ code: 'FE-GLOBAL-001', variant: 'error', ... })
  });

  window.addEventListener('unhandledrejection', (event) => {
    const err = event.reason;
    console.error('[FE-GLOBAL-002] 미처리 Promise rejection:', formatErrorChain(err));
    console.error('ORIGIN:', formatErrorChainSummary(err));
    // TODO(feat/fe-api-connect): showToast({ code: 'FE-GLOBAL-002', variant: 'error', ... })
  });
}
