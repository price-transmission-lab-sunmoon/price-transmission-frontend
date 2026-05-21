import * as d3 from 'd3';
import type { StreamChartAnomaly, StreamChartData } from '@/services/timeseries';

// 노드 spread 정책 — pixel distance 기반 단일 진실 공급원.
// 시간 기반 cluster (서비스 레이어)와 분리. 줌인하면 자연 해체.
export const NODE_PROXIMITY_PX = 16;
export const NODE_SPREAD_PX = 14;

export interface NodeBucketInfo {
  idx: number;
  size: number;
}

// segment별 시간 정렬 후 인접 cx 픽셀거리 >NODE_PROXIMITY_PX이면 bucket 끊음.
// 반환: anomaly_id → {idx, size}
export function computeNodeBuckets(
  anomalies: StreamChartAnomaly[],
  xScale: d3.ScaleTime<number, number>,
): Map<number, NodeBucketInfo> {
  const out = new Map<number, NodeBucketInfo>();
  const bySeg = new Map<string, StreamChartAnomaly[]>();
  for (const an of anomalies) {
    const arr = bySeg.get(an.segment_id) ?? [];
    arr.push(an);
    bySeg.set(an.segment_id, arr);
  }
  for (const [, segNodes] of bySeg) {
    const sorted = [...segNodes].sort((a, b) => a.period.getTime() - b.period.getTime());
    let bucketStart = 0;
    const flush = (endExclusive: number) => {
      const size = endExclusive - bucketStart;
      for (let i = bucketStart; i < endExclusive; i++) {
        out.set(sorted[i].anomaly_id, { idx: i - bucketStart, size });
      }
      bucketStart = endExclusive;
    };
    for (let i = 1; i < sorted.length; i++) {
      const prev = xScale(sorted[i - 1].period);
      const cur = xScale(sorted[i].period);
      if (cur - prev > NODE_PROXIMITY_PX) flush(i);
    }
    flush(sorted.length);
  }
  return out;
}

// bucket idx/size → cx offset (px)
export function bucketOffsetPx(info: NodeBucketInfo): number {
  return info.size > 1 ? (info.idx - (info.size - 1) / 2) * NODE_SPREAD_PX : 0;
}

// bucket 대표(첫번째 노드)의 size — 배지 표시용. 대표가 아니면 0 (배지 없음).
export function bucketBadgeSize(info: NodeBucketInfo): number {
  return info.idx === 0 && info.size > 1 ? info.size : 0;
}

// viewport 도메인 안에 보이는 anomaly transmission_rate ±3 패딩.
// fallback: series rates ±15% / 절대 fallback [-1, 2].
const Y_NODE_PAD = 3;

export function computeYDomain(
  chartData: StreamChartData,
  secondaryChartData: StreamChartData | null,
  viewFrom: Date,
  viewTo: Date,
): [number, number] {
  const inWindow = (d: Date) =>
    d.getTime() >= viewFrom.getTime() && d.getTime() <= viewTo.getTime();

  const nodeRates: number[] = [];
  for (const an of chartData.anomalies) if (inWindow(an.period)) nodeRates.push(an.transmission_rate);
  if (secondaryChartData) {
    for (const an of secondaryChartData.anomalies) if (inWindow(an.period)) nodeRates.push(an.transmission_rate);
  }

  if (nodeRates.length > 0) {
    let lo = Infinity;
    let hi = -Infinity;
    for (const r of nodeRates) {
      if (r < lo) lo = r;
      if (r > hi) hi = r;
    }
    return [lo - Y_NODE_PAD, hi + Y_NODE_PAD];
  }

  const seriesRates: number[] = [];
  for (const s of chartData.series) {
    for (const p of s.data) {
      if (p.transmission_rate !== null && !p.in_warmup_period && inWindow(p.period)) {
        seriesRates.push(p.transmission_rate);
      }
    }
  }
  if (secondaryChartData) {
    for (const s of secondaryChartData.series) {
      for (const p of s.data) {
        if (p.transmission_rate !== null && !p.in_warmup_period && inWindow(p.period)) {
          seriesRates.push(p.transmission_rate);
        }
      }
    }
  }
  if (seriesRates.length > 0) {
    let lo = Infinity;
    let hi = -Infinity;
    for (const r of seriesRates) {
      if (r < lo) lo = r;
      if (r > hi) hi = r;
    }
    const pad = Math.max((hi - lo) * 0.15, 0.5);
    return [lo - pad, hi + pad];
  }

  return [-1, 2];
}

export function parseFilterYM(s: string | null): Date | null {
  if (!s) return null;
  const [y, m] = s.split('-').map(Number);
  return new Date(y, m - 1, 1);
}

export function dateToYM(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
