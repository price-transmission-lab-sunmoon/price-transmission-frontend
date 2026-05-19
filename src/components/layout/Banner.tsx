import { useAnomaliesSummary } from '@/hooks/useAnomaliesSummary';
import { useAppStore } from '@/stores/useAppStore';

const GRADE_COLORS: Record<string, string> = {
  high: 'bg-red-500/20 text-red-300 border-red-500/40',
  medium: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  reference: 'bg-lime-500/20 text-lime-300 border-lime-500/40',
};

const GRADE_LABELS: Record<string, string> = {
  high: '고신뢰',
  medium: '중신뢰',
  reference: '참고',
};

// Banner는 본 feat 단독 소유 — feature_spec_fe-layout-filter_vN §1.3 C1
export function Banner() {
  const { data, isLoading } = useAnomaliesSummary();
  const setPrimaryCommodity = useAppStore((s) => s.setPrimaryCommodity);
  const selectAnomaly = useAppStore((s) => s.selectAnomaly);

  if (isLoading) {
    return (
      <div
        aria-label="이달의 이상 요약 배너 로딩 중"
        className="h-10 px-5 bg-slate-800/40 border-b border-slate-700/60 flex items-center shrink-0"
      >
        <div className="h-4 w-64 bg-slate-700 rounded animate-pulse" />
      </div>
    );
  }

  if (!data) return null;

  const { anomalies, count_diff, total_count } = data;

  if (total_count === 0) {
    return (
      <div
        role="banner"
        aria-label="이달의 이상 요약 배너"
        className="h-10 px-5 bg-slate-800/40 border-b border-slate-700/60 flex items-center gap-3 shrink-0 text-xs"
      >
        <span className="text-slate-400">이번 달 탐지된 이상이 없습니다</span>
      </div>
    );
  }

  const diffText =
    count_diff > 0
      ? `지난달보다 ${count_diff}건 증가`
      : count_diff < 0
        ? `지난달보다 ${Math.abs(count_diff)}건 감소`
        : '지난달과 동일';

  // dedup: 동일 commodity_id 중 최고 신뢰도 1건만 표시
  const seen = new Set<string>();
  const dedupedAnomalies = anomalies.filter((a) => {
    if (seen.has(a.commodity_id)) return false;
    seen.add(a.commodity_id);
    return true;
  });

  function handleBadgeClick(commodityId: string, anomalyId: number) {
    setPrimaryCommodity(commodityId);
    selectAnomaly(anomalyId);
  }

  return (
    <div
      role="banner"
      aria-label="이달의 이상 요약 배너"
      className="h-10 px-5 bg-slate-800/40 border-b border-slate-700/60 flex items-center gap-3 shrink-0 overflow-x-auto"
    >
      <span className="text-slate-400 text-xs shrink-0">이달의 이상</span>

      <div className="flex items-center gap-1.5">
        {dedupedAnomalies.map((a) => (
          <button
            key={a.anomaly_id}
            aria-label={`${a.commodity_name_kr} ${GRADE_LABELS[a.confidence_grade] ?? a.confidence_grade} 이상 — 클릭 시 해당 품목으로 이동`}
            onClick={() => handleBadgeClick(a.commodity_id, a.anomaly_id)}
            className={`flex items-center gap-1 px-2 h-5 rounded border text-[10px] font-medium transition-opacity hover:opacity-80 ${GRADE_COLORS[a.confidence_grade] ?? 'bg-slate-700 text-slate-300 border-slate-600'}`}
          >
            {a.is_new && (
              <span className="text-[8px] font-bold text-yellow-400 mr-0.5">NEW</span>
            )}
            {a.commodity_name_kr}
            <span className="opacity-70">
              {GRADE_LABELS[a.confidence_grade] ?? a.confidence_grade}
            </span>
          </button>
        ))}
      </div>

      <span className="text-slate-500 text-[11px] shrink-0 ml-1">({diffText})</span>
    </div>
  );
}
