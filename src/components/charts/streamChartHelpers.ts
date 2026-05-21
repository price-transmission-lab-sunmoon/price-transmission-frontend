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

// viewport Y 도메인 — anomaly rate + series rate 통합 min/max + 10% 패딩.
// 정책 (신뢰도 우선):
//  - anomaly만 기준 ±3 패딩 정책 폐기 (변동성 시각적 과장 원인).
//  - 통합 데이터 (anomaly + 모든 series) min/max 사용.
//  - 패딩 = (hi-lo) * 0.10, 최소 0.2 (너무 작아서 라인이 축 닿는 것 방지).
//  - fallback: 데이터 없으면 [-0.5, 1.5] (역전~과잉 범위 기본 가독).
const Y_PAD_RATIO = 0.10;
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

  // anomaly nodes
  for (const an of chartData.anomalies) {
    if (inWindow(an.period)) all.push(an.transmission_rate);
  }
  if (secondaryChartData) {
    for (const an of secondaryChartData.anomalies) {
      if (inWindow(an.period)) all.push(an.transmission_rate);
    }
  }

  // series rates (warmup 포함 — 라인이 통과하므로 Y 도메인에서 누락하면 라인이 잘림)
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

// warmup 배경 band 계산.
// 모든 segment의 in_warmup_period=true 점들의 합집합을 시간순으로 정렬 → 연속 run 묶음.
// 반환: [start, end] Date 튜플 리스트. end는 마지막 warmup 점의 다음 month 시작점
// (band 폭이 1개월치는 되도록).
export function computeWarmupBands(
  series: StreamChartData['series'],
): Array<[Date, Date]> {
  if (series.length === 0) return [];
  const warmupSet = new Set<number>();
  for (const s of series) {
    for (const p of s.data) {
      // 어떤 segment 라도 warmup이면 그 month는 warmup으로 본다 (합집합).
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
    // 한 달 간격 (대략 28~31일) 초과면 새 run.
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

export function parseFilterYM(s: string | null): Date | null {
  if (!s) return null;
  const [y, m] = s.split('-').map(Number);
  return new Date(y, m - 1, 1);
}

export function dateToYM(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
