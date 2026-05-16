import axios, { type InternalAxiosRequestConfig } from 'axios';
import { parseApiError } from './error';

import commoditiesFixture from '@/fixtures/commodities.json';
import segmentsFixture from '@/fixtures/segments.json';
import eventsFixture from '@/fixtures/events.json';
import freshnessFixture from '@/fixtures/freshness.json';
import scatterFixture from '@/fixtures/scatter.json';

const useMock = import.meta.env.VITE_USE_MOCK !== 'false';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '';
if (!import.meta.env.VITE_API_BASE_URL) {
  console.error('[client] VITE_API_BASE_URL is not set — falling back to empty baseURL');
}

export const client = axios.create({
  baseURL,
  timeout: 30000,
});

// ============================================================
// Mock 라우트 시스템 — 정적·동적 경로 + 성공/에러 응답 지원
// frame_spec_vN §8.1 더미 응답 정책
//
// MockResult:
//   { type: 'success', data }          → 200 OK 응답으로 resolve
//   { type: 'error', status, data }    → status 에러로 parseApiError 경유 reject
// ============================================================

type MockResult =
  | { type: 'success'; data: unknown }
  | { type: 'error'; status: number; data: unknown };

interface MockRoute {
  test: (url: string) => boolean;
  handle: (config: InternalAxiosRequestConfig) => MockResult;
}

const MOCK_ROUTES: MockRoute[] = [
  // ── 정적 경로 4종 ───────────────────────────────���──────────
  {
    test: (u) => u === '/commodities',
    handle: () => ({ type: 'success', data: commoditiesFixture }),
  },
  {
    test: (u) => u === '/segments',
    handle: () => ({ type: 'success', data: segmentsFixture }),
  },
  {
    test: (u) => u === '/events',
    handle: () => ({ type: 'success', data: eventsFixture }),
  },
  {
    test: (u) => u === '/freshness',
    handle: () => ({ type: 'success', data: freshnessFixture }),
  },

  // ── scatter (feature_spec_fe-scatter-chart_vN §1.3) ────────
  {
    test: (u) => /^\/commodities\/[^/]+\/scatter$/.test(u),
    handle: () => ({ type: 'success', data: scatterFixture }),
  },
];

// ────────────────────────────────���────────────────────────────���
// 내부 Mock 통신 마커 타입
// ───────────────────────────────────────────────────────────��──
interface MockInternal {
  isMockResponse: true;
  isMockError: boolean;
  data: unknown;
  status?: number;
  config: InternalAxiosRequestConfig;
}

if (useMock) {
  // 요청 인터셉터: 매칭 라우트가 있으면 실제 HTTP 요청 차단
  client.interceptors.request.use((config) => {
    const url = config.url ?? '';
    const route = MOCK_ROUTES.find((r) => r.test(url));

    if (route) {
      const result = route.handle(config);
      return Promise.reject({
        isMockResponse: true,
        isMockError: result.type === 'error',
        data: result.type === 'success' ? result.data : result.data,
        status: result.type === 'error' ? result.status : undefined,
        config,
      } satisfies MockInternal);
    }

    return config;
  });

  // 응답 에러 인터셉터: Mock 성공/에러를 각각 처리
  client.interceptors.response.use(undefined, (error: unknown) => {
    if (
      error !== null &&
      typeof error === 'object' &&
      'isMockResponse' in error &&
      (error as MockInternal).isMockResponse
    ) {
      const mock = error as MockInternal;

      if (mock.isMockError && mock.status !== undefined) {
        // Mock 에러 → AxiosError 형태로 변환 → 하위 parseApiError 인터셉터로 전달
        const axiosLike = Object.assign(
          new Error(`Request failed with status code ${mock.status}`),
          {
            isAxiosError: true,
            response: { status: mock.status, data: mock.data },
            config: mock.config,
          },
        );
        return Promise.reject(axiosLike);
      }

      // Mock 성공 → 정상 응답으로 resolve
      return Promise.resolve({ data: mock.data });
    }

    return Promise.reject(error);
  });
}

// Error response interceptor — parseApiError 단일 경로
client.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    throw parseApiError(error);
  },
);
