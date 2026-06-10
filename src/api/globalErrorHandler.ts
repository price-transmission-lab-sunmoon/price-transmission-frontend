// exception_design_vN §2.4 + feature_spec_fe-api-connect_vN §4.3 SoT
// window.onerror / window.onunhandledrejection 전역 리스너 등록

import { formatErrorChain, formatErrorChainSummary } from '@/api/errorChain';
import { showToast } from '@/components/ui/Toast';

// @guide:API-12
export function registerGlobalErrorHandler(): void {
  window.addEventListener('error', (event) => {
    const err = event.error ?? event.message;
    console.error('[FE-GLOBAL-001] 전역 동기 오류:', formatErrorChain(err));
    showToast({
      code: 'FE-GLOBAL-001',
      variant: 'error',
      message: `예기치 못한 오류가 발생했습니다. ${formatErrorChainSummary(err)}`,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const err = event.reason;
    console.error('[FE-GLOBAL-002] 미처리 Promise rejection:', formatErrorChain(err));
    showToast({
      code: 'FE-GLOBAL-002',
      variant: 'error',
      message: `비동기 처리 중 오류가 발생했습니다. ${formatErrorChainSummary(err)}`,
    });
  });
}
