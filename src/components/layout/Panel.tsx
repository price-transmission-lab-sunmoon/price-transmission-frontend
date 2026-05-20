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
import { formatNum, formatRatio, ratioRegimeLabel, confidenceLabel, patternLabel, mlModelLabel } from '@/services/anomaly';
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
  // §3.3 ② 헤더 신뢰도 배지 색상: ANOMALY_COLORS.high/medium/reference SoT
  const color =
    grade === 'high'
      ? ANOMALY_COLORS.high
      : grade === 'medium'
        ? ANOMALY_COLORS.medium
        : ANOMALY_COLORS.reference;
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

  // §3.3 ⑤ ML 바 차트 색상 (v3 정정): false 시 mlMapNormalFill SoT
  const barColor = isAnomaly ? ANOMALY_COLORS.high : PANEL_CHART_COLORS.mlMapNormalFill;

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
            style={{ width: `${barWidth}%`, backgroundColor: barColor }}
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
          {data && data.total_points > 0 && (
            <MLMapChart
              points={data.points}
              xLabel={data.x_label}
              yLabel={data.y_label}
            />
          )}
          {data && data.total_points === 0 && (
            <div className="flex flex-col items-center gap-1 py-3 text-center">
              <span
                className="px-1.5 py-0.5 rounded text-[9px] font-semibold border"
                style={{ color: '#fbbf24', borderColor: '#fbbf2480', backgroundColor: '#fbbf2415' }}
              >
                ML 결과 준비 중
              </span>
              <span className="text-slate-600 text-[10px] leading-snug">
                투영 축(PCA vs feature_direct) 확정 후 적재 예정 (OI-15)
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// P0-3 + P3-3: 백엔드 미구현 안내 배지 + 빈 본문 자리표시자 + cause origin 메시지 노출 (디버깅용)
function NotImplementedNotice({ section, error }: { section: string; error?: unknown }) {
  const causeSummary = error ? formatErrorChainSummary(error) : null;
  return (
    <div className="flex flex-col items-center gap-1 py-3 text-center">
      <span
        className="px-1.5 py-0.5 rounded text-[9px] font-semibold border"
        style={{
          color: '#fbbf24',
          borderColor: '#fbbf2480',
          backgroundColor: '#fbbf2415',
        }}
      >
        백엔드 구현 대기 중
      </span>
      <span className="text-slate-600 text-[10px] leading-snug">
        {section}은 Phase 7 작업 이후 표시됩니다.
      </span>
      {causeSummary && (
        <span className="text-slate-700 text-[9px] font-mono leading-snug max-w-full break-words px-2">
          {causeSummary}
        </span>
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

  const { data: detail, isLoading, error: detailError } = usePanelDetail(selectedAnomalyId);

  // P0-3: detail 미구현(NOT_IMPLEMENTED) 시 stream anomaly_nodes에서 메타 폴백 추출.
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
    // P2-2: 자동선택 실패 케이스 안내 강화.
    // stream 데이터 로드 완료 + 가용 노드 0건 → 사용자가 다른 품목으로 이동할 수 있도록 추천.
    const streamLoaded = streamData !== undefined;
    const hasAnyAnomaly = streamLoaded && streamData.anomaly_nodes.length > 0;
    const commodities = useAppStore.getState().commodities;
    const recommended = commodities
      .filter((c) => c.has_anomaly_this_month && c.commodity_id !== useAppStore.getState().primaryCommodityId)
      .slice(0, 3);

    return (
      <aside
        data-testid="panel"
        style={{ width: panelWidth }}
        className="relative shrink-0 bg-slate-900 border-l border-slate-700/60 flex flex-col items-center justify-center px-4 text-center gap-3"
      >
        {streamLoaded && !hasAnyAnomaly ? (
          <>
            <p className="text-slate-400 text-xs leading-relaxed">
              이 품목에는 현재 기간 내<br />탐지된 이상이 없습니다.
            </p>
            <p className="text-slate-600 text-[10px] leading-snug">
              필터 기간을 넓히거나 다른 품목을 살펴보세요.
            </p>
            {recommended.length > 0 && (
              <div className="flex flex-col gap-1.5 w-full pt-1">
                <span className="text-slate-500 text-[10px]">이달 이상 탐지 품목</span>
                {recommended.map((c) => (
                  <button
                    key={c.commodity_id}
                    onClick={() => useAppStore.getState().setPrimaryCommodity(c.commodity_id)}
                    className="px-2 py-1 rounded text-[11px] bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white transition-colors"
                  >
                    {c.name_kr}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-slate-500 text-xs leading-relaxed">
            이상 데이터를 선택하면<br />분석 수치가 표시됩니다.
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
            {!detail && fallbackNode && (
              <>
                <span>구간 {fallbackNode.segment_id === 'D_prime' ? "D'" : fallbackNode.segment_id}</span>
                <span className="text-slate-600">·</span>
                <span className="font-mono text-[11px]">{fallbackNode.period}</span>
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

        {/* P0-3: detail 미구현 시 stream meta로 폴백 배지 */}
        {!detail && fallbackNode && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <ConfidenceBadge grade={fallbackNode.confidence_grade} />
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
              {patternLabel(fallbackNode.primary_pattern)}
            </span>
            {fallbackNode.is_new && (
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

        {isBackendNotImplemented && (
          <div className="mt-2 px-2 py-1.5 rounded bg-amber-900/15 border border-amber-700/30 text-[10px] text-amber-300/80 leading-snug">
            분석 수치 패널은 백엔드 Phase 7 구현 후 연결됩니다. 현재는 노드 메타정보만 표시됩니다.
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
              {!detail && isBackendNotImplemented && (
                <NotImplementedNotice section="계량경제학 수치" error={detailError} />
              )}
              {detail && (
                <div className="space-y-0.5 mb-3">
                  <StatRow
                    label="전이율"
                    value={(() => {
                      const r = detail.stat_metrics.transmission_rate;
                      const reg = ratioRegimeLabel(r);
                      return reg ? `${formatRatio(r)} (${reg})` : formatRatio(r);
                    })()}
                    highlight={
                      detail.stat_metrics.iqr_outlier ||
                      detail.stat_metrics.zscore_alert
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
              {!detail && isBackendNotImplemented && (
                <NotImplementedNotice section="ML 판정" error={detailError} />
              )}
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
              {!detail && isBackendNotImplemented && (
                <NotImplementedNotice section="패턴 판정 경로" error={detailError} />
              )}
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
              {irfLoading && !irfNotImplemented && (
                <div className="flex items-center justify-center h-20 text-slate-600 text-[10px]">
                  로딩 중…
                </div>
              )}
              {irfNotImplemented && <NotImplementedNotice section="IRF 차트" error={irfError} />}
              {irfData && <IRFChart irfs={irfData.irfs} />}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
