import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/router';
import { client } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { useEffect } from 'react';

const queryClient = new QueryClient();

function AppInit() {
  useEffect(() => {
    client.get(ENDPOINTS.COMMODITIES_LIST).then((res) => {
      console.log('[App] /commodities mock response:', res.data);
    });
  }, []);

  return null;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInit />
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
