// All 18 endpoints from api_spec_v4

export const ENDPOINTS = {
  COMMODITIES_LIST: '/commodities',
  COMMODITY_DETAIL: (id: string) => `/commodities/${id}`,

  SEGMENTS: '/segments',
  EVENTS: '/events',
  FRESHNESS: '/freshness',
  ANOMALIES_SUMMARY: '/anomalies/summary',

  COMMODITY_STREAM: (id: string) => `/commodities/${id}/stream`,
  COMMODITY_STREAM_MINIMAP: (id: string) => `/commodities/${id}/stream/minimap`,
  COMMODITY_SCATTER: (id: string) => `/commodities/${id}/scatter`,
  COMMODITY_RAW_PRICES: (id: string) => `/commodities/${id}/raw-prices`,
  COMMODITY_RAW_PRICES_MINIMAP: (id: string) => `/commodities/${id}/raw-prices/minimap`,

  ANOMALY_DETAIL: (id: number) => `/anomalies/${id}/detail`,
  ANOMALY_STAT_SERIES: (id: number) => `/anomalies/${id}/stat-series`,
  ANOMALY_STAT_SNAPSHOT: (id: number) => `/anomalies/${id}/stat-snapshot`,
  ANOMALY_IRF: (id: number) => `/anomalies/${id}/irf`,
  ANOMALY_ML_MAP: (id: number) => `/anomalies/${id}/ml-map`,

  META_PIPELINE: '/meta/pipeline',
  META_ANALYSIS_PARAMS: '/meta/analysis-params',
} as const;
