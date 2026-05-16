import type { ConfidenceGrade, RawPriceSource, SegmentId } from '@/types/literals';

export const ANOMALY_COLORS: Record<ConfidenceGrade, string> = {
  high: '#e24b4a',
  medium: '#ef9f27',
  reference: '#c8d850',
};

export const ANOMALY_RADII: Record<ConfidenceGrade, number> = {
  high: 7,
  medium: 5.5,
  reference: 4,
};

export const SEGMENT_COLORS_PRIMARY: Record<SegmentId, string> = {
  A: '#3b82f6',
  B: '#22c55e',
  D_prime: '#f97316',
  C: '#94a3b8',
  D: '#64748b',
};

export const SEGMENT_COLORS_SECONDARY: Record<SegmentId, string> = {
  A: '#06b6d4',
  B: '#a855f7',
  D_prime: '#ec4899',
  C: '#94a3b8',
  D: '#64748b',
};

export const RAW_PRICE_COLORS: Record<RawPriceSource, string> = {
  intl_price_krw: '#a855f7',
  import_price: '#3b82f6',
  ppi: '#22c55e',
  wholesale_price: '#f97316',
  cpi: '#e24b4a',
};
