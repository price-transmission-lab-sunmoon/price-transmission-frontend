import axios from 'axios';
import { parseApiError } from './error';

import commoditiesFixture from '@/fixtures/commodities.json';
import segmentsFixture from '@/fixtures/segments.json';
import eventsFixture from '@/fixtures/events.json';
import freshnessFixture from '@/fixtures/freshness.json';
import anomaliesSummaryFixture from '@/fixtures/anomalies_summary.json';
import pipelineFixture from '@/fixtures/pipeline.json';
import analysisParamsFixture from '@/fixtures/analysis_params.json';

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
  // feat/fe-layout-filter 추가 — /anomalies/summary (쿼리파라미터 포함 가능)
  { test: (u) => u.split('?')[0] === '/anomalies/summary', data: anomaliesSummaryFixture },
  // feat/fe-methodology-tab 추가 — /meta/pipeline, /meta/analysis-params
  { test: (u) => u === '/meta/pipeline', data: pipelineFixture },
  { test: (u) => u === '/meta/analysis-params', data: analysisParamsFixture },
  // 동적 경로(예시) — 후속 feat 브랜치에서 fixture import 후 추가:
  //   { test: (u) => /^\/commodities\/[^/]+\/stream$/.test(u.split('?')[0]), data: streamFixture },
  //   { test: (u) => /^\/commodities\/[^/]+\/stream\/minimap$/.test(u.split('?')[0]), data: streamMinimapFixture },
  //   { test: (u) => /^\/anomalies\/\d+\/detail$/.test(u.split('?')[0]), data: anomalyDetailFixture },
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
