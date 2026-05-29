import type { ConfidenceGrade, MlModel, RawPriceSource, SegmentId } from '@/types/literals';

/**
 * Chart color palettes — single source of truth.
 * Light-theme calibrated per docs/re-design_specs/02-chart-palette.md.
 * Mirrors :root CSS vars in src/index.css for cross-layer consistency.
 */

// Anomaly grades — WCAG-safe on warm-white canvas
// @guide:UTIL-03
export const ANOMALY_COLORS: Record<ConfidenceGrade, string> = {
  high: '#dc2626',      // red-600
  medium: '#d97706',    // amber-600
  reference: '#0891b2', // cyan-600 (was lime — failed contrast + clashed with success)
} as const;

export const ANOMALY_BG_COLORS: Record<ConfidenceGrade, string> = {
  high: '#fef2f2',
  medium: '#fffbeb',
  reference: '#ecfeff',
} as const;

export const ANOMALY_BORDER_COLORS: Record<ConfidenceGrade, string> = {
  high: '#fecaca',
  medium: '#fde68a',
  reference: '#a5f3fc',
} as const;

// Node radii (StreamChart rev.6 — feature_spec_fe-stream-chart_vN §4.1)
export const ANOMALY_RADII: Record<ConfidenceGrade, number> = {
  high: 7,
  medium: 5.5,
  reference: 4,
} as const;

// Segment colors — primary commodity (solid lines)
export const SEGMENT_COLORS_PRIMARY: Record<SegmentId, string> = {
  A: '#0d9488',       // teal-600 — brand-aligned
  B: '#059669',       // emerald-600
  C: '#7c3aed',       // violet-600
  D: '#db2777',       // pink-600
  D_prime: '#ea580c', // orange-600
} as const;

// Segment colors — secondary commodity (dashed + lighter)
export const SEGMENT_COLORS_SECONDARY: Record<SegmentId, string> = {
  A: '#5eead4',       // teal-300
  B: '#6ee7b7',       // emerald-300
  C: '#c4b5fd',       // violet-300
  D: '#f9a8d4',       // pink-300
  D_prime: '#fdba74', // orange-300
} as const;

// ML 모델별 색 — MLMapChart 산점도에서 모델 식별용
// PCA 좌표가 3 모델 동일하므로 색으로만 모델 구분.
// 회색→모델 색 그라데이션으로 anomaly_score 진하기도 동시 인코딩.
export const ML_MODEL_COLORS: Record<MlModel, string> = {
  isolation_forest: '#db2777', // pink-600
  lof: '#16a34a',              // green-600
  ocsvm: '#2563eb',            // blue-600
} as const;

// Reference line on StreamChart (y=1 full pass-through baseline)
export const REFERENCE_LINE_COLOR = '#0d9488';

// Raw price sources — fully separated from SEGMENT_COLORS to prevent
// cross-tab color confusion
export const RAW_PRICE_COLORS: Record<RawPriceSource, string> = {
  intl_price_krw: '#7c3aed',   // violet-600
  import_price_usd: '#0891b2', // cyan-600
  ppi: '#059669',              // emerald-600
  wholesale_price: '#ea580c',  // orange-600
  cpi: '#be123c',              // rose-700 (distinct from anomaly.high)
} as const;

/**
 * Panel inline-chart colors — all 8 charts.
 * Zero d3 defaults, zero pure black.
 * Reuses ANOMALY_COLORS.high where the semantic is "abnormal point".
 */
export const PANEL_CHART_COLORS = {
  // TransmissionRateChart
  transmissionRateLine: '#0d9488', // brand teal — primary metric
  rollingMeanLine: '#78736a',      // warm gray
  q1q3Band: '#a8a298',             // warm gray
  detectionMarker: ANOMALY_COLORS.high,

  // ZScoreChart
  zscoreLine: '#a78bfa',           // violet-400
  zscoreWarningLine: ANOMALY_COLORS.medium,
  zscoreAlertLine: ANOMALY_COLORS.high,

  // ECTChart
  ectLine: '#059669',              // emerald-600
  ectZeroLine: '#78736a',          // warm gray (baseline reference)

  // IRFChart
  irfFullLine: '#1a1814',          // warm near-black
  irfSubperiodLine: '#a8a298',     // warm gray
  irfConfidenceBand: '#0d9488',    // brand teal
  irfPeakMarker: ANOMALY_COLORS.high,

  // MLMapChart
  mlMapHighlight: ANOMALY_COLORS.high,
  mlMapNormalFill: '#d4cec1',      // border-strong (warm)

  // IQRBoxplot
  iqrBoxFill: '#ede8de',           // bg-muted
  iqrMedianLine: '#4a463e',        // text-secondary
  iqrCurrentMarker: ANOMALY_COLORS.high,

  // AsymmetryHistogram
  asymmetryUpBin: '#ea580c',       // orange-600
  asymmetryDownBin: '#0891b2',     // cyan-600

  // BreakpointsChart
  breakpointsLine: ANOMALY_COLORS.high,
} as const;
