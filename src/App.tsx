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
      // 영구 실패 코드(4xx 등)는 재시도하지 않는다. 네트워크 오류만 최대 2회.
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

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
