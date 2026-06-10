// feature_spec_fe-api-connect_vN §3.1 — QueryClient 전역 설정 + ErrorBoundary 최상위 마운트
import { QueryClient, QueryClientProvider, QueryCache } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/router';
import { handleQueryError, isPermanentFailure } from '@/api/error';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      handleQueryError(error, query, queryClient);
    },
  }),
  defaultOptions: {
    queries: {
      // P1-3: 영구 실패 코드(NOT_IMPLEMENTED, 4xx 등)는 retry 안 함.
      // 네트워크/일시 오류만 최대 2회 재시도.
      retry: (failureCount, error) => {
        if (isPermanentFailure(error)) return false;
        return failureCount < 2;
      },
      retryDelay: 1000,
      refetchOnWindowFocus: false,
      staleTime: 0,
      gcTime: 5 * 60 * 1000,
    },
  },
});

// @guide:LAYOUT-10
export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
