import type { Granularity } from './literals';

export interface TimeseriesEnvelope {
  commodity_id: string;
  segment_id: string;
  granularity: Granularity;
  requested_from: string;
  requested_to: string;
  actual_from: string;
  actual_to: string;
  total_points: number;
}

export interface StreamPoint {
  period: string;
  upstream_value: number | null;
  downstream_value: number | null;
  transmission_rate: number | null;
}

export interface StreamResponse extends TimeseriesEnvelope {
  points: StreamPoint[];
}

export interface MinimapPoint {
  period: string;
  anomaly_density: number;
}

export interface MinimapResponse {
  commodity_id: string;
  points: MinimapPoint[];
}

export interface RawPricePoint {
  period: string;
  intl_price_krw_idx: number | null;
  import_price_idx: number | null;
  ppi_idx: number | null;
  cpi_idx: number | null;
  wholesale_price_idx: number | null;
}

export interface RawPricesResponse extends TimeseriesEnvelope {
  points: RawPricePoint[];
}
