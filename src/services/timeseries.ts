import type { StreamResponse, StreamAnomalyNode, StreamSeriesItem } from '@/types/timeseries';
import type { ConfidenceGrade, SegmentId } from '@/types/literals';

export interface StreamChartPoint {
  period: Date;
  periodStr: string;
  transmission_rate: number | null;
  upstream_pct: number;
  downstream_pct: number;
  in_warmup_period: boolean;
  has_anomaly: boolean;
  anomaly_ids: number[];
}

export interface StreamChartSeries {
  segment_id: SegmentId;
  data: StreamChartPoint[];
}

export interface StreamChartAnomaly {
  anomaly_id: number;
  segment_id: SegmentId;
  period: Date;
  periodStr: string;
  confidence_grade: ConfidenceGrade;
  transmission_rate: number;
  primary_pattern: string;
  is_new: boolean;
}

export interface StreamChartData {
  series: StreamChartSeries[];
  anomalies: StreamChartAnomaly[];
  domainFrom: Date;
  domainTo: Date;
}

function parseYYYYMM(period: string): Date {
  const [year, month] = period.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

export function buildStreamChartData(
  response: StreamResponse,
  activeSegments: SegmentId[],
  confidenceFilter: ConfidenceGrade[],
): StreamChartData {
  const segmentSet = new Set<SegmentId>(
    activeSegments.length > 0
      ? activeSegments
      : (response.series.map((s) => s.segment_id) as SegmentId[]),
  );

  const series: StreamChartSeries[] = response.series
    .filter((s: StreamSeriesItem) => segmentSet.has(s.segment_id as SegmentId))
    .map((s: StreamSeriesItem) => ({
      segment_id: s.segment_id as SegmentId,
      data: s.data.map((p) => ({
        period: parseYYYYMM(p.period),
        periodStr: p.period,
        transmission_rate: p.transmission_rate,
        upstream_pct: p.upstream_pct,
        downstream_pct: p.downstream_pct,
        in_warmup_period: p.in_warmup_period,
        has_anomaly: p.has_anomaly,
        anomaly_ids: p.anomaly_ids,
      })),
    }));

  const gradeSet = new Set<ConfidenceGrade>(
    confidenceFilter.length > 0
      ? confidenceFilter
      : (['high', 'medium', 'reference'] as ConfidenceGrade[]),
  );

  const anomalies: StreamChartAnomaly[] = response.anomaly_nodes
    .filter(
      (n: StreamAnomalyNode) =>
        segmentSet.has(n.segment_id as SegmentId) &&
        gradeSet.has(n.confidence_grade as ConfidenceGrade) &&
        n.transmission_rate !== null, // null rate는 rate 축에 배치 불가, 차트 제외
    )
    .map((n: StreamAnomalyNode) => ({
      anomaly_id: n.anomaly_id,
      segment_id: n.segment_id as SegmentId,
      period: parseYYYYMM(n.period),
      periodStr: n.period,
      confidence_grade: n.confidence_grade as ConfidenceGrade,
      transmission_rate: n.transmission_rate ?? 0, // 위 필터로 null 제외됨
      primary_pattern: n.primary_pattern,
      is_new: n.is_new,
    }));

  const allPeriods = series.flatMap((s) => s.data.map((p) => p.period.getTime()));
  const domainFrom = allPeriods.length > 0 ? new Date(Math.min(...allPeriods)) : new Date();
  const domainTo = allPeriods.length > 0 ? new Date(Math.max(...allPeriods)) : new Date();

  return { series, anomalies, domainFrom, domainTo };
}
