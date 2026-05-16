import type { ConfidenceGrade, RawPriceSource, SegmentId } from '@/types/literals';

// 이상 노드 색상 (3등급) — feature_spec_fe-stream-chart_vN §4.1 SoT
export const ANOMALY_COLORS: Record<ConfidenceGrade, string> = {
  high: '#e24b4a',
  medium: '#ef9f27',
  reference: '#c8d850',
} as const;

// 이상 노드 반지름 (px) — feature_spec_fe-stream-chart_vN §4.1 SoT
export const ANOMALY_RADII: Record<ConfidenceGrade, number> = {
  high: 7,
  medium: 5.5,
  reference: 4,
} as const;

// 구간별 곡선 색상 — 주 품목 (스트림 차트)
export const SEGMENT_COLORS_PRIMARY: Record<SegmentId, string> = {
  A: '#3b82f6',
  B: '#22c55e',
  D_prime: '#f97316',
  C: '#94a3b8', // PM 별건 #2 미정
  D: '#64748b', // PM 별건 #2 미정
} as const;

// 구간별 곡선 색상 — 보조 품목 (40% opacity 별도 적용)
export const SEGMENT_COLORS_SECONDARY: Record<SegmentId, string> = {
  A: '#06b6d4',
  B: '#a855f7',
  D_prime: '#ec4899',
  C: '#94a3b8',
  D: '#64748b',
} as const;

// 스트림 차트 기준선 색상 — feature_spec_fe-stream-chart_vN §4.1 SoT
export const REFERENCE_LINE_COLOR = '#3b82f6';

// 원시 시계열 소스별 색상 — feature_spec_fe-raw-timeseries_vN §3.3② SoT
export const RAW_PRICE_COLORS: Record<RawPriceSource, string> = {
  intl_price_krw: '#a855f7',
  import_price: '#3b82f6',
  ppi: '#22c55e',
  wholesale_price: '#f97316',
  cpi: '#e24b4a',
} as const;
