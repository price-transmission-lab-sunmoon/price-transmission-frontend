import { Header } from './Header';
import { FilterBar } from './FilterBar';
import { Banner } from './Banner';
import { Panel } from './Panel';
import { Toast } from '@/components/ui/Toast';
import type { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white">
      {/* 이달의 이상 요약 배너 — 최상단 고정 (web_plan_vN §3.2) */}
      <Banner />
      <Header />
      <FilterBar />
      <div className="flex flex-1 overflow-hidden">
        <main data-testid="main-area" className="flex-1 overflow-auto p-6">
          {children}
        </main>
        <Panel />
      </div>
      <Toast />
    </div>
  );
}
