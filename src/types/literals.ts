// enum-like 문자열 리터럴의 단일 출처

export const CONFIDENCE_GRADES = ['high', 'medium', 'reference'] as const;
export type ConfidenceGrade = (typeof CONFIDENCE_GRADES)[number];

export const PRIMARY_PATTERNS = ['pattern1', 'pattern2', 'pattern3'] as const;
export type PrimaryPattern = (typeof PRIMARY_PATTERNS)[number];

export const CLUSTERS = ['grain', 'oil_sugar', 'tropical', 'livestock', 'independent'] as const;
export type Cluster = (typeof CLUSTERS)[number];

export const ROUTE_TYPES = ['3seg', '4seg'] as const;
export type RouteType = (typeof ROUTE_TYPES)[number];

// asymmetry model_type에 TECM, asymmetric_VAR 포함
export const MODEL_TYPES = ['VAR', 'VECM', 'TECM', 'asymmetric_VAR'] as const;
export type ModelType = (typeof MODEL_TYPES)[number];

export const ECT_TYPES = ['ECT', 'log_spread'] as const;
export type EctType = (typeof ECT_TYPES)[number] | null;

export const GRANULARITIES = ['monthly', 'quarterly', 'yearly'] as const;
export type Granularity = (typeof GRANULARITIES)[number];

// 분석 구간 ID
export const SEGMENT_IDS = ['A', 'B', 'C', 'D', 'D_prime'] as const;
export type SegmentId = (typeof SEGMENT_IDS)[number];

// 뷰 탭
export const VIEW_TABS = ['stream', 'scatter', 'raw-prices', 'methodology', 'journey'] as const;
export type ViewTab = (typeof VIEW_TABS)[number];

// 기간 프리셋 6종 (3개월, 6개월, 1년, 3년, 5년, 전체)
export const PERIOD_PRESETS = ['3m', '6m', '1y', '3y', '5y', 'all'] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

// ML 모델
export const ML_MODELS = ['isolation_forest', 'lof', 'ocsvm'] as const;
export type MlModel = (typeof ML_MODELS)[number];

// 패널 시계열 metric
export const STAT_SERIES_METRICS = ['transmission_rate', 'zscore', 'ect', 'breakpoints'] as const;
export type StatSeriesMetric = (typeof STAT_SERIES_METRICS)[number];

// 패널 비시계열 snapshot metric
export const STAT_SNAPSHOT_METRICS = ['iqr', 'asymmetry'] as const;
export type StatSnapshotMetric = (typeof STAT_SNAPSHOT_METRICS)[number];

// 원시 시계열 소스. 백엔드 응답 키와 1:1 매칭
export const RAW_PRICE_SOURCES = [
  'intl_price_krw',
  'import_price_usd',
  'ppi',
  'wholesale_price',
  'cpi',
] as const;
export type RawPriceSource = (typeof RAW_PRICE_SOURCES)[number];

// IRF 곡선 범위
export const IRF_SCOPES = ['full', 'subperiod'] as const;
export type IrfScope = (typeof IRF_SCOPES)[number];

// ML 결과맵 투영 방법
export const PROJECTION_METHODS = ['pca', 'feature_direct'] as const;
export type ProjectionMethod = (typeof PROJECTION_METHODS)[number];

// 패턴 1 플래그 종류
export const PATTERN1_FLAG_TYPES = ['direction_reversal', 'lag_deviation', 'both'] as const;
export type Pattern1FlagType = (typeof PATTERN1_FLAG_TYPES)[number] | null;

// 비대칭 방향. 'symmetric'은 프론트 내부 전용 값(asymmetry_significant=false 시 사용), 백엔드 응답에는 없음
export const ROCKET_FEATHER_DIRECTIONS = [
  'upward_stronger',
  'downward_stronger',
  'symmetric',
] as const;
export type RocketFeatherDirection = (typeof ROCKET_FEATHER_DIRECTIONS)[number] | null;
