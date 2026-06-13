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
    // 산점도는 X축과 Y축 모두 변화율(%) 동일 단위이므로 정사각형 컨테이너로 Y축을 충분히 확보한다.
    return (
      <div className="flex flex-col h-full items-center justify-center gap-2 overflow-hidden">
        <div className="w-full h-full max-w-[min(100%,calc(100vh-260px))] aspect-square">
          <ScatterChart />
        </div>
      </div>
    );
  }

  // 기본: stream 뷰
  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex-1 min-h-0 overflow-hidden">
        <StreamChart />
      </div>
      <Minimap variant="stream" />
    </div>
  );
}
