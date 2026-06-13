import type { SegmentId } from './literals';

// /freshness (데이터 기준 시점)
export interface Freshness {
  data_up_to: string; // YYYY-MM
  next_run_date: string; // YYYY-MM-DD
  last_updated: string; // ISO 8601 UTC
}

// /meta/pipeline (파이프라인 플로우 다이어그램)
export interface PipelineNode {
  id: string;
  label: string;
  description: string;
  phase_number: number; // 7.5 등 소수 가능 (Phase 7-ML)
}

export interface PipelineEdge {
  source: string;
  target: string;
  label?: string; // 분기 라벨 ("공적분 있음/없음" 등)
}

export interface PipelineMetaResponse {
  version: string; // 예: "v8"
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

// /meta/analysis-params (파이프라인 파라미터 기준값, 정적)
export interface AnalysisParams {
  rolling_window: number; // 48
  zscore_warning: number; // 2.0
  zscore_alert: number; // 2.5
  iqr_multiplier: number; // 1.5
  stability_threshold: number; // 0.03
  pattern3_n_values: number[]; // [2, 3, 6]
  min_subperiod_obs: number; // 60
  lag_search_range: [number, number]; // [1, 4]
  chow_test_points: string[]; // YYYY-MM[]
}

export interface PatternDescription {
  pattern_id: 'pattern1' | 'pattern2' | 'pattern3';
  label_kr: string;
  description: string;
  applicable_segments: SegmentId[];
}

export interface AnalysisParamsResponse {
  version: string;
  params: AnalysisParams;
  patterns: PatternDescription[];
}
