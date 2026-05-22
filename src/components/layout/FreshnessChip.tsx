import { useFreshness } from '@/hooks/useFreshness';
import { formatYearMonthKr, formatDateKr } from '@/utils/dateUtils';

export function FreshnessChip() {
  const { data, isLoading } = useFreshness();

  if (isLoading || !data) {
    return (
      <div
        aria-label="데이터 기준 시점 로딩 중"
        className="flex items-center gap-2 h-[30px] px-3 bg-surface border border-dashed border-border-default rounded-md text-[12px]"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" />
        <span className="text-tertiary animate-pulse">…</span>
      </div>
    );
  }

  const baseLabel = formatYearMonthKr(data.data_up_to);
  const nextLabel = formatDateKr(data.next_run_date);

  return (
    <div
      aria-label={`데이터 기준 시점: ${baseLabel} 기준, 다음 갱신 ${nextLabel} 예정`}
      className="flex items-center gap-2 h-[30px] px-3 bg-surface border border-border-default rounded-md text-[12px] text-secondary"
    >
      <div
        className="w-[7px] h-[7px] rounded-full bg-success live-indicator"
        aria-hidden
      />
      <span>
        <span className="font-mono text-secondary">{baseLabel}</span>
        <span className="text-[var(--text-muted)] mx-1.5">·</span>
        <span className="text-tertiary">
          다음 갱신 <span className="font-mono">{nextLabel}</span> 예정
        </span>
      </span>
    </div>
  );
}
