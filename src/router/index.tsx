import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { MainPage } from '@/pages/MainPage';
import { MethodologyPage } from '@/pages/MethodologyPage';

// @guide:LAYOUT-11
export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <AppShell>
        <MainPage />
      </AppShell>
    ),
  },
  {
    path: '/methodology',
    element: (
      <AppShell>
        <MethodologyPage />
      </AppShell>
    ),
  },
]);
