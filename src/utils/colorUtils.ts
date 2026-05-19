// 색상 상수 SoT — feat/fe-stream-chart §4.1 정의
// 후속 feat(fe-scatter, fe-raw-timeseries, fe-panel, fe-methodology)는 이 상수만 import하고
// 색상 리터럴 직접 사용 금지.

// 이상 노드 색상 (3등급)
export const ANOMALY_COLORS = {
  high: '#e24b4a',
  medium: '#ef9f27',
  reference: '#c8d850',
} as const;

// 이상 노드 반지름 (3등급, px)
export const ANOMALY_RADII = {
  high: 7,
  medium: 5.5,
  reference: 4,
} as const;

// 구간별 곡선 색상 — 주 품목 (스트림 차트)
export const SEGMENT_COLORS_PRIMARY = {
  A: '#3b82f6',
  B: '#22c55e',
  D_prime: '#f97316',
  C: '#94a3b8', // PM 별건 #2 미정
  D: '#64748b', // PM 별건 #2 미정
} as const;

// 구간별 곡선 색상 — 보조 품목 (40% opacity 별도 적용)
export const SEGMENT_COLORS_SECONDARY = {
  A: '#06b6d4',
  B: '#a855f7',
  D_prime: '#ec4899',
  C: '#94a3b8',
  D: '#64748b',
} as const;

// 기준선 (산점도용)
export const REFERENCE_LINE_COLOR = '#3b82f6';
