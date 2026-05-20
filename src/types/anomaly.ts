import type {
  ConfidenceGrade,
  EctType,
  Granularity,
  IrfScope,
  MlModel,
  ModelType,
  Pattern1FlagType,
  PrimaryPattern,
  ProjectionMethod,
  RocketFeatherDirection,
  SegmentId,
  StatSeriesMetric,
  StatSnapshotMetric,
} from './literals';

// ============================================================
// /anomalies/summary — 이달 이상 요약 배너 (web_plan_vN §3.2)
// ============================================================

export interface AnomalySummaryItem {
  anomaly_id: number;
  commodity_id: string;
  commodity_name_kr: string;
  segment_id: SegmentId;
  period: string; // YYYY-MM
  primary_pattern: PrimaryPattern;
  confidence_grade: ConfidenceGrade;
  is_new: boolean;
  transmission_rate: number;
}

export interface AnomalySummaryResponse {
  reference_month: string; // YYYY-MM
  total_count: number;
  prev_month_count: number;
  count_diff: number;
  anomalies: AnomalySummaryItem[];
}

// ============================================================
// /anomalies/{id}/detail — 패널 통합 응답 (web_plan_vN §6)
// ============================================================

// stat_metrics — 30개 필드 (구간별 적용 차이는 api_spec_vN §패널 §`stat_metrics` 적용 구간 참조)
export interface StatMetrics {
  // 패턴 2 — A·B 구간
  transmission_rate: number | null;
  rolling_mean: number | null;
  zscore: number | null;
  zscore_warning: boolean;
  zscore_alert: boolean;
  zscore_threshold_warning: number; // 상수 2.0
  zscore_threshold_alert: number; // 상수 2.5
  q1: number | null;
  q3: number | null;
  iqr_lower: number | null;
  iqr_upper: number | null;
  iqr_outlier: boolean;
  over_transmission: boolean;
  under_transmission: boolean;

  // 패턴 1 — 전 구간
  normal_lag: number | null;
  actual_lag: number | null;
  direction_reversal: boolean;
  lag_deviation: boolean;
  pattern1_flag_type: Pattern1FlagType;

  // ECT — 전 구간
  ect_or_spread: number | null;
  ect_type: EctType;

  // 패턴 3 — B 구간
  spread_n3: number | null;

  // TECM 비대칭 — A·B
  alpha_plus: number | null;
  alpha_minus: number | null;
  wald_pvalue: number | null;
  asymmetry_significant: boolean;
  rocket_feather_direction: RocketFeatherDirection;

  // 모형 유형 — 전 구간
  model_type: ModelType;
  cointegrated: boolean;

  // 구조 변화 — 전 구간
  subperiod_index: number | null;
  bp_dates: string[]; // YYYY-MM[]
}

// ml_summary — 11개 필드
// BE-5 (2026-05-20): 백엔드 응답상 percentile은 null 가능 (warmup/데이터 결손 케이스).
// score도 데이터 결손 시 null 반환 가능. UI는 formatNum/null 가드 처리.
export interface MlSummary {
  ml_vote: number; // 0~3
  ml_detected: boolean;
  if_anomaly: boolean;
  if_score: number | null;
  if_percentile: number | null;
  lof_anomaly: boolean;
  lof_score: number | null;
  lof_percentile: number | null;
  svm_anomaly: boolean;
  svm_score: number | null;
  svm_percentile: number | null;
}

// judgment_path — 패턴별 6 step
export interface JudgmentPathStep {
  step: number;
  label: string;
  value: string;
  passed: boolean;
}

export interface AnomalyDetail {
  anomaly_id: number;
  commodity_id: string;
  commodity_name_kr: string;
  segment_id: SegmentId;
  segment_label_kr: string;
  period: string; // YYYY-MM
  primary_pattern: PrimaryPattern;
  pattern_types: PrimaryPattern[];
  confidence_grade: ConfidenceGrade;
  is_new: boolean;
  stat_metrics: StatMetrics;
  ml_summary: MlSummary;
  judgment_path: JudgmentPathStep[];
}

// ============================================================
// /anomalies/{id}/stat-series — 지표별 인라인 시계열
// ============================================================

interface StatSeriesEnvelope {
  anomaly_id: number;
  commodity_id: string;
  segment_id: SegmentId;
  metric: StatSeriesMetric;
  highlight_period: string; // YYYY-MM
  requested_from: string;
  requested_to: string;
  actual_from: string;
  actual_to: string;
  granularity: Granularity;
  total_points: number;
}

// metric=transmission_rate 또는 breakpoints (동일 구조 + bp_dates 추가)
export interface TransmissionRateDataPoint {
  period: string;
  transmission_rate: number | null;
  rolling_mean: number | null;
  q1: number | null;
  q3: number | null;
  in_warmup_period: boolean;
  is_breakpoint: boolean;
}

export interface StatSeriesTransmissionRateResponse extends StatSeriesEnvelope {
  metric: 'transmission_rate';
  data: TransmissionRateDataPoint[];
}

export interface StatSeriesBreakpointsResponse extends StatSeriesEnvelope {
  metric: 'breakpoints';
  data: TransmissionRateDataPoint[];
  bp_dates: string[]; // YYYY-MM[]
}

// metric=zscore
export interface ZscoreDataPoint {
  period: string;
  zscore: number | null;
  in_warmup_period: boolean;
}

export interface StatSeriesZscoreResponse extends StatSeriesEnvelope {
  metric: 'zscore';
  data: ZscoreDataPoint[];
}

// metric=ect
export interface EctDataPoint {
  period: string;
  ect_or_spread: number | null;
  ect_type: EctType;
}

export interface StatSeriesEctResponse extends StatSeriesEnvelope {
  metric: 'ect';
  data: EctDataPoint[];
}

export type StatSeriesResponse =
  | StatSeriesTransmissionRateResponse
  | StatSeriesBreakpointsResponse
  | StatSeriesZscoreResponse
  | StatSeriesEctResponse;

// ============================================================
// /anomalies/{id}/stat-snapshot — 비시계열 스냅샷
// ============================================================

export interface StatSnapshotIqrResponse {
  anomaly_id: number;
  metric: 'iqr';
  period: string; // YYYY-MM
  q1: number;
  median: number;
  q3: number;
  iqr_lower: number;
  iqr_upper: number;
  current_value: number;
  window_months: number; // 보통 48
}

export interface StatSnapshotAsymmetryResponse {
  anomaly_id: number;
  metric: 'asymmetry';
  model_type: ModelType | 'TECM'; // api_spec 응답 예시는 "TECM"
  up_samples: number[];
  down_samples: number[];
  alpha_plus: number;
  alpha_minus: number;
  wald_pvalue: number;
  asymmetry_significant: boolean;
}

export type StatSnapshotResponse = StatSnapshotIqrResponse | StatSnapshotAsymmetryResponse;

// metric → 응답 타입 매핑 (호출 측 타입 안내용)
export type StatSnapshotResponseFor<M extends StatSnapshotMetric> = M extends 'iqr'
  ? StatSnapshotIqrResponse
  : M extends 'asymmetry'
    ? StatSnapshotAsymmetryResponse
    : never;

// ============================================================
// /anomalies/{id}/irf — IRF 차트
// ============================================================

export interface IrfDataPoint {
  horizon: number;
  irf_downstream: number;
  irf_lower_ci: number;
  irf_upper_ci: number;
}

export interface IrfCurve {
  scope: IrfScope;
  label: string;
  estimation_start: string; // YYYY-MM
  estimation_end: string;
  peak_horizon: number;
  peak_magnitude: number;
  data: IrfDataPoint[];
  // scope='subperiod'일 때만 존재
  subperiod_index?: number;
}

export interface IrfResponse {
  commodity_id: string;
  segment_id: SegmentId;
  irfs: IrfCurve[];
}

// ============================================================
// /anomalies/{id}/ml-map — ML 결과맵 2D 투영
// ============================================================

export interface MlMapPoint {
  period: string;
  x_value: number;
  y_value: number;
  anomaly_score: number;
  is_anomaly: boolean;
  is_highlight: boolean;
}

export interface MlMapResponse {
  anomaly_id: number;
  commodity_id: string;
  segment_id: SegmentId;
  model: MlModel;
  projection_method: ProjectionMethod;
  x_label: string;
  y_label: string;
  total_points: number;
  points: MlMapPoint[];
}
