// Single source of truth for all enum-like string literals
// frame_spec_frontend_vN §6.3

export const CONFIDENCE_GRADES = ['high', 'medium', 'reference'] as const;
export type ConfidenceGrade = (typeof CONFIDENCE_GRADES)[number];

export const PRIMARY_PATTERNS = ['pattern1', 'pattern2', 'pattern3'] as const;
export type PrimaryPattern = (typeof PRIMARY_PATTERNS)[number];

export const CLUSTERS = ['grain', 'oil_sugar', 'tropical', 'livestock', 'independent'] as const;
export type Cluster = (typeof CLUSTERS)[number];

export const ROUTE_TYPES = ['3seg', '4seg'] as const;
export type RouteType = (typeof ROUTE_TYPES)[number];

export const MODEL_TYPES = ['VAR', 'VECM'] as const;
export type ModelType = (typeof MODEL_TYPES)[number];

export const ECT_TYPES = ['ECT', 'log_spread'] as const;
export type EctType = (typeof ECT_TYPES)[number] | null;

export const GRANULARITIES = ['monthly', 'quarterly', 'yearly'] as const;
export type Granularity = (typeof GRANULARITIES)[number];

// 분석 구간 ID — api_spec_vN /commodities response.segments 항목
export const SEGMENT_IDS = ['A', 'B', 'C', 'D', 'D_prime'] as const;
export type SegmentId = (typeof SEGMENT_IDS)[number];

// 뷰 탭 — web_plan_vN §3.3 상단 바 + §8 방법론 탭
export const VIEW_TABS = ['stream', 'scatter', 'raw-prices', 'methodology'] as const;
export type ViewTab = (typeof VIEW_TABS)[number];

// ML 모델 — api_spec_vN /ml-map model 파라미터
export const ML_MODELS = ['isolation_forest', 'lof', 'ocsvm'] as const;
export type MlModel = (typeof ML_MODELS)[number];

// 패널 시계열 metric — api_spec_vN /stat-series metric 파라미터
export const STAT_SERIES_METRICS = ['transmission_rate', 'zscore', 'ect', 'breakpoints'] as const;
export type StatSeriesMetric = (typeof STAT_SERIES_METRICS)[number];

// 패널 비시계열 snapshot metric — api_spec_vN /stat-snapshot metric 파라미터
export const STAT_SNAPSHOT_METRICS = ['iqr', 'asymmetry'] as const;
export type StatSnapshotMetric = (typeof STAT_SNAPSHOT_METRICS)[number];

// 원시 시계열 소스 — api_spec_vN /raw-prices series[].source
export const RAW_PRICE_SOURCES = [
  'intl_price_krw',
  'import_price',
  'ppi',
  'wholesale_price',
  'cpi',
] as const;
export type RawPriceSource = (typeof RAW_PRICE_SOURCES)[number];

// IRF 곡선 범위 — api_spec_vN /irf irfs[].scope
export const IRF_SCOPES = ['full', 'subperiod'] as const;
export type IrfScope = (typeof IRF_SCOPES)[number];

// ML 결과맵 투영 방법 — OI-15 미결, 임시 유니온
export const PROJECTION_METHODS = ['pca', 'feature_direct'] as const;
export type ProjectionMethod = (typeof PROJECTION_METHODS)[number];

// 패턴 1 플래그 종류 — api_spec_vN stat_metrics.pattern1_flag_type
export const PATTERN1_FLAG_TYPES = ['direction_reversal', 'lag_deviation', 'both'] as const;
export type Pattern1FlagType = (typeof PATTERN1_FLAG_TYPES)[number] | null;

// 비대칭 방향 — api_spec_vN stat_metrics.rocket_feather_direction
export const ROCKET_FEATHER_DIRECTIONS = ['upward_stronger', 'downward_stronger', 'symmetric'] as const;
export type RocketFeatherDirection = (typeof ROCKET_FEATHER_DIRECTIONS)[number] | null;
