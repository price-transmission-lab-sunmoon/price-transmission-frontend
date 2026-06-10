import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { parseApiError } from './error';

import commoditiesFixture from '@/fixtures/commodities.json';
import segmentsFixture from '@/fixtures/segments.json';
import eventsFixture from '@/fixtures/events.json';
import freshnessFixture from '@/fixtures/freshness.json';
import scatterFixture from '@/fixtures/scatter.json';
import rawPricesFixture from '@/fixtures/raw_prices.json';
import rawPricesMinimapFixture from '@/fixtures/raw_prices_minimap.json';
import rawPricesLay4ErrorFixture from '@/fixtures/raw_prices_lay4_error.json';
import rawPricesInvalidLayoutFixture from '@/fixtures/raw_prices_invalid_layout.json';
import streamMinimapFixture from '@/fixtures/stream_minimap.json';
import anomaliesSummaryFixture from '@/fixtures/anomalies_summary.json';
import streamFixture from '@/fixtures/stream.json';
import pipelineFixture from '@/fixtures/pipeline.json';
import analysisParamsFixture from '@/fixtures/analysis_params.json';

// feat/fe-panel fixtures
import panelDetailFixture from '@/fixtures/panel_detail.json';
import panelStatSeriesTransmissionRateFixture from '@/fixtures/panel_stat_series_transmission_rate.json';
import panelStatSeriesZscoreFixture from '@/fixtures/panel_stat_series_zscore.json';
import panelStatSeriesEctFixture from '@/fixtures/panel_stat_series_ect.json';
import panelStatSeriesBreakpointsFixture from '@/fixtures/panel_stat_series_breakpoints.json';
import panelStatSnapshotIqrFixture from '@/fixtures/panel_stat_snapshot_iqr.json';
import panelStatSnapshotAsymmetryFixture from '@/fixtures/panel_stat_snapshot_asymmetry.json';
import panelIrfFixture from '@/fixtures/panel_irf.json';
import panelMlMapIsolationForestFixture from '@/fixtures/panel_ml_map_isolation_forest.json';
import panelMlMapLofFixture from '@/fixtures/panel_ml_map_lof.json';
import panelMlMapOcsvmFixture from '@/fixtures/panel_ml_map_ocsvm.json';

const useMock = import.meta.env.VITE_USE_MOCK !== 'false';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '';
if (!import.meta.env.VITE_API_BASE_URL) {
  console.error('[client] VITE_API_BASE_URL is not set — falling back to empty baseURL');
}

// @guide:API-02
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
  'wheat', 'maize', 'soybean', 'palmoil', 'sugar', 'coffee', 'beef',
]);

// @guide:API-03
const MOCK_ROUTES: MockRoute[] = [
  // ── 정적 경로 ─────────────────────────────────────────────────
  { test: (u) => u === '/commodities', handle: () => ({ type: 'success', data: commoditiesFixture }) },
  { test: (u) => u === '/segments', handle: () => ({ type: 'success', data: segmentsFixture }) },
  { test: (u) => u === '/events', handle: () => ({ type: 'success', data: eventsFixture }) },
  { test: (u) => u === '/freshness', handle: () => ({ type: 'success', data: freshnessFixture }) },
  { test: (u) => u.split('?')[0] === '/anomalies/summary', handle: () => ({ type: 'success', data: anomaliesSummaryFixture }) },
  { test: (u) => u === '/meta/pipeline', handle: () => ({ type: 'success', data: pipelineFixture }) },
  { test: (u) => u === '/meta/analysis-params', handle: () => ({ type: 'success', data: analysisParamsFixture }) },

  // ── 동적 경로 — 시계열 ────────────────────────────────────────
  { test: (u) => /^\/commodities\/[^/]+\/stream$/.test(u.split('?')[0]), handle: () => ({ type: 'success', data: streamFixture }) },
  { test: (u) => /^\/commodities\/[^/]+\/stream\/minimap$/.test(u.split('?')[0]), handle: () => ({ type: 'success', data: streamMinimapFixture }) },
  { test: (u) => /^\/commodities\/[^/]+\/scatter$/.test(u.split('?')[0]), handle: () => ({ type: 'success', data: scatterFixture }) },
  {
    test: (u) => /^\/commodities\/[^/]+\/raw-prices$/.test(u.split('?')[0]),
    handle: (config) => {
      const url = config.url ?? '';
      const params = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
      const layout = Number(params.get('layout') ?? 1);
      const match = url.match(/^\/commodities\/([^/?]+)\/raw-prices/);
      const commodityId = match?.[1] ?? '';
      if (layout === 4 && THREE_SEG_COMMODITIES.has(commodityId)) {
        return { type: 'error', status: 422, data: rawPricesLay4ErrorFixture };
      }
      if (layout < 1 || layout > 6) {
        return { type: 'error', status: 400, data: rawPricesInvalidLayoutFixture };
      }
      return { type: 'success', data: rawPricesFixture };
    },
  },
  { test: (u) => /^\/commodities\/[^/]+\/raw-prices\/minimap$/.test(u.split('?')[0]), handle: () => ({ type: 'success', data: rawPricesMinimapFixture }) },

  // ── feat/fe-panel — 패널 엔드포인트 ──────────────────────────
  { test: (u) => /^\/anomalies\/\d+\/detail$/.test(u.split('?')[0]), handle: () => ({ type: 'success', data: panelDetailFixture }) },
  {
    test: (u) => {
      const path = u.split('?')[0];
      const params = new URLSearchParams(u.includes('?') ? u.split('?')[1] : '');
      return /^\/anomalies\/\d+\/stat-series$/.test(path) && params.get('metric') === 'transmission_rate';
    },
    handle: () => ({ type: 'success', data: panelStatSeriesTransmissionRateFixture }),
  },
  {
    test: (u) => {
      const path = u.split('?')[0];
      const params = new URLSearchParams(u.includes('?') ? u.split('?')[1] : '');
      return /^\/anomalies\/\d+\/stat-series$/.test(path) && params.get('metric') === 'zscore';
    },
    handle: () => ({ type: 'success', data: panelStatSeriesZscoreFixture }),
  },
  {
    test: (u) => {
      const path = u.split('?')[0];
      const params = new URLSearchParams(u.includes('?') ? u.split('?')[1] : '');
      return /^\/anomalies\/\d+\/stat-series$/.test(path) && params.get('metric') === 'ect';
    },
    handle: () => ({ type: 'success', data: panelStatSeriesEctFixture }),
  },
  {
    test: (u) => {
      const path = u.split('?')[0];
      const params = new URLSearchParams(u.includes('?') ? u.split('?')[1] : '');
      return /^\/anomalies\/\d+\/stat-series$/.test(path) && params.get('metric') === 'breakpoints';
    },
    handle: () => ({ type: 'success', data: panelStatSeriesBreakpointsFixture }),
  },
  {
    test: (u) => {
      const path = u.split('?')[0];
      const params = new URLSearchParams(u.includes('?') ? u.split('?')[1] : '');
      return /^\/anomalies\/\d+\/stat-snapshot$/.test(path) && params.get('metric') === 'iqr';
    },
    handle: () => ({ type: 'success', data: panelStatSnapshotIqrFixture }),
  },
  {
    test: (u) => {
      const path = u.split('?')[0];
      const params = new URLSearchParams(u.includes('?') ? u.split('?')[1] : '');
      return /^\/anomalies\/\d+\/stat-snapshot$/.test(path) && params.get('metric') === 'asymmetry';
    },
    handle: () => ({ type: 'success', data: panelStatSnapshotAsymmetryFixture }),
  },
  { test: (u) => /^\/anomalies\/\d+\/irf$/.test(u.split('?')[0]), handle: () => ({ type: 'success', data: panelIrfFixture }) },
  {
    test: (u) => {
      const path = u.split('?')[0];
      const params = new URLSearchParams(u.includes('?') ? u.split('?')[1] : '');
      return /^\/anomalies\/\d+\/ml-map$/.test(path) && params.get('model') === 'isolation_forest';
    },
    handle: () => ({ type: 'success', data: panelMlMapIsolationForestFixture }),
  },
  {
    test: (u) => {
      const path = u.split('?')[0];
      const params = new URLSearchParams(u.includes('?') ? u.split('?')[1] : '');
      return /^\/anomalies\/\d+\/ml-map$/.test(path) && params.get('model') === 'lof';
    },
    handle: () => ({ type: 'success', data: panelMlMapLofFixture }),
  },
  {
    test: (u) => {
      const path = u.split('?')[0];
      const params = new URLSearchParams(u.includes('?') ? u.split('?')[1] : '');
      return /^\/anomalies\/\d+\/ml-map$/.test(path) && params.get('model') === 'ocsvm';
    },
    handle: () => ({ type: 'success', data: panelMlMapOcsvmFixture }),
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
// @guide:API-04
client.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    throw parseApiError(error);
  },
);
