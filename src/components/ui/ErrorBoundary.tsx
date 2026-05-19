// feature_spec_fe-api-connect_vN §6 — ErrorBoundary (C3)
// React 컴포넌트 트리 에러 전파 방지. FE-BOUNDARY-001 Toast 발화.
// error.cause 직접 접근 금지 — formatErrorChain(error) 사용 (frame_spec v5 §6.4 정합)

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { showToast } from '@/components/ui/Toast';
import { formatErrorChain } from '@/api/errorChain';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
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
      return (
        this.props.fallback ?? (
          <div className="flex items-center justify-center h-full text-slate-400 p-8">
            <p>오류가 발생했습니다. 페이지를 새로고침 해주세요.</p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
