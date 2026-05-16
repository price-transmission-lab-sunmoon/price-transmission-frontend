import { useRef, useCallback } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { ANOMALY_COLORS } from '@/utils/colorUtils';
import { usePanelDetail } from '@/hooks/usePanelDetail';
import { useStatSeries } from '@/hooks/useStatSeries';
import { useStatSnapshot } from '@/hooks/useStatSnapshot';
import { useIRF } from '@/hooks/useIRF';
import { useMLMap } from '@/hooks/useMLMap';
import { formatNum, formatPct, confidenceLabel, patternLabel, mlModelLabel } from '@/services/anomaly';
import { TransmissionRateChart } from '@/components/charts/TransmissionRateChart';
import { ZScoreChart } from '@/components/charts/ZScoreChart';
import { ECTChart } from '@/components/charts/ECTChart';
import { BreakpointsChart } from '@/components/charts/BreakpointsChart';
import { IQRBoxplot } from '@/components/charts/IQRBoxplot';
import { AsymmetryHistogram } from '@/components/charts/AsymmetryHistogram';
import { IRFChart } from '@/components/charts/IRFChart';
import { MLMapChart } from '@/components/charts/MLMapChart';
import type { StatSeriesMetric, StatSnapshotMetric, MlModel } from '@/types/literals';

type PanelSectionId = 'stat' | 'ml' | 'path' | 'irf';

// ── sub-components ──────────────────────────────────────────────────────────

function ConfidenceBadge({ grade }: { grade: string }) {
  const color =
    grade === 'high'
      ? ANOMALY_COLORS.high
      : grade === 'medium'
        ? ANOMALY_COLORS.medium
        : '#64748b';
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[10px] font-semibold border"
      style={{ color, borderColor: color, backgroundColor: `${color}20` }}
    >
      {confidenceLabel(grade)}
    </span>
  );
}

function SectionHeader({
  title,
  sectionKey,
}: {
  title: string;
  sectionKey: PanelSectionId;
}) {
  const expandedSections = useAppStore((s) => s.expandedSections);
  const toggleSection = useAppStore((s) => s.toggleSection);
  const isOpen = expandedSections.has(sectionKey);
  return (
    <button
      aria-expanded={isOpen}
      onClick={() => toggleSection(sectionKey)}
      className="w-full flex items-center justify-between px-3 py-2 border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors"
    >
      <span className="text-slate-300 text-xs font-medium">{title}</span>
      <span className="text-slate-500 text-[10px]">{isOpen ? '▴' : '▾'}</span>
    </button>
  );
}

function StatRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-slate-500 text-[11px]">{label}</span>
      <span
        className="text-[11px] font-mono"
        style={{ color: highlight ? ANOMALY_COLORS.high : '#94a3b8' }}
      >
        {value}
      </span>
    </div>
  );
}

const STAT_SERIES_METRICS: { key: StatSeriesMetric; label: string }[] = [
  { key: 'transmission_rate', label: '전달률 시계열' },
  { key: 'zscore', label: 'Z-Score 시계열' },
  { key: 'ect', label: 'ECT 시계열' },
  { key: 'breakpoints', label: '구조변화 시계열' },
];

const STAT_SNAPSHOT_METRICS: { key: StatSnapshotMetric; label: string }[] = [
  { key: 'iqr', label: 'IQR 박스플롯' },
  { key: 'asymmetry', label: '비대칭 히스토그램' },
];

function InlineChartSection({
  anomalyId,
  metric,
  label,
}: {
  anomalyId: number;
  metric: StatSeriesMetric;
  label: string;
}) {
  const expandedInlineCharts = useAppStore((s) => s.expandedInlineCharts);
  const toggleInlineChart = useAppStore((s) => s.toggleInlineChart);
  const isOpen = expandedInlineCharts.has(metric);

  const { data, isLoading } = useStatSeries({ anomalyId, metric, enabled: isOpen });

  return (
    <div className="border border-slate-700/40 rounded overflow-hidden">
      <button
        aria-expanded={isOpen}
        onClick={() => toggleInlineChart(metric)}
        className="w-full flex items-center justify-between px-2 py-1.5 bg-slate-800/60 hover:bg-slate-700/30 transition-colors"
      >
        <span className="text-slate-400 text-[11px]">{label}</span>
        <span className="text-slate-600 text-[9px]">{isOpen ? '▴' : '▾'}</span>
      </button>
      {isOpen && (
        <div className="px-2 pb-2 pt-1">
          {isLoading && (
            <div className="flex items-center justify-center h-20 text-slate-600 text-[10px]">
              로딩 중…
            </div>
          )}
          {data && metric === 'transmission_rate' && data.metric === 'transmission_rate' && (
            <TransmissionRateChart data={data.data} />
          )}
          {data && metric === 'zscore' && data.metric === 'zscore' && (
            <ZScoreChart data={data.data} />
          )}
          {data && metric === 'ect' && data.metric === 'ect' && (
            <ECTChart data={data.data} />
          )}
          {data && metric === 'breakpoints' && data.metric === 'breakpoints' && (
            <BreakpointsChart data={data.data} bpDates={data.bp_dates} />
          )}
        </div>
      )}
    </div>
  );
}

function SnapshotSection({
  anomalyId,
  metric,
  label,
}: {
  anomalyId: number;
  metric: StatSnapshotMetric;
  label: string;
}) {
  const expandedInlineCharts = useAppStore((s) => s.expandedInlineCharts);
  const toggleInlineChart = useAppStore((s) => s.toggleInlineChart);
  const isOpen = expandedInlineCharts.has(metric);

  const { data, isLoading } = useStatSnapshot({ anomalyId, metric, enabled: isOpen });

  return (
    <div className="border border-slate-700/40 rounded overflow-hidden">
      <button
        aria-expanded={isOpen}
        onClick={() => toggleInlineChart(metric)}
        className="w-full flex items-center justify-between px-2 py-1.5 bg-slate-800/60 hover:bg-slate-700/30 transition-colors"
      >
        <span className="text-slate-400 text-[11px]">{label}</span>
        <span className="text-slate-600 text-[9px]">{isOpen ? '▴' : '▾'}</span>
      </button>
      {isOpen && (
        <div className="px-2 pb-2 pt-1">
          {isLoading && (
            <div className="flex items-center justify-center h-20 text-slate-600 text-[10px]">
              로딩 중…
            </div>
          )}
          {data && metric === 'iqr' && data.metric === 'iqr' && (
            <IQRBoxplot data={data} />
          )}
          {data && metric === 'asymmetry' && data.metric === 'asymmetry' && (
            <AsymmetryHistogram data={data} />
          )}
        </div>
      )}
    </div>
  );
}

function MlBarRow({
  anomalyId,
  model,
  score,
  percentile,
  isAnomaly,
}: {
  anomalyId: number;
  model: MlModel;
  score: number;
  percentile: number;
  isAnomaly: boolean;
}) {
  const expandedMLMaps = useAppStore((s) => s.expandedMLMaps);
  const toggleMLMap = useAppStore((s) => s.toggleMLMap);
  const isOpen = expandedMLMaps.has(model);

  const { data, isLoading } = useMLMap({ anomalyId, model, enabled: isOpen });

  const barColor = isAnomaly ? ANOMALY_COLORS.high : '#475569';

  return (
    <div className="flex flex-col gap-1">
      <button
        aria-expanded={isOpen}
        onClick={() => toggleMLMap(model)}
        className="w-full flex items-center gap-2 px-2 py-1.5 bg-slate-800/60 rounded hover:bg-slate-700/30 transition-colors"
      >
        <span className="text-slate-400 text-[11px] w-24 shrink-0 text-left">
          {mlModelLabel(model)}
        </span>
        <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${percentile}%`, backgroundColor: barColor }}
          />
        </div>
        <span className="text-[10px] font-mono w-10 text-right" style={{ color: barColor }}>
          {formatNum(score)}
        </span>
        <span className="text-slate-600 text-[9px]">{isOpen ? '▴' : '▾'}</span>
      </button>
      {isOpen && (
        <div className="px-2 pb-2">
          {isLoading && (
            <div className="flex items-center justify-center h-20 text-slate-600 text-[10px]">
              로딩 중…
            </div>
          )}
          {data && (
            <MLMapChart
              points={data.points}
              xLabel={data.x_label}
              yLabel={data.y_label}
            />
          )}
        </div>
      )}
    </div>
  );
}

function DragHandle({ onDrag }: { onDrag: (dx: number) => void }) {
  const isDragging = useRef(false);
  const lastX = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      lastX.current = e.clientX;
      e.preventDefault();

      const onMouseMove = (me: MouseEvent) => {
        if (!isDragging.current) return;
        const dx = lastX.current - me.clientX;
        lastX.current = me.clientX;
        onDrag(dx);
      };
      const onMouseUp = () => {
        isDragging.current = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [onDrag],
  );

  return (
    <div
      onMouseDown={onMouseDown}
      className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-slate-500/40 transition-colors"
    />
  );
}

// ── main Panel ───────────────────────────────────────────────────────────────

export function Panel() {
  const isPanelOpen = useAppStore((s) => s.isPanelOpen);
  const selectedAnomalyId = useAppStore((s) => s.selectedAnomalyId);
  const closePanel = useAppStore((s) => s.closePanel);
  const panelWidth = useAppStore((s) => s.panelWidth);
  const setPanelWidth = useAppStore((s) => s.setPanelWidth);
  const expandedSections = useAppStore((s) => s.expandedSections);

  const { data: detail, isLoading } = usePanelDetail(selectedAnomalyId);

  const irfEnabled = expandedSections.has('irf');
  const { data: irfData, isLoading: irfLoading } = useIRF({
    anomalyId: selectedAnomalyId,
    enabled: irfEnabled,
  });

  const handleDrag = useCallback(
    (dx: number) => {
      setPanelWidth(Math.min(520, Math.max(280, panelWidth + dx)));
    },
    [panelWidth, setPanelWidth],
  );

  if (!isPanelOpen) return null;

  const mlRows = detail
    ? [
        {
          model: 'isolation_forest' as const,
          score: detail.ml_summary.if_score,
          percentile: detail.ml_summary.if_percentile,
          isAnomaly: detail.ml_summary.if_anomaly,
        },
        {
          model: 'lof' as const,
          score: detail.ml_summary.lof_score,
          percentile: detail.ml_summary.lof_percentile,
          isAnomaly: detail.ml_summary.lof_anomaly,
        },
        {
          model: 'ocsvm' as const,
          score: detail.ml_summary.svm_score,
          percentile: detail.ml_summary.svm_percentile,
          isAnomaly: detail.ml_summary.svm_anomaly,
        },
      ]
    : [];

  return (
    <aside
      data-testid="panel"
      style={{ width: panelWidth }}
      className="relative shrink-0 bg-slate-900 border-l border-slate-700/60 flex flex-col overflow-hidden"
    >
      <DragHandle onDrag={handleDrag} />

      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {isLoading && <span className="text-slate-600 italic text-[11px]">로딩 중…</span>}
            {detail && (
              <>
                <span className="font-medium">{detail.commodity_name_kr}</span>
                <span className="text-slate-600">·</span>
                <span>{detail.segment_label_kr}</span>
                <span className="text-slate-600">·</span>
                <span className="font-mono text-[11px]">{detail.period}</span>
              </>
            )}
          </div>
          <button
            aria-label="패널 닫기"
            onClick={closePanel}
            className="text-slate-500 hover:text-slate-300 text-sm leading-none ml-2"
          >
            ✕
          </button>
        </div>

        {detail && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <ConfidenceBadge grade={detail.confidence_grade} />
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
              {patternLabel(detail.primary_pattern)}
            </span>
            {detail.is_new && (
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-semibold border"
                style={{
                  color: ANOMALY_COLORS.high,
                  borderColor: ANOMALY_COLORS.high,
                  backgroundColor: `${ANOMALY_COLORS.high}20`,
                }}
              >
                NEW
              </span>
            )}
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {/* ── 계량경제학 수치 ── */}
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-lg overflow-hidden">
          <SectionHeader title="계량경제학 수치" sectionKey="stat" />
          {expandedSections.has('stat') && (
            <div className="p-3 space-y-2">
              {detail && (
                <div className="space-y-0.5 mb-3">
                  <StatRow
                    label="전달률"
                    value={formatPct(detail.stat_metrics.transmission_rate)}
                    highlight={
                      detail.stat_metrics.transmission_rate !== null &&
                      detail.stat_metrics.transmission_rate > 1.0
                    }
                  />
                  <StatRow
                    label="Z-Score"
                    value={formatNum(detail.stat_metrics.zscore)}
                    highlight={detail.stat_metrics.zscore_alert}
                  />
                  <StatRow
                    label="ECT / 스프레드"
                    value={formatNum(detail.stat_metrics.ect_or_spread)}
                  />
                  <StatRow
                    label="Rolling Mean"
                    value={formatNum(detail.stat_metrics.rolling_mean)}
                  />
                  {detail.stat_metrics.asymmetry_significant && (
                    <>
                      <StatRow
                        label="α+ (상방)"
                        value={formatNum(detail.stat_metrics.alpha_plus)}
                      />
                      <StatRow
                        label="α− (하방)"
                        value={formatNum(detail.stat_metrics.alpha_minus)}
                      />
                      <StatRow
                        label="Wald p-value"
                        value={formatNum(detail.stat_metrics.wald_pvalue, 3)}
                        highlight
                      />
                    </>
                  )}
                </div>
              )}
              {selectedAnomalyId !== null &&
                STAT_SERIES_METRICS.map(({ key, label }) => (
                  <InlineChartSection
                    key={key}
                    anomalyId={selectedAnomalyId}
                    metric={key}
                    label={label}
                  />
                ))}
              {selectedAnomalyId !== null &&
                STAT_SNAPSHOT_METRICS.map(({ key, label }) => (
                  <SnapshotSection
                    key={key}
                    anomalyId={selectedAnomalyId}
                    metric={key}
                    label={label}
                  />
                ))}
            </div>
          )}
        </div>

        {/* ── ML 판정 ── */}
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-lg overflow-hidden">
          <SectionHeader title="ML 판정" sectionKey="ml" />
          {expandedSections.has('ml') && (
            <div className="p-3 space-y-1">
              {detail && (
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-slate-500 text-[11px]">ML 투표:</span>
                  <span className="text-slate-300 text-[11px] font-mono">
                    {detail.ml_summary.ml_vote} / 3
                  </span>
                  {detail.ml_summary.ml_detected && (
                    <span
                      className="px-1 py-0.5 rounded text-[9px] font-semibold"
                      style={{ color: ANOMALY_COLORS.high, backgroundColor: `${ANOMALY_COLORS.high}20` }}
                    >
                      ML 탐지
                    </span>
                  )}
                </div>
              )}
              {selectedAnomalyId !== null &&
                mlRows.map((row) => (
                  <MlBarRow
                    key={row.model}
                    anomalyId={selectedAnomalyId}
                    model={row.model}
                    score={row.score}
                    percentile={row.percentile}
                    isAnomaly={row.isAnomaly}
                  />
                ))}
            </div>
          )}
        </div>

        {/* ── 패턴 판정 경로 ── */}
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-lg overflow-hidden">
          <SectionHeader title="패턴 판정 경로" sectionKey="path" />
          {expandedSections.has('path') && (
            <div className="p-3">
              {detail?.judgment_path.map((step) => (
                <div key={step.step} className="flex items-start gap-2 py-1">
                  <div
                    className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0"
                    style={{
                      backgroundColor: step.passed ? '#1e293b' : '#3b1c1c',
                      border: `1px solid ${step.passed ? '#334155' : ANOMALY_COLORS.high}`,
                      color: step.passed ? '#94a3b8' : ANOMALY_COLORS.high,
                    }}
                  >
                    {step.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-300 text-[11px] font-medium">{step.label}</div>
                    <div className="text-slate-500 text-[10px]">{step.value}</div>
                  </div>
                  <span
                    className="text-[10px] font-bold shrink-0"
                    style={{ color: step.passed ? '#22c55e' : ANOMALY_COLORS.high }}
                  >
                    {step.passed ? '✓' : '✗'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── IRF 차트 ── */}
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-lg overflow-hidden">
          <SectionHeader title="IRF 차트" sectionKey="irf" />
          {expandedSections.has('irf') && (
            <div className="p-3">
              {irfLoading && (
                <div className="flex items-center justify-center h-20 text-slate-600 text-[10px]">
                  로딩 중…
                </div>
              )}
              {irfData && <IRFChart irfs={irfData.irfs} />}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
