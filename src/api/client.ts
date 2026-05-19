import axios from 'axios';
import { parseApiError } from './error';

import commoditiesFixture from '@/fixtures/commodities.json';
import segmentsFixture from '@/fixtures/segments.json';
import eventsFixture from '@/fixtures/events.json';
import freshnessFixture from '@/fixtures/freshness.json';
import anomaliesSummaryFixture from '@/fixtures/anomalies_summary.json';
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

export const client = axios.create({
  baseURL,
  timeout: 30000, // FE-API-005: 30초 초과 시 타임아웃
});

// ============================================================
// Mock 라우트 매처 — 동적 경로(/commodities/{id}/stream 등) 대응 위한 regex 기반 분기
// frame_spec_vN §8.1 더미 응답 정책. 이 frame은 정적 경로 4종만 처리하고,
// 동적 경로는 후속 feat 브랜치(feat/fe-stream-chart 등)가 자기 fixture와 함께 분기를 추가한다.
//
// 분기 규칙:
//   - 정확 매칭 (정적 경로): url === '/commodities' 등
//   - 정규식 매칭 (동적 경로): url.match(/^\/commodities\/[^/]+\/stream$/) 등
//   - 매칭 안 되면 useMock 모드라도 통과시켜 실제 baseURL로 호출 (frame 단계 한정)
// ============================================================

interface MockRoute {
  test: (url: string) => boolean;
  data: unknown;
}

const MOCK_ROUTES: MockRoute[] = [
  // 정적 경로 — frame이 직접 제공하는 fixture 4종
  { test: (u) => u === '/commodities', data: commoditiesFixture },
  { test: (u) => u === '/segments', data: segmentsFixture },
  { test: (u) => u === '/events', data: eventsFixture },
  { test: (u) => u === '/freshness', data: freshnessFixture },

  // feat/fe-panel — 패널 엔드포인트 fixture (anomaly_id 무관하게 단일 더미 반환)
  { test: (u) => /^\/anomalies\/\d+\/detail$/.test(u.split('?')[0]), data: panelDetailFixture },
  {
    test: (u) => {
      const path = u.split('?')[0];
      const params = new URLSearchParams(u.includes('?') ? u.split('?')[1] : '');
      return /^\/anomalies\/\d+\/stat-series$/.test(path) && params.get('metric') === 'transmission_rate';
    },
    data: panelStatSeriesTransmissionRateFixture,
  },
  {
    test: (u) => {
      const path = u.split('?')[0];
      const params = new URLSearchParams(u.includes('?') ? u.split('?')[1] : '');
      return /^\/anomalies\/\d+\/stat-series$/.test(path) && params.get('metric') === 'zscore';
    },
    data: panelStatSeriesZscoreFixture,
  },
  {
    test: (u) => {
      const path = u.split('?')[0];
      const params = new URLSearchParams(u.includes('?') ? u.split('?')[1] : '');
      return /^\/anomalies\/\d+\/stat-series$/.test(path) && params.get('metric') === 'ect';
    },
    data: panelStatSeriesEctFixture,
  },
  {
    test: (u) => {
      const path = u.split('?')[0];
      const params = new URLSearchParams(u.includes('?') ? u.split('?')[1] : '');
      return /^\/anomalies\/\d+\/stat-series$/.test(path) && params.get('metric') === 'breakpoints';
    },
    data: panelStatSeriesBreakpointsFixture,
  },
  {
    test: (u) => {
      const path = u.split('?')[0];
      const params = new URLSearchParams(u.includes('?') ? u.split('?')[1] : '');
      return /^\/anomalies\/\d+\/stat-snapshot$/.test(path) && params.get('metric') === 'iqr';
    },
    data: panelStatSnapshotIqrFixture,
  },
  {
    test: (u) => {
      const path = u.split('?')[0];
      const params = new URLSearchParams(u.includes('?') ? u.split('?')[1] : '');
      return /^\/anomalies\/\d+\/stat-snapshot$/.test(path) && params.get('metric') === 'asymmetry';
    },
    data: panelStatSnapshotAsymmetryFixture,
  },
  { test: (u) => /^\/anomalies\/\d+\/irf$/.test(u.split('?')[0]), data: panelIrfFixture },
  {
    test: (u) => {
      const path = u.split('?')[0];
      const params = new URLSearchParams(u.includes('?') ? u.split('?')[1] : '');
      return /^\/anomalies\/\d+\/ml-map$/.test(path) && params.get('model') === 'isolation_forest';
    },
    data: panelMlMapIsolationForestFixture,
  },
  {
    test: (u) => {
      const path = u.split('?')[0];
      const params = new URLSearchParams(u.includes('?') ? u.split('?')[1] : '');
      return /^\/anomalies\/\d+\/ml-map$/.test(path) && params.get('model') === 'lof';
    },
    data: panelMlMapLofFixture,
  },
  {
    test: (u) => {
      const path = u.split('?')[0];
      const params = new URLSearchParams(u.includes('?') ? u.split('?')[1] : '');
      return /^\/anomalies\/\d+\/ml-map$/.test(path) && params.get('model') === 'ocsvm';
    },
    data: panelMlMapOcsvmFixture,
  },
];

if (useMock) {
  client.interceptors.request.use((config) => {
    const url = config.url ?? '';
    const route = MOCK_ROUTES.find((r) => r.test(url));

    if (route) {
      return Promise.reject({
        isMockResponse: true,
        data: route.data,
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

// Error response interceptor — IS-9: parseApiError 단일 인자(axiosError 전체) 적용
// API 에러 envelope → ApiError, 네트워크/타임아웃 → FEError('NETWORK_ERROR')
// 원본 axiosError는 각 에러의 context.cause로 보존 (frame_spec_frontend_vN §6.4 · IS-6 패턴)
client.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    throw parseApiError(error);
  },
);
