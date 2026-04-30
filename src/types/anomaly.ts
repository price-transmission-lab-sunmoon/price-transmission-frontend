import type { ConfidenceGrade, PrimaryPattern, EctType } from './literals';

export interface AnomalySummaryItem {
  anomaly_id: number;
  commodity_id: string;
  commodity_name_kr: string;
  segment_id: string;
  period: string;
  confidence_grade: ConfidenceGrade;
  primary_pattern: PrimaryPattern;
  is_new: boolean;
}

export interface AnomalySummaryResponse {
  reference_month: string;
  total_count: number;
  prev_month_count: number;
  count_diff: number;
  anomalies: AnomalySummaryItem[];
}

export interface AnomalyDetail {
  anomaly_id: number;
  commodity_id: string;
  segment_id: string;
  period: string;
  confidence_grade: ConfidenceGrade;
  primary_pattern: PrimaryPattern;
  pattern_types: PrimaryPattern[];
  transmission_rate: number | null;
  ect_type: EctType;
  is_new: boolean;
}

export interface StatSeriesPoint {
  period: string;
  stat_value: number | null;
  threshold_upper: number | null;
  threshold_lower: number | null;
}

export interface StatSeriesResponse {
  anomaly_id: number;
  segment_id: string;
  points: StatSeriesPoint[];
}

export interface StatSnapshot {
  anomaly_id: number;
  segment_id: string;
  period: string;
  transmission_rate: number | null;
  normal_transmission_rate: number | null;
  transmission_lag: number | null;
  normal_transmission_lag: number | null;
}

export interface IrfPoint {
  horizon: number;
  irf_value: number;
  ci_lower: number;
  ci_upper: number;
}

export interface IrfResponse {
  anomaly_id: number;
  segment_id: string;
  points: IrfPoint[];
}

export interface MlProjection {
  commodity_id: string;
  period: string;
  x: number;
  y: number;
  is_anomaly: boolean;
  confidence_grade: ConfidenceGrade | null;
  // OI-15: projection_method 확정 전 임시 선언
  projection_method: 'pca' | 'feature_direct';
}

export interface MlMapResponse {
  anomaly_id: number;
  ml_projections: MlProjection[];
}
