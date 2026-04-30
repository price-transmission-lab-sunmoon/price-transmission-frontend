// API error envelope schema (§6.4)

export interface ApiErrorBody {
  code: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  error: ApiErrorBody;
}
