import { StreamChart } from '@/components/charts/StreamChart';

export function MainPage() {
  return (
    <div className="flex flex-col h-full gap-3">
      {/* §4.1 스트림 그래프 영역 */}
      <div className="flex-1 bg-slate-800/30 border border-slate-700/60 rounded-lg overflow-hidden">
        <StreamChart />
      </div>

      {/* §4.1 하단 미니맵 — 자리 표시자 (feat/fe-minimap) */}
      <div className="h-14 bg-slate-800/30 border border-slate-700/50 rounded-lg flex items-center justify-center gap-2">
        <span className="text-slate-600 text-xs">연도별 이상 밀도 미니맵</span>
        <span className="text-slate-700 text-[10px] font-mono">feat/fe-minimap</span>
      </div>
    </div>
  );
}
