import type { SegmentId } from '@/types/literals';

// 구간별 색상 팔레트 — frame_spec_frontend_vN §4.1 기준
// feat/fe-stream-chart §3.3 ①과 동일한 팔레트 (SoT)
export const SEGMENT_COLORS: Record<SegmentId, string> = {
  A: '#60a5fa',
  B: '#34d399',
  C: '#a78bfa',
  D: '#f472b6',
  D_prime: '#fb923c',
};

export function getSegmentColor(segmentId: SegmentId): string {
  return SEGMENT_COLORS[segmentId];
}
