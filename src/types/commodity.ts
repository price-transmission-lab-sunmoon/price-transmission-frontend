import type { Cluster, RouteType, ConfidenceGrade, ModelType } from './literals';

// @guide:TYPE-04
export interface Commodity {
  commodity_id: string;
  name_kr: string;
  name_en: string;
  cluster: Cluster;
  has_wholesale: boolean;
  route_type: RouteType;
  segments: string[];
  analysis_start: string;
  analysis_end: string;
  has_anomaly_this_month: boolean;
  latest_anomaly_grade: ConfidenceGrade | null;
}

export interface CommoditiesResponse {
  commodities: Commodity[];
}

export interface SegmentMeta {
  model_type: ModelType;
  cointegrated: boolean;
  normal_transmission_lag: number;
  transmission_elasticity: number | null;
  upstream_label: string;
  downstream_label: string;
  warmup_end: string;
}

export interface CommodityDetail extends Commodity {
  segment_meta: Record<string, SegmentMeta>;
}

export interface Segment {
  segment_id: string;
  label_kr: string;
  upstream_label: string;
  downstream_label: string;
  applies_to: string;
  pattern1: boolean;
  pattern2: boolean;
  pattern3: boolean;
  ml_applied: boolean;
}

export interface SegmentsResponse {
  segments: Segment[];
}
