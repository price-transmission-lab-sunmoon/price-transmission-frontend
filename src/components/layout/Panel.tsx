import { useRef, useCallback, useMemo } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { ANOMALY_COLORS, PANEL_CHART_COLORS } from '@/utils/colorUtils';
import { usePanelDetail } from '@/hooks/usePanelDetail';
import { useStreamData } from '@/hooks/useStreamData';
import { ApiError } from '@/api/error';
import { formatErrorChainSummary } from '@/api/errorChain';
import { useStatSeries } from '@/hooks/useStatSeries';
import { useStatSnapshot } from '@/hooks/useStatSnapshot';
import { useIRF } from '@/hooks/useIRF';
import { useMLMap } from '@/hooks/useMLMap';
import {
  formatNum,
  formatRatio,
  ratioRegimeLabel,
  patternLabel,
  mlModelLabel,
} from '@/services/anomaly';
import { TransmissionRateChart } from '@/components/charts/TransmissionRateChart';
import { ZScoreChart } from '@/components/charts/ZScoreChart';
import { ECTChart } from '@/components/charts/ECTChart';
import { BreakpointsChart } from '@/components/charts/BreakpointsChart';
import { IQRBoxplot } from '@/components/charts/IQRBoxplot';
import { AsymmetryHistogram } from '@/components/charts/AsymmetryHistogram';
import { IRFChart } from '@/components/charts/IRFChart';
import { MLMapChart } from '@/components/charts/MLMapChart';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icon';
import { StateView } from '@/components/ui/StateView';
import type { StatSeriesMetric, StatSnapshotMetric, MlModel } from '@/types/literals';

type PanelSectionId = 'stat' | 'ml' | 'path' | 'irf';

// ── sub-components ──────────────────────────────────────────────────────────

const SECTION_ACCENT: Record<PanelSectionId, string> = {
  stat: 'var(--brand)',
  ml: '#7c3aed',
  path: 'var(--success)',
  irf: '#059669',
};

function SectionHeader({
  title,
  sectionKey,
  count,
}: {
  title: string;
  sectionKey: PanelSectionId;
  count?: number;
}) {
  const expandedSections = useAppStore((s) => s.expandedSections);
  const toggleSection = useAppStore((s) => s.toggleSection);
  const isOpen = expandedSections.has(sectionKey);
  return (
    <button
      aria-expanded={isOpen}
      onClick={() => toggleSection(sectionKey)}
      className={[
        'w-full flex items-center gap-2.5 px-3.5 py-3 text-left',
        'transition-colors duration-fast ease-out hover:bg-subtle',
        isOpen ? 'border-b border-border-default' : '',
      ].join(' ')}
    >
      <span
        aria-hidden
        className="w-[3px] h-[14px] rounded-[1.5px] shrink-0"
        style={{ background: SECTION_ACCENT[sectionKey] }}
      />
      <span className="text-primary text-[13px] font-semibold flex-1">{title}</span>
      {count !== undefined && (
        <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 bg-muted text-tertiary rounded-pill">
          {count}
        </span>
      )}
      <Icon
        name="chevron-down"
        size={14}
        className={`text-tertiary transition-transform duration-default ease-out ${isOpen ? 'rotate-180' : ''}`}
      />
    </button>
  );
}

function StatRow({
  label,
  value,
  highlight,
  isLast,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  isLast?: boolean;
}) {
  return (
    <div
      className={[
        'flex items-center justify-between py-2 gap-3',
        isLast ? '' : 'border-b border-dashed border-border-subtle',
      ].join(' ')}
    >
      <span className="text-tertiary text-[12px]">{label}</span>
      <span
        className="text-[13px] font-mono tabular-nums"
        style={{
          color: highlight ? ANOMALY_COLORS.high : 'var(--text-primary)',
          fontWeight: highlight ? 600 : 500,
        }}
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

const INLINE_CHART_ACCENT: Record<string, string> = {
  transmission_rate: 'var(--brand)',
  zscore: '#7c3aed',
  ect: '#059669',
  breakpoints: ANOMALY_COLORS.high,
  iqr: 'var(--text-secondary)',
  asymmetry: '#ea580c',
};

function InlineChartWrapper({
  metricKey,
  label,
  isOpen,
  onToggle,
  children,
}: {
  metricKey: string;
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border-default rounded-md bg-surface overflow-hidden">
      <button
        aria-expanded={isOpen}
        onClick={onToggle}
        className={[
          'w-full flex items-center gap-2 px-3 py-2 text-left',
          'transition-colors duration-fast ease-out hover:bg-subtle',
        ].join(' ')}
      >
        <span
          aria-hidden
          className="w-[3px] h-[12px] rounded-[1.5px] shrink-0"
          style={{ background: INLINE_CHART_ACCENT[metricKey] ?? 'var(--brand)' }}
        />
        <span className="text-secondary text-[12px] font-medium flex-1">
          {label}
        </span>
        <Icon
          name="chevron-down"
          size={12}
          className={`text-tertiary transition-transform duration-default ease-out ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="px-2.5 pb-2.5 pt-1 border-t border-border-subtle">
          {children}
        </div>
      )}
    </div>
  );
}

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
    <InlineChartWrapper
      metricKey={metric}
      label={label}
      isOpen={isOpen}
      onToggle={() => toggleInlineChart(metric)}
    >
      {isLoading && (
        <div className="flex items-center justify-center h-[70px] text-tertiary text-[11px]">
          로딩 중…
        </div>
      )}
      {data && metric === 'transmission_rate' && data.metric === 'transmission_rate' && (
        <TransmissionRateChart data={data.data} highlightPeriod={data.highlight_period} />
      )}
      {data && metric === 'zscore' && data.metric === 'zscore' && (
        <ZScoreChart data={data.data} />
      )}
      {data && metric === 'ect' && data.metric === 'ect' && (
        <ECTChart data={data.data} ectType={data.data[0]?.ect_type ?? null} />
      )}
      {data && metric === 'breakpoints' && data.metric === 'breakpoints' && (
        <BreakpointsChart data={data.data} bpDates={data.bp_dates} />
      )}
    </InlineChartWrapper>
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
    <InlineChartWrapper
      metricKey={metric}
      label={label}
      isOpen={isOpen}
      onToggle={() => toggleInlineChart(metric)}
    >
      {isLoading && (
        <div className="flex items-center justify-center h-[70px] text-tertiary text-[11px]">
          로딩 중…
        </div>
      )}
      {data && metric === 'iqr' && data.metric === 'iqr' && <IQRBoxplot data={data} />}
      {data && metric === 'asymmetry' && data.metric === 'asymmetry' && (
        <AsymmetryHistogram data={data} />
      )}
    </InlineChartWrapper>
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
  score: number | null;
  percentile: number | null;
  isAnomaly: boolean;
}) {
  // BE-5: score/percentile은 null 가능. UI는 빈 바 + '—' 표시로 폴백.
  const barWidth = percentile == null ? 0 : Math.max(0, Math.min(100, percentile));
  const expandedMLMaps = useAppStore((s) => s.expandedMLMaps);
  const toggleMLMap = useAppStore((s) => s.toggleMLMap);
  const isOpen = expandedMLMaps.has(model);

  const { data, isLoading } = useMLMap({ anomalyId, model, enabled: isOpen });

  const barColor = isAnomaly ? ANOMALY_COLORS.high : PANEL_CHART_COLORS.mlMapNormalFill;

  return (
    <div className="flex flex-col gap-1">
      <button
        aria-expanded={isOpen}
        onClick={() => toggleMLMap(model)}
        className={[
          'w-full flex items-center gap-2.5 px-2.5 py-2 bg-subtle rounded-sm',
          'transition-colors duration-fast ease-out hover:bg-muted',
        ].join(' ')}
      >
        <span className="text-secondary text-[12px] font-medium min-w-[110px] shrink-0 text-left">
          {mlModelLabel(model)}
        </span>
        <div className="flex-1 h-1.5 bg-surface border border-border-subtle rounded-pill overflow-hidden">
          <div
            className="h-full rounded-pill transition-[width] duration-slow ease-out"
            style={{
              width: `${barWidth}%`,
              backgroundColor: barColor,
              boxShadow:
                isAnomaly && (score ?? 0) >= 0.8
                  ? `0 0 8px ${barColor}66`
                  : undefined,
            }}
          />
        </div>
        <span
          className="text-[12px] font-mono font-semibold min-w-[38px] text-right tabular-nums"
          style={{ color: barColor }}
        >
          {formatNum(score)}
        </span>
        <Icon
          name="chevron-down"
          size={12}
          className={`text-tertiary transition-transform duration-default ease-out ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="px-2 pb-2">
          {isLoading && (
            <div className="flex items-center justify-center h-[70px] text-tertiary text-[11px]">
              로딩 중…
            </div>
          )}
          {data && data.total_points > 0 && (
            <MLMapChart
              points={data.points}
              model={model}
              xLabel={data.x_label}
              yLabel={data.y_label}
            />
          )}
          {data && data.total_points === 0 && (
            <NotImplementedNotice
              section="ML 결과"
              extra="투영 축(PCA vs feature_direct) 확정 후 적재 예정 (OI-15)"
            />
          )}
        </div>
      )}
    </div>
  );
}

function NotImplementedNotice({
  section,
  error,
  extra,
}: {
  section: string;
  error?: unknown;
  extra?: string;
}) {
  const causeSummary = error ? formatErrorChainSummary(error) : null;
  return (
    <div className="flex flex-col gap-2 p-3 bg-warning-subtle border border-warning-border rounded-md">
      <Badge tone="warning" size="sm" uppercase>
        구현 대기
      </Badge>
      <p className="text-[12px] text-secondary leading-[1.5] m-0">
        {section}은 백엔드 Phase 7 작업 이후 표시됩니다.
      </p>
      {extra && (
        <p className="text-[11px] text-tertiary leading-snug m-0">{extra}</p>
      )}
      {causeSummary && (
        <p className="text-[10px] text-tertiary font-mono leading-snug break-words m-0">
          {causeSummary}
        </p>
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
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const onMouseMove = (me: MouseEvent) => {
        if (!isDragging.current) return;
        const dx = lastX.current - me.clientX;
        lastX.current = me.clientX;
        onDrag(dx);
      };
      const onMouseUp = () => {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
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
      className="group absolute left-0 top-0 bottom-0 w-[3px] cursor-col-resize transition-colors duration-fast hover:bg-[rgba(13,148,136,0.3)] active:bg-[rgba(13,148,136,0.6)]"
    >
      <span
        aria-hidden
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-10 bg-brand rounded-pill opacity-0 group-hover:opacity-100 transition-opacity duration-fast pointer-events-none"
      />
    </div>
  );
}

// ── Judgment path stepper ───────────────────────────────────────────────────

function JudgmentStep({
  step,
  label,
  value,
  passed,
  isLast,
}: {
  step: number;
  label: string;
  value: string;
  passed: boolean;
  isLast: boolean;
}) {
  return (
    <div className="relative flex items-start gap-3 py-2">
      <div
        className="relative w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono font-bold shrink-0 z-[1]"
        style={{
          background: passed ? 'var(--success-subtle)' : 'var(--error-subtle)',
          border: `1.5px solid ${passed ? 'var(--success)' : 'var(--error)'}`,
          color: passed ? 'var(--success)' : 'var(--error)',
        }}
      >
        {step}
      </div>
      {!isLast && (
        <span
          aria-hidden
          className="absolute left-[11px] top-8 bottom-0 w-[1.5px]"
          style={{
            background: passed
              ? 'var(--success-border)'
              : 'var(--error-border)',
          }}
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-primary text-[13px] font-medium leading-snug">
          {label}
        </div>
        <div className="text-tertiary text-[11px] font-mono mt-0.5">{value}</div>
      </div>
      <Icon
        name={passed ? 'check' : 'x'}
        size={14}
        className="mt-1 shrink-0"
        style={{ color: passed ? 'var(--success)' : 'var(--error)' }}
      />
    </div>
  );
}

// ── main Panel ───────────────────────────────────────────────────────────────

// @guide:LAYOUT-04
export function Panel() {
  const isPanelOpen = useAppStore((s) => s.isPanelOpen);
  const selectedAnomalyId = useAppStore((s) => s.selectedAnomalyId);
  const closePanel = useAppStore((s) => s.closePanel);
  const panelWidth = useAppStore((s) => s.panelWidth);
  const setPanelWidth = useAppStore((s) => s.setPanelWidth);
  const expandedSections = useAppStore((s) => s.expandedSections);

  const { data: detail, isLoading, error: detailError } = usePanelDetail(selectedAnomalyId);

  // detail 미구현(NOT_IMPLEMENTED) 시 stream anomaly_nodes에서 메타 폴백 추출.
  const { data: streamData } = useStreamData();
  const fallbackNode = useMemo(() => {
    if (detail || selectedAnomalyId == null || !streamData) return null;
    return streamData.anomaly_nodes.find((n) => n.anomaly_id === selectedAnomalyId) ?? null;
  }, [detail, selectedAnomalyId, streamData]);

  const isBackendNotImplemented =
    detailError instanceof ApiError && detailError.publicCode === 'NOT_IMPLEMENTED';

  const irfEnabled = expandedSections.has('irf');
  const { data: irfData, isLoading: irfLoading, error: irfError } = useIRF({
    anomalyId: selectedAnomalyId,
    enabled: irfEnabled,
  });
  const irfNotImplemented =
    irfError instanceof ApiError && irfError.publicCode === 'NOT_IMPLEMENTED';

  const handleDrag = useCallback(
    (dx: number) => {
      setPanelWidth(Math.min(520, Math.max(280, panelWidth + dx)));
    },
    [panelWidth, setPanelWidth],
  );

  if (!isPanelOpen) {
    const streamLoaded = streamData !== undefined;
    const hasAnyAnomaly = streamLoaded && streamData.anomaly_nodes.length > 0;
    const commodities = useAppStore.getState().commodities;
    const recommended = commodities
      .filter(
        (c) =>
          c.has_anomaly_this_month &&
          c.commodity_id !== useAppStore.getState().primaryCommodityId,
      )
      .slice(0, 3);

    return (
      <aside
        data-testid="panel"
        style={{ width: panelWidth }}
        className="relative shrink-0 bg-canvas border-l border-border-default flex flex-col items-center justify-center px-5 text-center gap-3"
      >
        {streamLoaded && !hasAnyAnomaly ? (
          <>
            <StateView
              variant="empty"
              size="large"
              icon="chart-bar-square"
              title="이 품목에는 현재 기간 내 탐지된 이상이 없습니다"
              description="필터 기간을 넓히거나 다른 품목을 살펴보세요."
            />
            {recommended.length > 0 && (
              <div className="flex flex-col gap-1.5 w-full pt-1">
                <span className="text-tertiary text-[11px] font-semibold uppercase tracking-widest">
                  이달 이상 탐지 품목
                </span>
                {recommended.map((c) => (
                  <Button
                    key={c.commodity_id}
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      useAppStore.getState().setPrimaryCommodity(c.commodity_id)
                    }
                  >
                    {c.name_kr}
                  </Button>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-tertiary text-[13px] leading-relaxed">
            이상 데이터를 선택하면
            <br />
            분석 수치가 표시됩니다.
          </p>
        )}
      </aside>
    );
  }

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
      className="relative shrink-0 bg-canvas border-l border-border-default flex flex-col overflow-hidden"
    >
      <DragHandle onDrag={handleDrag} />

      {/* Header */}
      <div className="px-5 py-4 border-b border-border-default">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
            {isLoading && (
              <span className="text-tertiary italic text-[12px]">로딩 중…</span>
            )}
            {detail && (
              <>
                <h2 className="text-primary text-[16px] font-bold tracking-tight m-0">
                  {detail.commodity_name_kr}
                </h2>
                <ConfidenceBadge grade={detail.confidence_grade} size="sm" />
                {detail.is_new && (
                  <Badge tone="warning" size="sm" uppercase>
                    NEW
                  </Badge>
                )}
              </>
            )}
            {!detail && fallbackNode && (
              <>
                <h2 className="text-primary text-[16px] font-bold tracking-tight m-0">
                  구간 {fallbackNode.segment_id === 'D_prime' ? "D'" : fallbackNode.segment_id}
                </h2>
                <ConfidenceBadge grade={fallbackNode.confidence_grade} size="sm" />
                {fallbackNode.is_new && (
                  <Badge tone="warning" size="sm" uppercase>
                    NEW
                  </Badge>
                )}
              </>
            )}
          </div>
          <IconButton
            aria-label="패널 닫기"
            onClick={closePanel}
            variant="ghost"
            size="sm"
            icon={<Icon name="x" size={14} />}
          />
        </div>

        {/* line 2: segment · period · pattern */}
        {detail && (
          <div className="flex items-center gap-2 mt-1.5 text-[12px] text-tertiary">
            <span>{detail.segment_label_kr}</span>
            <span aria-hidden className="text-border-strong">·</span>
            <span className="font-mono">{detail.period}</span>
            <span aria-hidden className="text-border-strong">·</span>
            <span className="text-brand font-medium">
              {patternLabel(detail.primary_pattern)}
            </span>
          </div>
        )}
        {!detail && fallbackNode && (
          <div className="flex items-center gap-2 mt-1.5 text-[12px] text-tertiary">
            <span className="font-mono">{fallbackNode.period}</span>
            <span aria-hidden className="text-border-strong">·</span>
            <span className="text-brand font-medium">
              {patternLabel(fallbackNode.primary_pattern)}
            </span>
          </div>
        )}

        {isBackendNotImplemented && (
          <div className="mt-3 px-3 py-2 rounded-md bg-warning-subtle border border-warning-border text-[12px] text-secondary leading-snug">
            분석 수치 패널은 백엔드 Phase 7 구현 후 연결됩니다. 현재는 노드 메타정보만 표시됩니다.
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2.5">
        {/* ── 분석 수치 ── */}
        <div
          data-testid="stat-section"
          className="bg-surface border border-border-default rounded-lg shadow-e1 overflow-hidden"
        >
          <SectionHeader title="분석 수치" sectionKey="stat" />
          {expandedSections.has('stat') && (
            <div className="px-3.5 py-3 space-y-2.5">
              {!detail && isBackendNotImplemented && (
                <NotImplementedNotice section="분석 수치" error={detailError} />
              )}
              {detail && (
                <div className="mb-1">
                  {(() => {
                    const rows = [
                      {
                        label: '전이율',
                        value: (() => {
                          const r = detail.stat_metrics.transmission_rate;
                          const reg = ratioRegimeLabel(r);
                          return reg ? `${formatRatio(r)} (${reg})` : formatRatio(r);
                        })(),
                        highlight:
                          detail.stat_metrics.iqr_outlier ||
                          detail.stat_metrics.zscore_alert,
                      },
                      {
                        label: 'Z-Score',
                        value: formatNum(detail.stat_metrics.zscore),
                        highlight: detail.stat_metrics.zscore_alert,
                      },
                      {
                        label: 'ECT / 스프레드',
                        value: formatNum(detail.stat_metrics.ect_or_spread),
                      },
                      {
                        label: 'Rolling Mean',
                        value: formatNum(detail.stat_metrics.rolling_mean),
                      },
                      ...(detail.stat_metrics.asymmetry_significant
                        ? [
                            {
                              label: 'α+ (상방)',
                              value: formatNum(detail.stat_metrics.alpha_plus),
                            },
                            {
                              label: 'α− (하방)',
                              value: formatNum(detail.stat_metrics.alpha_minus),
                            },
                            {
                              label: 'Wald p-value',
                              value: formatNum(detail.stat_metrics.wald_pvalue, 3),
                              highlight: true,
                            },
                          ]
                        : []),
                    ];
                    return rows.map((r, i) => (
                      <StatRow
                        key={r.label}
                        label={r.label}
                        value={r.value}
                        highlight={r.highlight}
                        isLast={i === rows.length - 1}
                      />
                    ));
                  })()}
                </div>
              )}
              {selectedAnomalyId !== null && (
                <div className="space-y-2 pt-2">
                  {STAT_SERIES_METRICS.map(({ key, label }) => (
                    <InlineChartSection
                      key={key}
                      anomalyId={selectedAnomalyId}
                      metric={key}
                      label={label}
                    />
                  ))}
                  {STAT_SNAPSHOT_METRICS.map(({ key, label }) => (
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
          )}
        </div>

        {/* ── ML 모델 점수 ── */}
        <div
          data-testid="ml-section"
          className="bg-surface border border-border-default rounded-lg shadow-e1 overflow-hidden"
        >
          <SectionHeader
            title="ML 모델 점수"
            sectionKey="ml"
            count={detail?.ml_summary.ml_vote ?? undefined}
          />
          {expandedSections.has('ml') && (
            <div className="px-3.5 py-3 space-y-1.5">
              {!detail && isBackendNotImplemented && (
                <NotImplementedNotice section="ML 모델 점수" error={detailError} />
              )}
              {detail && (
                <div className="flex items-center gap-2 mb-1 text-[12px]">
                  <span className="text-tertiary">ML 투표</span>
                  <span className="text-primary font-mono font-semibold">
                    {detail.ml_summary.ml_vote} / 3
                  </span>
                  {detail.ml_summary.ml_detected && (
                    <Badge tone="error" size="sm">
                      ML 탐지
                    </Badge>
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
              {detail &&
                detail.ml_summary.ml_vote >= 3 &&
                detail.ml_summary.ml_detected && (
                  <div className="flex items-center gap-2 mt-2 px-2.5 py-2 bg-subtle rounded-sm text-[11px]">
                    <Icon name="sparkles" size={12} className="text-brand" />
                    <span>
                      <span className="text-primary font-semibold">
                        {detail.ml_summary.ml_vote}/3 모델 합의
                      </span>
                      <span className="text-tertiary"> — 통계 + ML 동시 탐지</span>
                    </span>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* ── 패턴 판정 경로 ── */}
        <div className="bg-surface border border-border-default rounded-lg shadow-e1 overflow-hidden">
          <SectionHeader title="패턴 판정 경로" sectionKey="path" />
          {expandedSections.has('path') && (
            <div className="px-3.5 py-3">
              {!detail && isBackendNotImplemented && (
                <NotImplementedNotice section="패턴 판정 경로" error={detailError} />
              )}
              {detail?.judgment_path.map((step, i) => (
                <JudgmentStep
                  key={step.step}
                  step={step.step}
                  label={step.label}
                  value={step.value}
                  passed={step.passed}
                  isLast={i === detail.judgment_path.length - 1}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── IRF 차트 ── */}
        <div className="bg-surface border border-border-default rounded-lg shadow-e1 overflow-hidden">
          <SectionHeader title="IRF 차트" sectionKey="irf" />
          {expandedSections.has('irf') && (
            <div className="px-3.5 py-3">
              {irfLoading && !irfNotImplemented && (
                <div className="flex items-center justify-center h-[70px] text-tertiary text-[11px]">
                  로딩 중…
                </div>
              )}
              {irfNotImplemented && (
                <NotImplementedNotice section="IRF 차트" error={irfError} />
              )}
              {irfData && <IRFChart irfs={irfData.irfs} />}
            </div>
          )}
        </div>

        {/* IRF peak callout */}
        {detail && irfData && irfData.irfs.length > 0 && (
          <div className="flex items-start gap-2.5 px-3.5 py-3 bg-brand-subtle border border-brand-border rounded-md">
            <Icon
              name="bolt"
              size={16}
              className="text-brand mt-0.5 shrink-0"
            />
            <p className="text-[12px] text-brand-active leading-[1.5] m-0">
              IRF peak는 상류 가격 충격이 최대 반영되는 시점입니다.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
