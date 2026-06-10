// API error envelope schema (§6.4)
// BE-4 (2026-05-20): 백엔드가 public_code를 별도 필드로 분리 — 내부 code(예: API-ANO-001) 보존 + 사용자 노출 코드(예: ANOMALY_NOT_FOUND) 분리.

export interface ApiErrorBody {
  code: string;
  public_code?: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  error: ApiErrorBody;
}
