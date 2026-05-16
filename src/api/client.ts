import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { parseApiError } from './error';

import commoditiesFixture from '@/fixtures/commodities.json';
import segmentsFixture from '@/fixtures/segments.json';
import eventsFixture from '@/fixtures/events.json';
import freshnessFixture from '@/fixtures/freshness.json';
import rawPricesFixture from '@/fixtures/raw_prices.json';
import rawPricesMinimapFixture from '@/fixtures/raw_prices_minimap.json';
import rawPricesLay4ErrorFixture from '@/fixtures/raw_prices_lay4_error.json';
import rawPricesInvalidLayoutFixture from '@/fixtures/raw_prices_invalid_layout.json';
import streamMinimapFixture from '@/fixtures/stream_minimap.json';

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

// 3구간 품목 (has_wholesale=false) — layout=4 요청 시 WHOLESALE_NOT_AVAILABLE 반환
const THREE_SEG_COMMODITIES = new Set([
  'wheat', 'maize', 'soybean', 'palm_oil', 'sugar', 'coffee', 'beef',
]);

const MOCK_ROUTES: MockRoute[] = [
  // ── 정적 경로 4종 ──────────────────────────────────────────
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

  // ── raw-prices/minimap (raw-prices 보다 먼저 평가) ─────────
  {
    test: (u) => /^\/commodities\/[^/]+\/raw-prices\/minimap$/.test(u),
    handle: () => ({ type: 'success', data: rawPricesMinimapFixture }),
  },

  // ── raw-prices ─────────────────────────────────────────────
  {
    test: (u) => /^\/commodities\/[^/]+\/raw-prices$/.test(u),
    handle: (config) => {
      const layout = Number(config.params?.layout ?? 1);
      const url = config.url ?? '';
      const commodityMatch = url.match(/^\/commodities\/([^/]+)\/raw-prices$/);
      const commodityId = commodityMatch?.[1] ?? '';

      if (!Number.isInteger(layout) || layout < 1 || layout > 6) {
        return { type: 'error', status: 400, data: rawPricesInvalidLayoutFixture };
      }

      if (layout === 4 && THREE_SEG_COMMODITIES.has(commodityId)) {
        return { type: 'error', status: 400, data: rawPricesLay4ErrorFixture };
      }

      return { type: 'success', data: rawPricesFixture };
    },
  },

  // ── stream/minimap (stream 보다 먼저 평가) ──────────────────
  {
    test: (u) => /^\/commodities\/[^/]+\/stream\/minimap$/.test(u),
    handle: () => ({ type: 'success', data: streamMinimapFixture }),
  },
];

// ──────────────────────────────────────────────────────────────
// 내부 Mock 통신 마커 타입
// ──────────────────────────────────────────────────────────────
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
        data: result.data,
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
        const axiosErr = new AxiosError(
          `Request failed with status code ${mock.status}`,
          AxiosError.ERR_BAD_REQUEST,
          mock.config,
          undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { data: mock.data, status: mock.status, statusText: 'Bad Request', headers: {}, config: mock.config } as any,
        );
        return Promise.reject(axiosErr);
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
