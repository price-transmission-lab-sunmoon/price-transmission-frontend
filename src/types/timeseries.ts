import type {
  ConfidenceGrade,
  Granularity,
  PrimaryPattern,
  RawPriceSource,
  SegmentId,
} from './literals';

// 시계열 공통 envelope — api_spec_vN §시계열 공통 envelope
// @guide:TYPE-02
export interface TimeseriesEnvelope {
  commodity_id: string;
  requested_from: string; // YYYY-MM
  requested_to: string;
  actual_from: string;
  actual_to: string;
  granularity: Granularity;
  total_points: number;
}

// ============================================================
// /commodities/{id}/stream — 스트림 그래프
// ============================================================

export interface StreamDataPoint {
  period: string; // YYYY-MM (granularity=yearly 시 YYYY)
  transmission_rate: number | null;
  upstream_pct: number;
  downstream_pct: number;
  in_warmup_period: boolean;
  has_anomaly: boolean;
  anomaly_ids: number[];
}

export interface StreamSeriesItem {
  segment_id: SegmentId;
  data: StreamDataPoint[];
}

// 스트림 차트용 이상 노드 — granularity 무관, 항상 원본 월 단위
export interface StreamAnomalyNode {
  anomaly_id: number;
  segment_id: SegmentId;
  period: string; // YYYY-MM
  primary_pattern: PrimaryPattern;
  pattern_types: PrimaryPattern[];
  confidence_grade: ConfidenceGrade;
  transmission_rate: number;
  is_new: boolean;
}

export interface StreamResponse extends TimeseriesEnvelope {
  series: StreamSeriesItem[];
  anomaly_nodes: StreamAnomalyNode[];
}

// ============================================================
// /commodities/{id}/stream/minimap — 미니맵
// ============================================================

export interface AnomalyDensityItem {
  period: string; // YYYY (yearly)
  high_count: number;
  medium_count: number;
  reference_count: number;
}

export interface StreamMinimapResponse extends TimeseriesEnvelope {
  // granularity 항상 'yearly' 고정
  series: StreamSeriesItem[];
  anomaly_density: AnomalyDensityItem[];
}

// ============================================================
// /commodities/{id}/scatter — 전달 구조 산점도
// ============================================================

export interface ScatterBaseline {
  transmission_elasticity: number;
  normal_transmission_lag: number;
}

export interface ScatterPoint {
  period: string; // YYYY-MM
  upstream_pct: number;
  downstream_pct: number;
  is_anomaly: boolean;
  anomaly_id: number | null;
  confidence_grade: ConfidenceGrade | null;
  primary_pattern: PrimaryPattern | null;
}

export interface ScatterResponse extends TimeseriesEnvelope {
  segment_id: SegmentId;
  upstream_label: string;
  downstream_label: string;
  until: string | null; // 슬라이더 재생 상한
  baseline: ScatterBaseline;
  points: ScatterPoint[];
}

// ============================================================
// /commodities/{id}/raw-prices — 원시 시계열
// ============================================================

export interface RawPriceDataPoint {
  period: string; // YYYY-MM
  value: number | null;
  index_2020: number | null; // 2020=100 기준 지수
  has_anomaly: boolean;
  anomaly_ids: number[];
}

export interface RawPriceSeriesItem {
  source: RawPriceSource;
  label_kr: string;
  color_hint: string;
  data: RawPriceDataPoint[];
}

export interface RawPriceTransmissionDataPoint {
  period: string;
  transmission_rate: number | null;
  has_anomaly: boolean;
  anomaly_ids: number[];
}

export interface RawPriceTransmissionOverlayItem {
  segment_id: SegmentId;
  data: RawPriceTransmissionDataPoint[];
}

// raw-prices anomaly_node — stream과 일부 필드 동일하나 transmission_rate·pattern_types 미포함
export interface RawPriceAnomalyNode {
  anomaly_id: number;
  segment_id: SegmentId;
  period: string;
  confidence_grade: ConfidenceGrade;
  primary_pattern: PrimaryPattern;
  is_new: boolean;
}

export interface RawPricesResponse extends TimeseriesEnvelope {
  layout: number; // 1~6
  series: RawPriceSeriesItem[];
  transmission_overlay: RawPriceTransmissionOverlayItem[]; // 레이아웃 1은 빈 배열
  anomaly_nodes: RawPriceAnomalyNode[];
}

// ============================================================
// /commodities/{id}/raw-prices/minimap — 원시 시계열 미니맵
// ============================================================

export interface RawPricesMinimapResponse extends TimeseriesEnvelope {
  // granularity 항상 'yearly'
  layout: number;
  series: RawPriceSeriesItem[];
  anomaly_density: AnomalyDensityItem[];
}
