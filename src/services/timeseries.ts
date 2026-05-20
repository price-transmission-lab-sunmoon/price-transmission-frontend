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
  // P1-4 클러스터링 필드 (cluster 묶일 때만 채움)
  cluster_size?: number;
  cluster_period_range?: [string, string];
}

export interface StreamChartData {
  series: StreamChartSeries[];
  anomalies: StreamChartAnomaly[]; // 클러스터링 결과 (초기 렌더)
  rawAnomalies: StreamChartAnomaly[]; // 원본 (확대 줌 시 펼침용)
  domainFrom: Date;
  domainTo: Date;
}

function parseYYYYMM(period: string): Date {
  const [year, month] = period.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

// P1-4: 인접 노드 클러스터링.
// anomalies 수가 임계치 초과 시 동일 segment 인접 윈도우 묶기.
// 윈도우 크기는 전체 기간 / 노드 수 비율로 동적 결정 (밀집도 비례).
const GRADE_RANK: Record<ConfidenceGrade, number> = { high: 3, medium: 2, reference: 1 };

function clusterAnomalies(
  anomalies: StreamChartAnomaly[],
  thresholdCount = 30,
): StreamChartAnomaly[] {
  if (anomalies.length <= thresholdCount) return anomalies;

  // 전체 시간 범위(ms) / 노드 수 → 평균 간격. 그 절반을 cluster 윈도우로.
  const sortedByTime = [...anomalies].sort((a, b) => a.period.getTime() - b.period.getTime());
  const spanMs = sortedByTime[sortedByTime.length - 1].period.getTime() - sortedByTime[0].period.getTime();
  const avgGapMs = spanMs / anomalies.length;
  const windowMs = Math.max(avgGapMs * 1.5, 30 * 24 * 3600 * 1000); // 최소 30일

  const bySegment = new Map<SegmentId, StreamChartAnomaly[]>();
  for (const a of sortedByTime) {
    const arr = bySegment.get(a.segment_id) ?? [];
    arr.push(a);
    bySegment.set(a.segment_id, arr);
  }

  const out: StreamChartAnomaly[] = [];
  for (const [, group] of bySegment) {
    let bucket: StreamChartAnomaly[] = [];
    const flush = () => {
      if (bucket.length === 0) return;
      if (bucket.length === 1) {
        out.push(bucket[0]);
      } else {
        // 대표 = 최고 등급 + 최신 (등급 우선)
        const rep = [...bucket].sort((x, y) => {
          const r = GRADE_RANK[y.confidence_grade] - GRADE_RANK[x.confidence_grade];
          if (r !== 0) return r;
          return y.period.getTime() - x.period.getTime();
        })[0];
        out.push({
          ...rep,
          cluster_size: bucket.length,
          cluster_period_range: [bucket[0].periodStr, bucket[bucket.length - 1].periodStr],
        });
      }
      bucket = [];
    };
    for (const n of group) {
      if (bucket.length === 0) {
        bucket.push(n);
        continue;
      }
      const last = bucket[bucket.length - 1];
      if (n.period.getTime() - last.period.getTime() <= windowMs) {
        bucket.push(n);
      } else {
        flush();
        bucket.push(n);
      }
    }
    flush();
  }
  return out;
}

export function buildStreamChartData(
  response: StreamResponse,
  activeSegments: SegmentId[],
  confidenceFilter: ConfidenceGrade[],
): StreamChartData {
  const segmentSet = new Set<SegmentId>(activeSegments.length > 0 ? activeSegments : (response.series.map((s) => s.segment_id) as SegmentId[]));

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
    confidenceFilter.length > 0 ? confidenceFilter : (['high', 'medium', 'reference'] as ConfidenceGrade[]),
  );

  const anomalies: StreamChartAnomaly[] = response.anomaly_nodes
    .filter(
      (n: StreamAnomalyNode) =>
        segmentSet.has(n.segment_id as SegmentId) &&
        gradeSet.has(n.confidence_grade as ConfidenceGrade),
    )
    .map((n: StreamAnomalyNode) => ({
      anomaly_id: n.anomaly_id,
      segment_id: n.segment_id as SegmentId,
      period: parseYYYYMM(n.period),
      periodStr: n.period,
      confidence_grade: n.confidence_grade as ConfidenceGrade,
      transmission_rate: n.transmission_rate,
      primary_pattern: n.primary_pattern,
      is_new: n.is_new,
    }));

  const allPeriods = series.flatMap((s) => s.data.map((p) => p.period.getTime()));
  const domainFrom = allPeriods.length > 0 ? new Date(Math.min(...allPeriods)) : new Date();
  const domainTo = allPeriods.length > 0 ? new Date(Math.max(...allPeriods)) : new Date();

  const clusteredAnomalies = clusterAnomalies(anomalies);

  return {
    series,
    anomalies: clusteredAnomalies,
    rawAnomalies: anomalies,
    domainFrom,
    domainTo,
  };
}
