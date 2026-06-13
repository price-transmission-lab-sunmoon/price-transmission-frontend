import { Header } from './Header';
import { FilterBar } from './FilterBar';
import { Banner } from './Banner';
import { Panel } from './Panel';
import { OnboardingGuide } from './OnboardingGuide';
import { HelpFloatingButton } from './HelpFloatingButton';
import { useAppStore } from '@/stores/useAppStore';
import type { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const activeTab = useAppStore((s) => s.activeTab);
  const isMethodology = activeTab === 'methodology';
  const isJourney = activeTab === 'journey';

  return (
    <div className="flex flex-col h-screen bg-canvas text-primary">
      <a href="#main-content" className="skip-link">
        메인으로 건너뛰기
      </a>
      <Banner />
      <Header />
      {/* 방법론, 여정 탭에서는 필터 바 미표시 */}
      {!isMethodology && !isJourney && <FilterBar />}
      <div className="flex flex-1 overflow-hidden">
        <main
          id="main-content"
          data-testid="main-area"
          className={isJourney ? 'flex-1 overflow-hidden' : 'flex-1 overflow-auto px-8 py-6'}
        >
          {children}
        </main>
        {/* 방법론, 여정 탭에서는 패널 미표시 */}
        {!isMethodology && !isJourney && <Panel />}
      </div>
      {/* 항상 마운트, 표시는 isOnboardingVisible로 제어 */}
      <OnboardingGuide />
      <HelpFloatingButton />
    </div>
  );
}
