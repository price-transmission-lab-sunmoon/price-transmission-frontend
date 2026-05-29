// feature_spec_fe-api-connect_vN §6 — ErrorBoundary (C3)
// React 컴포넌트 트리 에러 전파 방지. FE-BOUNDARY-001 Toast 발화.
// error.cause 직접 접근 금지 — formatErrorChain(error) 사용 (frame_spec v5 §6.4 정합)

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { showToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { formatErrorChain } from '@/api/errorChain';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage?: string;
  errorStack?: string;
}

// @guide:UI-09
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message,
      errorStack: error.stack,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] FE-BOUNDARY-001:', formatErrorChain(error));
    console.error('Component stack:', info.componentStack);
    showToast({
      code: 'FE-BOUNDARY-001',
      variant: 'error',
      message: '컴포넌트 오류가 발생했습니다. 페이지를 새로고침 해주세요.',
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      const isDev =
        typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 gap-4 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center bg-error-subtle border border-error-border"
            style={{ color: 'var(--error)' }}
          >
            <Icon name="alert" size={32} />
          </div>
          <h2 className="text-[16px] font-semibold text-primary m-0">
            예기치 못한 오류가 발생했습니다
          </h2>
          <p
            className="text-[14px] text-secondary leading-[1.625] m-0"
            style={{ maxWidth: 480 }}
          >
            페이지를 새로고침하거나 잠시 후 다시 시도해주세요. 문제가
            계속되면 관리자에게 문의하세요.
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={() => window.location.reload()}
            className="mt-2"
          >
            페이지 새로고침
          </Button>
          {isDev && this.state.errorMessage && (
            <details className="mt-4 w-full max-w-[640px] text-left">
              <summary className="text-[12px] text-tertiary cursor-pointer">
                Error details (dev)
              </summary>
              <pre className="mt-2 p-3 bg-subtle border border-border-default rounded-md font-mono text-[11px] text-tertiary overflow-auto">
                {this.state.errorMessage}
                {'\n\n'}
                {this.state.errorStack}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
