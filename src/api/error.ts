import type { ApiErrorResponse } from '@/types/error';

export class ApiError extends Error {
  code: string;
  context?: Record<string, unknown>;

  constructor(code: string, message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.context = context;
  }
}

export function parseApiError(data: unknown): ApiError {
  if (
    data !== null &&
    typeof data === 'object' &&
    'error' in data &&
    typeof (data as ApiErrorResponse).error?.code === 'string'
  ) {
    const body = (data as ApiErrorResponse).error;
    return new ApiError(body.code, body.message, body.context);
  }
  return new ApiError('NETWORK_ERROR', 'Network or unknown error');
}
