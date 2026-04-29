import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { MainPage } from '@/pages/MainPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <AppShell>
        <MainPage />
      </AppShell>
    ),
  },
]);
