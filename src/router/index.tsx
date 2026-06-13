import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { MainPage } from '@/pages/MainPage';
import { MethodologyPage } from '@/pages/MethodologyPage';

// three 번들이 크므로 JourneyPage는 지연 로드한다.
const JourneyPage = lazy(() =>
  import('@/pages/JourneyPage').then((m) => ({ default: m.JourneyPage })),
);

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
  {
    path: '/journey',
    element: (
      <AppShell>
        <Suspense
          fallback={<div className="p-8 text-tertiary text-[14px]">3D 분석 여정 불러오는 중…</div>}
        >
          <JourneyPage />
        </Suspense>
      </AppShell>
    ),
  },
]);
