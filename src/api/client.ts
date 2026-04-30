import axios from 'axios';
import { parseApiError } from './error';

import commoditiesFixture from '@/fixtures/commodities.json';
import segmentsFixture from '@/fixtures/segments.json';
import eventsFixture from '@/fixtures/events.json';
import freshnessFixture from '@/fixtures/freshness.json';

const useMock = import.meta.env.VITE_USE_MOCK !== 'false';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '';
if (!import.meta.env.VITE_API_BASE_URL) {
  console.error('[client] VITE_API_BASE_URL is not set — falling back to empty baseURL');
}

export const client = axios.create({
  baseURL,
  timeout: 15000,
});

// Mock request interceptor (§8.1)
if (useMock) {
  client.interceptors.request.use((config) => {
    const url = config.url ?? '';

    let data: unknown = null;

    if (url === '/commodities') {
      data = commoditiesFixture;
    } else if (url === '/segments') {
      data = segmentsFixture;
    } else if (url === '/events') {
      data = eventsFixture;
    } else if (url === '/freshness') {
      data = freshnessFixture;
    }

    if (data !== null) {
      return Promise.reject({
        isMockResponse: true,
        data,
        config,
      });
    }

    return config;
  });

  // Return mock data as resolved response
  client.interceptors.response.use(undefined, (error: unknown) => {
    if (
      error !== null &&
      typeof error === 'object' &&
      'isMockResponse' in error &&
      (error as { isMockResponse: boolean }).isMockResponse
    ) {
      return Promise.resolve({ data: (error as unknown as { data: unknown }).data });
    }
    return Promise.reject(error);
  });
}

// Error response interceptor — 원본 axios 에러를 cause로 보존 (exception_design_v2 §2.1)
client.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      error !== null &&
      typeof error === 'object' &&
      'response' in error &&
      (error as { response?: { data?: unknown } }).response?.data
    ) {
      throw parseApiError((error as { response: { data: unknown } }).response.data, error);
    }
    throw parseApiError(null, error);
  },
);
