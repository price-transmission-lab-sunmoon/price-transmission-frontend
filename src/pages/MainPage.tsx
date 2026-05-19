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
import { useAppStore } from '@/stores/useAppStore';
import { RawPricesChart } from '@/components/charts/RawPricesChart';
import { Minimap } from '@/components/charts/Minimap';

import { useAppStore } from '@/stores/useAppStore';
import { ScatterChart } from '@/components/charts/ScatterChart';

export function MainPage() {
  const activeTab = useAppStore((s) => s.activeTab);

  if (activeTab === 'raw-prices') {
    return (
      <div className="flex flex-col h-full gap-2">
        {/* Main raw-prices chart */}
        <div className="flex-1 min-h-0">
          <RawPricesChart />
        </div>
        {/* Minimap — variant raw-prices */}
        <Minimap variant="raw-prices" />
      </div>
    );
  }

  // ── Stream view (and other tabs — placeholder) ─────────────
  const segmentLegend = [
    { label: '구간 A', desc: '국제가 → 수입단가', color: '#60a5fa' },
    { label: '구간 B', desc: '수입단가 → PPI', color: '#34d399' },
    { label: "구간 D'", desc: 'PPI → CPI', color: '#fb923c' },
  ];

  const gradeLegend = [
    { grade: '고신뢰', color: '#e24b4a' },
    { grade: '중신뢰', color: '#ef9f27' },
    { grade: '참고', color: '#c8d850' },
  ];

  return (
    <div className="flex flex-col h-full gap-3">
      {/* §3.2 이달의 이상 요약 배너 — 자리 표시자 */}
      <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/40 border border-slate-700/50 rounded-lg">
        <div className="w-2 h-2 rounded-full bg-slate-500" />
        <span className="text-slate-300 text-xs font-medium">이달의 이상 요약 배너</span>
        <span className="text-slate-600 text-[10px]">
          (`/anomalies/summary` 응답 — feat/fe-summary)
        </span>
      </div>

      {/* §4.1 스트림 그래프 영역 — 자리 표시자 */}
      <div className="flex-1 relative bg-slate-800/30 border border-slate-700/60 rounded-lg overflow-hidden">
        <svg
          className="absolute inset-0 w-full h-full opacity-10"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="grid" width="60" height="40" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 40" fill="none" stroke="#94a3b8" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        <div className="absolute top-3 left-4 flex items-center gap-3">
          {segmentLegend.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <div className="w-6 h-px" style={{ backgroundColor: s.color, opacity: 0.7 }} />
              <span className="text-[10px]" style={{ color: s.color, opacity: 0.8 }}>
                {s.label} <span className="text-slate-500">{s.desc}</span>
              </span>
            </div>
          ))}
        </div>

        <div className="absolute top-3 right-4 flex items-center gap-3">
          {gradeLegend.map((l) => (
            <div key={l.grade} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
              <span className="text-slate-500 text-[10px]">{l.grade}</span>
            </div>
          ))}
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-slate-700">
            <path
              d="M4 24 L10 16 L14 18 L20 10 L28 6"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
            <circle cx="14" cy="18" r="2" fill="currentColor" />
            <circle cx="20" cy="10" r="2.5" fill="currentColor" />
          </svg>
          <span className="text-slate-600 text-xs font-medium">
            {activeTab === 'stream' ? '스트림 그래프' : activeTab}
          </span>
          <span className="text-slate-700 text-[10px] font-mono">feat/fe-stream-chart</span>
        </div>
      </div>

      {/* §4.1 하단 미니맵 */}
      {activeTab === 'stream' ? (
        <Minimap variant="stream" />
      ) : (
        <div className="h-14 bg-slate-800/30 border border-slate-700/50 rounded-lg flex items-center justify-center gap-2">
          <span className="text-slate-600 text-xs">연도별 이상 밀도 미니맵</span>
          <span className="text-slate-700 text-[10px] font-mono">feat/fe-minimap</span>
        </div>
      )}
    </div>
  );
}
