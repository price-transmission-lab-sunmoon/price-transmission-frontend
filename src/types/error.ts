// API 에러 응답 envelope. public_code는 사용자 노출용 코드, code는 내부 코드

export interface ApiErrorBody {
  code: string;
  public_code?: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  error: ApiErrorBody;
}
