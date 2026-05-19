import { useAppStore } from '@/stores/useAppStore';
import { StreamChart } from '@/components/charts/StreamChart';
import { ScatterChart } from '@/components/charts/ScatterChart';
import { RawPricesChart } from '@/components/charts/RawPricesChart';
import { Minimap } from '@/components/charts/Minimap';

export function MainPage() {
  const activeTab = useAppStore((s) => s.activeTab);

  if (activeTab === 'raw-prices') {
    return (
      <div className="flex flex-col h-full gap-2">
        <div className="flex-1 min-h-0">
          <RawPricesChart />
        </div>
        <Minimap variant="raw-prices" />
      </div>
    );
  }

  if (activeTab === 'scatter') {
    return (
      <div className="flex flex-col h-full gap-2">
        <div className="flex-1 min-h-0">
          <ScatterChart />
        </div>
      </div>
    );
  }

  // 기본: stream 뷰
  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex-1 bg-slate-800/30 border border-slate-700/60 rounded-lg overflow-hidden">
        <StreamChart />
      </div>
      <Minimap variant="stream" />
    </div>
  );
}
