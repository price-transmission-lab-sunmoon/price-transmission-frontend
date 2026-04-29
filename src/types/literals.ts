// Single source of truth for all enum-like string literals (§6.3)

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
