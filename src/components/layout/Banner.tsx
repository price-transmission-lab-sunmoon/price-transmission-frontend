import { useAnomaliesSummary } from '@/hooks/useAnomaliesSummary';
import { useAppStore } from '@/stores/useAppStore';
import { confidenceLabel } from '@/services/anomaly';

const GRADE_COLORS: Record<string, string> = {
  high: 'bg-anomaly-high-bg text-anomaly-high border-anomaly-high-border',
  medium: 'bg-anomaly-medium-bg text-anomaly-medium border-anomaly-medium-border',
  reference:
    'bg-anomaly-reference-bg text-anomaly-reference border-anomaly-reference-border',
};

// 신뢰도 라벨은 services/anomaly.ts confidenceLabel() 단일 출처 사용 (중복 제거).
// Banner는 본 feat 단독 소유 — feature_spec_fe-layout-filter_vN §1.3 C1
// @guide:LAYOUT-05
export function Banner() {
  const { data, isLoading } = useAnomaliesSummary();
  const setPrimaryCommodity = useAppStore((s) => s.setPrimaryCommodity);
  const selectAnomaly = useAppStore((s) => s.selectAnomaly);

  if (isLoading) {
    return (
      <div
        aria-label="이달의 이상 요약 배너 로딩 중"
        className="h-10 px-5 bg-surface border-b border-border-default flex items-center shrink-0"
      >
        <div className="h-4 w-64 skeleton-bar" />
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
        className="h-10 px-5 bg-surface border-b border-border-default flex items-center gap-3 shrink-0 text-[13px]"
      >
        <span className="text-secondary">이번 달 탐지된 이상이 없습니다</span>
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
      className="h-10 px-5 bg-surface border-b border-border-default flex items-center gap-3 shrink-0 overflow-x-auto"
    >
      <span className="text-tertiary text-[12px] shrink-0 font-semibold">
        이달의 이상
      </span>

      <div className="flex items-center gap-2">
        {dedupedAnomalies.map((a) => (
          <button
            key={a.anomaly_id}
            aria-label={`${a.commodity_name_kr} ${confidenceLabel(a.confidence_grade)} 이상 — 클릭 시 해당 품목으로 이동`}
            onClick={() => handleBadgeClick(a.commodity_id, a.anomaly_id)}
            className={`flex items-center gap-1.5 px-2.5 h-[22px] rounded-md border text-[11px] font-medium transition-[background-color,border-color] duration-fast ease-out hover:opacity-90 ${GRADE_COLORS[a.confidence_grade] ?? 'bg-muted text-secondary border-border-default'}`}
          >
            {a.is_new && (
              <span className="text-[11px] font-bold text-warning mr-0.5">NEW</span>
            )}
            {a.commodity_name_kr}
            <span className="opacity-70">
              {confidenceLabel(a.confidence_grade)}
            </span>
          </button>
        ))}
      </div>

      <span className="text-tertiary text-[12px] shrink-0 ml-1 font-mono">
        ({diffText})
      </span>
    </div>
  );
}
