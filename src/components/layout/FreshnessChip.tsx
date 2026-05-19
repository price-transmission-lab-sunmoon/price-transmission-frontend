import { useFreshness } from '@/hooks/useFreshness';
import { formatYearMonthKr, formatDateKr } from '@/utils/dateUtils';

export function FreshnessChip() {
  const { data, isLoading } = useFreshness();

  if (isLoading || !data) {
    return (
      <div
        aria-label="데이터 기준 시점 로딩 중"
        className="flex items-center gap-2 h-7 px-2.5 bg-slate-800/60 border border-dashed border-slate-700 rounded-md text-xs"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
        <span className="text-slate-500 animate-pulse">…</span>
      </div>
    );
  }

  const baseLabel = formatYearMonthKr(data.data_up_to);
  const nextLabel = formatDateKr(data.next_run_date);

  return (
    <div
      aria-label={`데이터 기준 시점: ${baseLabel} 기준, 다음 갱신 ${nextLabel} 예정`}
      className="flex items-center gap-2 h-7 px-2.5 bg-slate-800/60 border border-slate-700/60 rounded-md text-xs"
    >
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      <span className="text-slate-300">
        {baseLabel} 기준 · 다음 갱신 {nextLabel} 예정
      </span>
    </div>
  );
}
