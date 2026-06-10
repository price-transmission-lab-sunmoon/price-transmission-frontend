import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { MainPage } from '@/pages/MainPage';
import { MethodologyPage } from '@/pages/MethodologyPage';

// 3D 여정은 three 번들이 커서 지연 로드(기존 페이지 초기 번들 격리).
const JourneyPage = lazy(() =>
  import('@/pages/JourneyPage').then((m) => ({ default: m.JourneyPage })),
);

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
  {
    path: '/journey',
    element: (
      <AppShell>
        <Suspense
          fallback={
            <div className="p-8 text-tertiary text-[14px]">3D 분석 여정 불러오는 중…</div>
          }
        >
          <JourneyPage />
        </Suspense>
      </AppShell>
    ),
  },
]);
