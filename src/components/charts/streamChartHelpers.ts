import * as d3 from 'd3';
import type { StreamChartAnomaly, StreamChartData } from '@/services/timeseries';

// pixel 거리 기반 bucket. 줌인 시 자연 해체.
export const NODE_PROXIMITY_PX = 16;
export const NODE_SPREAD_PX = 14;

export interface NodeBucketInfo {
  idx: number;
  size: number;
}

// 반환: anomaly_id를 키로 {idx, size}를 값으로 갖는 맵
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

export function bucketOffsetPx(info: NodeBucketInfo): number {
  return info.size > 1 ? (info.idx - (info.size - 1) / 2) * NODE_SPREAD_PX : 0;
}

// viewport 안 anomaly + series 통합 min/max + 10% 패딩. 데이터 없으면 [-0.5, 1.5]
const Y_PAD_RATIO = 0.1;
const Y_PAD_MIN = 0.2;

export function computeYDomain(
  chartData: StreamChartData,
  secondaryChartData: StreamChartData | null,
  viewFrom: Date,
  viewTo: Date,
): [number, number] {
  const inWindow = (d: Date) =>
    d.getTime() >= viewFrom.getTime() && d.getTime() <= viewTo.getTime();

  const all: number[] = [];

  for (const an of chartData.anomalies) {
    if (inWindow(an.period)) all.push(an.transmission_rate);
  }
  if (secondaryChartData) {
    for (const an of secondaryChartData.anomalies) {
      if (inWindow(an.period)) all.push(an.transmission_rate);
    }
  }

  // warmup 포함. Y 도메인에서 빠지면 라인이 잘린다
  for (const s of chartData.series) {
    for (const p of s.data) {
      if (p.transmission_rate !== null && inWindow(p.period)) {
        all.push(p.transmission_rate);
      }
    }
  }
  if (secondaryChartData) {
    for (const s of secondaryChartData.series) {
      for (const p of s.data) {
        if (p.transmission_rate !== null && inWindow(p.period)) {
          all.push(p.transmission_rate);
        }
      }
    }
  }

  if (all.length > 0) {
    let lo = Infinity;
    let hi = -Infinity;
    for (const r of all) {
      if (r < lo) lo = r;
      if (r > hi) hi = r;
    }
    const pad = Math.max((hi - lo) * Y_PAD_RATIO, Y_PAD_MIN);
    return [lo - pad, hi + pad];
  }

  return [-0.5, 1.5];
}

// 모든 segment의 warmup 합집합을 연속 run 단위로 묶어 [start, end] 튜플 리스트 반환
export function computeWarmupBands(series: StreamChartData['series']): Array<[Date, Date]> {
  if (series.length === 0) return [];
  const warmupSet = new Set<number>();
  for (const s of series) {
    for (const p of s.data) {
      if (p.in_warmup_period) warmupSet.add(p.period.getTime());
    }
  }
  if (warmupSet.size === 0) return [];
  const sorted = [...warmupSet].sort((a, b) => a - b);
  const bands: Array<[Date, Date]> = [];
  let runStart = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    if (cur - prev > 1000 * 60 * 60 * 24 * 45) {
      bands.push([new Date(runStart), addMonth(new Date(prev))]);
      runStart = cur;
    }
    prev = cur;
  }
  bands.push([new Date(runStart), addMonth(new Date(prev))]);
  return bands;
}

function addMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

// viewport span에 따라 X축 tick 간격 선택. d3 자동 선택은 짧은 viewport에서 3개월 단위가 되어 부적합.
export function pickXTickInterval(domain: [Date, Date]): d3.TimeInterval {
  const months = monthsBetween(domain[0], domain[1]);
  if (months <= 12) return d3.timeMonth.every(1)!;
  if (months <= 24) return d3.timeMonth.every(2)!;
  if (months <= 36) return d3.timeMonth.every(3)!;
  if (months <= 60) return d3.timeMonth.every(6)!;
  if (months <= 120) return d3.timeYear.every(1)!;
  return d3.timeYear.every(2)!;
}

export function pickXTickFormat(domain: [Date, Date]): (d: Date) => string {
  const months = monthsBetween(domain[0], domain[1]);
  if (months <= 60) return d3.timeFormat('%Y-%m');
  return d3.timeFormat('%Y');
}

function monthsBetween(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

export function parseFilterYM(s: string | null): Date | null {
  if (!s) return null;
  const [y, m] = s.split('-').map(Number);
  return new Date(y, m - 1, 1);
}

export function dateToYM(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
