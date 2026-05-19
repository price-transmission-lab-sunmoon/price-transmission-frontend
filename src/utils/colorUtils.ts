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

export const REFERENCE_LINE_COLOR = '#3b82f6';

// fe-panel v3 §3.3 ④ SoT — 8종 차트 색상 전부 이 객체에서 import
export const PANEL_CHART_COLORS = {
  // TransmissionRateChart
  transmissionRateLine: '#1f77b4',
  rollingMeanLine: '#666666',
  q1q3Band: '#aaaaaa',
  detectionMarker: '#e24b4a',

  // ZScoreChart
  zscoreLine: '#9467bd',
  zscoreWarningLine: '#ef9f27',
  zscoreAlertLine: '#e24b4a',

  // ECTChart
  ectLine: '#2ca02c',
  ectZeroLine: '#000000',

  // IRFChart
  irfFullLine: '#000000',
  irfSubperiodLine: '#cccccc',
  irfConfidenceBand: '#1f77b4',
  irfPeakMarker: '#e24b4a',

  // MLMapChart
  mlMapHighlight: '#e24b4a',
  mlMapNormalFill: '#94a3b8',

  // IQRBoxplot
  iqrBoxFill: '#cbd5e1',
  iqrMedianLine: '#475569',
  iqrCurrentMarker: '#e24b4a',

  // AsymmetryHistogram
  asymmetryUpBin: '#f97316',
  asymmetryDownBin: '#06b6d4',

  // BreakpointsChart
  breakpointsLine: '#e24b4a',
} as const;
