import { Header } from './Header';
import { FilterBar } from './FilterBar';
import { Panel } from './Panel';
import { OnboardingGuide } from './OnboardingGuide';
import { HelpFloatingButton } from './HelpFloatingButton';
import type { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white">
      <Header />
      <FilterBar />
      <div className="flex flex-1 overflow-hidden">
        <main data-testid="main-area" className="flex-1 overflow-auto p-6">
          {children}
        </main>
        <Panel />
      </div>
      {/* 항상 마운트, 표시는 조건부 (feature_spec_fe-onboarding_vN §1.3) */}
      <OnboardingGuide />
      <HelpFloatingButton />
    </div>
  );
}
